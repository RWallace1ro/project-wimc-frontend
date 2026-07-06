/**
 * WIMC Firebase Cloud Functions
 *
 * anthropicProxy            — Secure server-side proxy for Anthropic API calls.
 * cloudinarySign            — Generates a signed upload signature for Cloudinary.
 * deleteCloudinaryAsset     — Signed delete of a Cloudinary asset.
 * createCheckoutSession     — Starts a Stripe Checkout for a subscription.
 * createPortalSession       — Opens the Stripe customer billing portal.
 * stripeWebhook             — Signature-verified Stripe webhook → sets user tier.
 * finalizeScheduledDeletions — Daily job: completes 14-day-grace account deletions.
 * cleanupExpiredShares      — Daily job: deletes sharedContent links older than 30 days.
 *
 * Secrets:
 *   ANTHROPIC_API_KEY     — firebase functions:secrets:set ANTHROPIC_API_KEY
 *   CLOUDINARY_API_SECRET — firebase functions:secrets:set CLOUDINARY_API_SECRET
 *   STRIPE_SECRET_KEY     — firebase functions:secrets:set STRIPE_SECRET_KEY
 *   STRIPE_WEBHOOK_SECRET — firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
 */

// v1 API import (firebase-functions v5+ defaults the top-level export to v2;
// staying on v1 keeps existing function URLs — v2 would mint new Cloud Run
// URLs and break the client's REACT_APP_*_URL env vars).
const functions = require("firebase-functions/v1");
const crypto = require("crypto");
const admin = require("firebase-admin");

// Initialize the Admin SDK once (used for ID-token verification + Firestore
// usage counters). Admin SDK bypasses Firestore security rules.
if (!admin.apps.length) admin.initializeApp();

// Lazily create the Firestore client. Calling admin.firestore() at module load
// eagerly initializes gRPC, which can hang the CLI's code-analysis phase and
// cause "Cannot determine backend specification. Timeout" during deploy.
let _adminDb = null;
function getAdminDb() {
  if (!_adminDb) _adminDb = admin.firestore();
  return _adminDb;
}

// Per-user daily cap on AI proxy calls (resets at UTC midnight). Prevents a
// single account from running up the Anthropic bill. The cap is tier-based —
// the ladder the pricing page advertises (Free 3 / Pro 10 / Pro+AI 50).
const AI_LIMITS = { free: 3, pro: 10, pro_ai: 50 };

// The WIMC Assistant (in-app help bot) is exempt from the tier AI ladder so
// support is always available — but it gets its own generous daily cap (tracked
// separately) to bound abuse.
const HELP_FEATURE = "wimc_assistant";
const HELP_DAILY_LIMIT = 40;

// Set permissive CORS headers on every response so the browser never blocks
// the preflight. Allow the Authorization header so the client can send the
// Firebase ID token used for per-user rate limiting.
function setCORS(res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

// Verify the Firebase ID token from the Authorization header → returns uid.
async function verifyUser(req) {
  const header = req.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  try {
    const decoded = await admin.auth().verifyIdToken(match[1]);
    return decoded.uid || null;
  } catch {
    return null;
  }
}

// Atomically check + increment today's usage for a user. Returns
// { allowed, count }. Resets the counter when the UTC date changes.
async function checkAndIncrementUsage(uid) {
  const adminDb = getAdminDb();
  const usageRef = adminDb.collection("aiUsage").doc(uid);
  const userRef  = adminDb.collection("users").doc(uid);
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  return adminDb.runTransaction(async (tx) => {
    const [usageSnap, userSnap] = await Promise.all([tx.get(usageRef), tx.get(userRef)]);
    const data = usageSnap.exists ? usageSnap.data() : {};
    const userData = userSnap.exists ? userSnap.data() : {};
    const tier = userData.tier || "free";
    // Owner/dev bypass: set aiUnlimited on a user doc to skip the daily cap
    // (does NOT change their tier, so feature-gating still tests normally).
    // Accept boolean true OR the string "true" so a Firestore type mix-up
    // doesn't silently disable the bypass.
    if (userData.aiUnlimited === true || userData.aiUnlimited === "true") {
      return { allowed: true, count: 0, limit: Infinity, tier };
    }
    const limit = AI_LIMITS[tier] ?? AI_LIMITS.free;
    const count = data.date === today ? (data.count || 0) : 0;
    if (count >= limit) {
      return { allowed: false, count, limit, tier };
    }
    tx.set(usageRef, { date: today, count: count + 1, updatedAt: Date.now() });
    return { allowed: true, count: count + 1, limit, tier };
  });
}

// Separate daily counter for the help assistant (not tied to the tier ladder).
async function checkAndIncrementHelp(uid) {
  const adminDb = getAdminDb();
  const ref = adminDb.collection("aiHelpUsage").doc(uid);
  const today = new Date().toISOString().slice(0, 10);
  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : {};
    const count = data.date === today ? (data.count || 0) : 0;
    if (count >= HELP_DAILY_LIMIT) {
      return { allowed: false, count, limit: HELP_DAILY_LIMIT };
    }
    tx.set(ref, { date: today, count: count + 1, updatedAt: Date.now() });
    return { allowed: true, count: count + 1, limit: HELP_DAILY_LIMIT };
  });
}

// ── Anthropic proxy ───────────────────────────────────────────────────────────
exports.anthropicProxy = functions
  .runWith({ secrets: ["ANTHROPIC_API_KEY"] })
  .https.onRequest(async (req, res) => {
    setCORS(res);

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    // ── Require a signed-in user ──────────────────────────────────────────────
    const uid = await verifyUser(req);
    if (!uid) {
      res.status(401).json({ error: "Please sign in to use AI features." });
      return;
    }

    // The client tags each call with a feature label. Strip it before
    // forwarding (Anthropic would reject an unknown field) and use it to pick
    // the rate-limit bucket: the help bot has its own counter, exempt from the
    // tier AI ladder.
    const { feature, ...anthropicBody } = req.body || {};
    const isHelp = feature === HELP_FEATURE;

    // ── Per-user daily rate limit ─────────────────────────────────────────────
    try {
      const { allowed, count, limit, tier } = isHelp
        ? await checkAndIncrementHelp(uid)
        : await checkAndIncrementUsage(uid);
      if (!allowed) {
        const msg = isHelp
          ? `You've reached today's limit of ${limit} help questions. Please try again tomorrow.`
          : `You've reached today's limit of ${limit} AI requests. ${
              tier === "pro_ai"
                ? "Please try again tomorrow."
                : "Upgrade your plan for more daily AI requests, or try again tomorrow."
            }`;
        res.status(429).json({ error: msg });
        return;
      }
      res.set("X-AI-Usage", String(count));
    } catch (e) {
      console.error("rate-limit check failed:", e);
      // Fail open on counter errors so a Firestore hiccup doesn't block users,
      // but log it so we can investigate.
    }

    try {
      const upstream = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({ ...anthropicBody, stream: false }),
      });
      const data = await upstream.json();
      res.status(upstream.status).json(data);
    } catch (err) {
      console.error("anthropicProxy error:", err);
      res.status(500).json({ error: "Proxy error. Please try again." });
    }
  });

// ── Cloudinary asset delete ───────────────────────────────────────────────────
exports.deleteCloudinaryAsset = functions
  .runWith({ secrets: ["CLOUDINARY_API_SECRET"] })
  .https.onRequest(async (req, res) => {
    setCORS(res);

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    // Require a signed-in user — prevents anonymous deletion of any asset.
    const delUid = await verifyUser(req);
    if (!delUid) {
      res.status(401).json({ error: "Please sign in." });
      return;
    }

    const { public_id, resource_type = "image", api_key, cloud_name } = req.body;
    if (!public_id || !api_key || !cloud_name) {
      res.status(400).json({ error: "Missing required fields: public_id, api_key, cloud_name" });
      return;
    }

    // Guard: secret must be injected at deploy time
    if (!process.env.CLOUDINARY_API_SECRET) {
      console.error("deleteCloudinaryAsset: CLOUDINARY_API_SECRET is not bound");
      res.status(500).json({ error: "Server misconfiguration: secret missing" });
      return;
    }

    const timestamp = Math.round(Date.now() / 1000);
    // Cloudinary requires SHA-1 for the Admin API destroy endpoint
    const stringToSign =
      `public_id=${public_id}&timestamp=${timestamp}` +
      process.env.CLOUDINARY_API_SECRET;

    console.log("deleteCloudinaryAsset → public_id:", public_id,
      "| resource_type:", resource_type, "| cloud:", cloud_name);
    const signature = crypto
      .createHash("sha1")
      .update(stringToSign)
      .digest("hex");

    const form = new URLSearchParams();
    form.append("public_id", public_id);
    form.append("api_key", api_key);
    form.append("timestamp", String(timestamp));
    form.append("signature", signature);

    const endpoint = `https://api.cloudinary.com/v1_1/${cloud_name}/${resource_type}/destroy`;

    try {
      const upstream = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });
      const data = await upstream.json();
      res.status(upstream.status).json(data);
    } catch (err) {
      console.error("deleteCloudinaryAsset error:", err);
      res.status(500).json({ error: "Delete failed. Please try again." });
    }
  });

// ── Cloudinary signature generator ───────────────────────────────────────────
exports.cloudinarySign = functions
  .runWith({ secrets: ["CLOUDINARY_API_SECRET"] })
  .https.onRequest(async (req, res) => {
    setCORS(res);

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    // Require a signed-in user — prevents anonymous minting of upload
    // signatures (which would allow arbitrary uploads to the account).
    const signUid = await verifyUser(req);
    if (!signUid) {
      res.status(401).json({ error: "Please sign in." });
      return;
    }

    const timestamp = Math.round(Date.now() / 1000);
    const { upload_preset, folder, tags } = req.body;

    const params = { timestamp, upload_preset };
    if (folder) params.folder = folder;
    if (tags) params.tags = tags;

    const stringToSign =
      Object.keys(params)
        .sort()
        .map((k) => `${k}=${params[k]}`)
        .join("&") + process.env.CLOUDINARY_API_SECRET;

    const signature = crypto
      .createHash("sha256")
      .update(stringToSign)
      .digest("hex");

    res.json({ timestamp, signature });
  });

// ── Stripe billing ────────────────────────────────────────────────────────────
//
// Secrets:
//   STRIPE_SECRET_KEY     — firebase functions:secrets:set STRIPE_SECRET_KEY
//   STRIPE_WEBHOOK_SECRET — firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
//
// Flow: client calls createCheckoutSession → redirects to Stripe Checkout →
// on success Stripe calls stripeWebhook → we set the user's tier in Firestore.
// createPortalSession lets a subscriber manage/cancel (used in Step 27).

// Public app base for post-checkout redirects (GitHub Pages project path).
const APP_URL = "https://rwallace1ro.github.io/project-wimc-frontend";

// Maps each Stripe Price ID → the tier it grants. These are the TEST-mode price
// IDs; when going live, replace with the live price IDs (same tier values).
const TIER_BY_PRICE = {
  price_1Tj1CCFHY9B8ibv95O493fUs: "pro",     // Pro monthly  $4.99
  price_1Tj1ELFHY9B8ibv92n4w5g3a: "pro",     // Pro annual   $39.99
  price_1Tj1mMFHY9B8ibv9pYRXcjvl: "pro_ai",  // Pro+AI monthly $7.99
  price_1Tj1XlFHY9B8ibv9Ibg8vtEx: "pro_ai",  // Pro+AI annual  $79.99
};

// Lazy Stripe client (secret is only bound at runtime via runWith).
let _stripe = null;
function getStripe() {
  if (!_stripe) _stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}

// Return the user's existing Stripe customer id, creating one if needed.
async function getOrCreateCustomer(uid) {
  const adminDb = getAdminDb();
  const ref = adminDb.collection("users").doc(uid);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : {};
  if (data.stripeCustomerId) return data.stripeCustomerId;

  // Look up the user's email from Auth for the Stripe customer record.
  let email;
  try { email = (await admin.auth().getUser(uid)).email; } catch { /* optional */ }

  const customer = await getStripe().customers.create({
    email,
    metadata: { firebaseUID: uid },
  });
  await ref.set({ stripeCustomerId: customer.id }, { merge: true });
  return customer.id;
}

// ── Create Checkout Session ───────────────────────────────────────────────────
exports.createCheckoutSession = functions
  .runWith({ secrets: ["STRIPE_SECRET_KEY"] })
  .https.onRequest(async (req, res) => {
    setCORS(res);
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST")    { res.status(405).send("Method Not Allowed"); return; }

    const uid = await verifyUser(req);
    if (!uid) { res.status(401).json({ error: "Please sign in to subscribe." }); return; }

    const { priceId } = req.body || {};
    if (!priceId || !TIER_BY_PRICE[priceId]) {
      res.status(400).json({ error: "Unknown or missing price." });
      return;
    }

    try {
      const customerId = await getOrCreateCustomer(uid);
      const session = await getStripe().checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        client_reference_id: uid,
        // Stamp uid on the subscription so later webhook events (updates,
        // cancellations) can resolve the user even without the checkout session.
        subscription_data: { metadata: { firebaseUID: uid } },
        allow_promotion_codes: true,
        success_url: `${APP_URL}/home?checkout=success`,
        cancel_url: `${APP_URL}/pricing?checkout=cancel`,
      });
      res.json({ url: session.url });
    } catch (err) {
      console.error("createCheckoutSession error:", err);
      res.status(500).json({ error: "Could not start checkout. Please try again." });
    }
  });

// ── Customer Portal (Step 27 — manage/cancel subscription) ────────────────────
exports.createPortalSession = functions
  .runWith({ secrets: ["STRIPE_SECRET_KEY"] })
  .https.onRequest(async (req, res) => {
    setCORS(res);
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST")    { res.status(405).send("Method Not Allowed"); return; }

    const uid = await verifyUser(req);
    if (!uid) { res.status(401).json({ error: "Please sign in." }); return; }

    try {
      const adminDb = getAdminDb();
      const snap = await adminDb.collection("users").doc(uid).get();
      const customerId = snap.exists ? snap.data().stripeCustomerId : null;
      if (!customerId) { res.status(400).json({ error: "No subscription found." }); return; }

      const portal = await getStripe().billingPortal.sessions.create({
        customer: customerId,
        return_url: `${APP_URL}/home`,
      });
      res.json({ url: portal.url });
    } catch (err) {
      console.error("createPortalSession error:", err);
      res.status(500).json({ error: "Could not open the billing portal." });
    }
  });

// ── Stripe Webhook (signature-verified) ───────────────────────────────────────
// Updates users/{uid} subscription state. Stripe (not a browser) calls this, so
// no CORS. Signature verification requires the RAW body (req.rawBody).
exports.stripeWebhook = functions
  .runWith({ secrets: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"] })
  .https.onRequest(async (req, res) => {
    const stripe = getStripe();
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        req.get("stripe-signature"),
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      console.error("stripeWebhook signature verification failed:", err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    const adminDb = getAdminDb();

    // Resolve the firebase uid + tier from a subscription object.
    const applySubscription = async (sub) => {
      const uid = sub.metadata?.firebaseUID;
      if (!uid) return;
      const priceId = sub.items?.data?.[0]?.price?.id;
      const active = sub.status === "active" || sub.status === "trialing";
      const tier = active ? (TIER_BY_PRICE[priceId] || "free") : "free";
      await adminDb.collection("users").doc(uid).set({
        tier,
        subscriptionStatus: sub.status,
        stripeSubscriptionId: sub.id,
        stripePriceId: priceId || null,
        currentPeriodEnd: sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null,
        subscriptionUpdatedAt: new Date().toISOString(),
      }, { merge: true });
    };

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          const uid = session.client_reference_id;
          if (session.subscription && uid) {
            const sub = await stripe.subscriptions.retrieve(session.subscription);
            // Ensure the uid is on the subscription metadata for future events.
            if (!sub.metadata?.firebaseUID) {
              await stripe.subscriptions.update(sub.id, { metadata: { firebaseUID: uid } });
              sub.metadata = { ...(sub.metadata || {}), firebaseUID: uid };
            }
            await applySubscription(sub);
          }
          break;
        }
        case "customer.subscription.created":
        case "customer.subscription.updated":
        case "customer.subscription.deleted": {
          await applySubscription(event.data.object);
          break;
        }
        default:
          // ignore other event types
          break;
      }
      res.json({ received: true });
    } catch (err) {
      console.error("stripeWebhook handler error:", err);
      res.status(500).send("Webhook handler error");
    }
  });

// ── Scheduled account deletion finalizer ──────────────────────────────────────
//
// Completes the 14-day "grace period" account deletion started by the client's
// scheduleDeletion(uid) (src/utils/accountDeletion.js). That function only sets
// { pendingDeletion: true, deletionDate } on the user's profile doc — this job
// is the "Phase B" piece that actually erases the account once the date passes.
//
// Mirrors deleteAllUserData(uid) in accountDeletion.js almost line-for-line
// (same URL-collection strategy, same section tags, same best-effort deletes),
// but runs server-side with the Admin SDK so it works with no user signed in.

// Public Cloudinary identifiers — NOT secrets. They're already embedded in the
// client bundle (REACT_APP_CLOUD_NAME / REACT_APP_CLOUDINARY_API_KEY).
const CLOUDINARY_CLOUD_NAME = "djoh2vfhd";
const CLOUDINARY_API_KEY = "258382581976839";

// Every base closet-card tag + every sub-section slug across all 4 gender/age
// profiles (adult/kid × female/male). Kids/Pet closets prefix these with a
// per-profile id (kid-{id}-… / pet-{id}-…), making the resulting tag unique to
// one user — safe to fetch & delete by tag. KEEP IN SYNC with
// wimc-react-app/src/utils/closetSubsections.js (BASE_SLUGS + ALL_SUBSECTION_SLUGS).
const KID_PET_SECTION_KEYS = [
  // base cards
  "dresses-skirts", "dress-shirts-suits", "shoes-sneakers",
  "pants-jeans", "tops", "bags-accessories", "jackets-coats",
  // sub-section slugs (union of every profile)
  "skirts", "sneakers", "heels", "sandals-slides", "jeans",
  "shirts", "t-shirts", "suits", "sweaters", "dress-shirts", "coats",
  "accessories", "fragrance",
];

// Matches any Cloudinary delivery URL (image or video). Same pattern as the
// client's accountDeletion.js.
const FINALIZE_CLOUDINARY_URL_RE =
  /https:\/\/res\.cloudinary\.com\/[A-Za-z0-9_-]+\/(?:image|video)\/upload\/[^\s"'\\)]+/g;

// Shared app-default asset that belongs to everyone — never delete it.
const FINALIZE_PROTECTED_URLS = new Set([
  "https://res.cloudinary.com/djoh2vfhd/image/upload/v1729608070/2011-10-27_20.07.18_HDR_cdbudn.jpg",
]);

// Extract a Cloudinary public_id from a delivery URL (ported from
// CloudinaryAPI.js's extractPublicId so the server deletes the exact same
// asset the client would have).
function extractPublicIdServer(url) {
  if (!url || !url.includes("/upload/")) return "";
  const afterUpload = url.split("/upload/")[1];
  if (!afterUpload) return "";
  const segments = afterUpload.split("/");
  const publicIdParts = [];
  let foundContent = false;
  for (const seg of segments) {
    if (!foundContent) {
      if (/^v\d+$/.test(seg)) continue;
      if (
        seg.includes(",") ||
        /^(f_|q_|w_|h_|c_|e_|l_|so_|du_|fl_|r_|b_|bo_|co_|dpr_|g_|o_|p_|pg_|t_|x_|y_|z_|ar_|aspect_ratio_)/.test(seg)
      ) continue;
      foundContent = true;
    }
    publicIdParts.push(seg);
  }
  const withExt = publicIdParts.join("/");
  return withExt.replace(/\.[^./?]+(\?.*)?$/, "");
}

// Delete one Cloudinary asset directly via the Admin API (no self-HTTP round
// trip — this runs server-side with the secret already in-process).
async function deleteCloudinaryAssetServer(url) {
  const publicId = extractPublicIdServer(url);
  if (!publicId) throw new Error("Could not extract public_id");
  const resourceType = url.includes("/video/upload/") ? "video" : "image";
  const timestamp = Math.round(Date.now() / 1000);
  const stringToSign =
    `public_id=${publicId}&timestamp=${timestamp}` + process.env.CLOUDINARY_API_SECRET;
  const signature = crypto.createHash("sha1").update(stringToSign).digest("hex");

  const form = new URLSearchParams();
  form.append("public_id", publicId);
  form.append("api_key", CLOUDINARY_API_KEY);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/destroy`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  if (!res.ok) throw new Error(`Cloudinary destroy failed (${res.status})`);
  return res.json();
}

// Fetch the public (unsigned) Cloudinary tag-list JSON — same endpoint the
// client's fetchImagesByTag/fetchVideosByTag use.
async function fetchTagListServer(tag, resourceType) {
  const url = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/${resourceType}/list/${tag}.json`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.resources || []).map(
      (item) =>
        `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload/v${item.version}/${item.public_id}.${item.format}`,
    );
  } catch {
    return [];
  }
}

// Fully erase one account's data (Cloudinary + Firestore). Does NOT delete the
// Auth user — the caller does that last, after this succeeds. Every step is
// best-effort: a single failure never aborts the whole erasure.
async function finalizeOneAccountData(uid) {
  const adminDb = getAdminDb();
  const urls = new Set();
  let kidPetProfiles = [];

  // 1a. Profile avatar + kid/pet profile photos
  try {
    const profileSnap = await adminDb.collection("users").doc(uid).get();
    const data = profileSnap.exists ? profileSnap.data() : null;
    if (typeof data?.avatarUrl === "string") {
      (data.avatarUrl.match(FINALIZE_CLOUDINARY_URL_RE) || []).forEach((u) => urls.add(u));
    }
    kidPetProfiles = [
      ...(data?.kidsProfiles || []).map((p) => ({ ...p, _prefix: "kid" })),
      ...(data?.kidsDeleted  || []).map((p) => ({ ...p, _prefix: "kid" })),
      ...(data?.petProfiles  || []).map((p) => ({ ...p, _prefix: "pet" })),
      ...(data?.petDeleted   || []).map((p) => ({ ...p, _prefix: "pet" })),
    ];
    kidPetProfiles.forEach((prof) => {
      if (typeof prof?.photoUrl === "string") {
        (prof.photoUrl.match(FINALIZE_CLOUDINARY_URL_RE) || []).forEach((u) => urls.add(u));
      }
    });
  } catch (e) {
    console.error(`finalizeOneAccountData(${uid}) profile read failed:`, e);
  }

  // 1b. Kids/Pet closet items — fetch by per-profile tag (unique to this user)
  try {
    const tagJobs = [];
    kidPetProfiles.forEach((prof) => {
      if (!prof?.id) return;
      KID_PET_SECTION_KEYS.forEach((sec) => {
        const tag = `${prof._prefix}-${prof.id}-${sec}`;
        tagJobs.push(
          fetchTagListServer(tag, "image").then((arr) => arr.forEach((u) => urls.add(u))),
          fetchTagListServer(tag, "video").then((arr) => arr.forEach((u) => urls.add(u))),
        );
      });
    });
    await Promise.all(tagJobs);
  } catch (e) {
    console.error(`finalizeOneAccountData(${uid}) kid/pet tag fetch failed:`, e);
  }

  // 1c. Image/video URLs embedded in syncdata values
  let syncSnap = null;
  try {
    syncSnap = await adminDb.collection("users").doc(uid).collection("syncdata").get();
    syncSnap.forEach((d) => {
      const v = d.data()?.value;
      if (typeof v === "string") {
        (v.match(FINALIZE_CLOUDINARY_URL_RE) || []).forEach((u) => urls.add(u));
      }
    });
  } catch (e) {
    console.error(`finalizeOneAccountData(${uid}) syncdata read failed:`, e);
  }

  // 2. Delete the Cloudinary assets (best-effort)
  for (const url of urls) {
    if (FINALIZE_PROTECTED_URLS.has(url)) continue;
    try {
      await deleteCloudinaryAssetServer(url);
    } catch (e) {
      console.error(`finalizeOneAccountData(${uid}) asset delete failed for ${url}:`, e.message);
    }
  }

  // 3. Delete syncdata docs
  if (syncSnap) {
    for (const d of syncSnap.docs) {
      try { await d.ref.delete(); } catch { /* best-effort */ }
    }
  }

  // 4. Delete share links this user owns
  try {
    const sharesSnap = await adminDb.collection("sharedContent").where("ownerId", "==", uid).get();
    for (const d of sharesSnap.docs) {
      try { await d.ref.delete(); } catch { /* best-effort */ }
    }
  } catch (e) {
    console.error(`finalizeOneAccountData(${uid}) sharedContent cleanup failed:`, e);
  }

  // 5. Delete usage-counter docs tied to this uid (aiUsage/aiHelpUsage)
  try {
    await adminDb.collection("aiUsage").doc(uid).delete();
  } catch { /* best-effort */ }
  try {
    await adminDb.collection("aiHelpUsage").doc(uid).delete();
  } catch { /* best-effort */ }

  // 6. Delete the profile doc itself
  try {
    await adminDb.collection("users").doc(uid).delete();
  } catch (e) {
    console.error(`finalizeOneAccountData(${uid}) profile doc delete failed:`, e);
  }
}

// Runs once a day. Finds accounts whose 14-day grace period has elapsed and
// completes the erasure (Cloudinary + Firestore + the Auth user itself).
// Queries only on the equality filter (pendingDeletion == true) — no composite
// Firestore index required — then filters the (small) result set by date in
// memory.
exports.finalizeScheduledDeletions = functions
  .runWith({ secrets: ["CLOUDINARY_API_SECRET"] })
  .pubsub.schedule("every 24 hours")
  .onRun(async () => {
    const adminDb = getAdminDb();
    const nowIso = new Date().toISOString();

    let snap;
    try {
      snap = await adminDb.collection("users").where("pendingDeletion", "==", true).get();
    } catch (e) {
      console.error("finalizeScheduledDeletions: query failed:", e);
      return null;
    }

    const due = snap.docs.filter((d) => {
      const dd = d.data()?.deletionDate;
      return typeof dd === "string" && dd <= nowIso;
    });

    console.log(`finalizeScheduledDeletions: ${due.length} account(s) due out of ${snap.size} pending`);

    for (const docSnap of due) {
      const uid = docSnap.id;
      try {
        // Re-check freshness right before erasing — catches a last-second
        // cancelDeletion() that happened after the query ran.
        const fresh = await adminDb.collection("users").doc(uid).get();
        const freshData = fresh.exists ? fresh.data() : null;
        if (!freshData?.pendingDeletion) {
          console.log(`finalizeScheduledDeletions: ${uid} was cancelled — skipping`);
          continue;
        }

        await finalizeOneAccountData(uid);
        await admin.auth().deleteUser(uid);
        console.log(`finalizeScheduledDeletions: erased ${uid}`);
      } catch (e) {
        // A failed account never blocks the rest of the batch. It stays
        // pendingDeletion=true and is retried on the next daily run.
        console.error(`finalizeScheduledDeletions: failed for ${uid}:`, e);
      }
    }

    return null;
  });

// ── Scheduled share cleanup ────────────────────────────────────────────────────
// Runs once a day. Deletes sharedContent docs (Share + Edit / view-only links,
// including their checkedItems and comments) once they're older than 30 days.
// A single inequality filter on one field needs no composite Firestore index.
const SHARE_RETENTION_DAYS = 30;
exports.cleanupExpiredShares = functions
  .pubsub.schedule("every 24 hours")
  .onRun(async () => {
    const adminDb = getAdminDb();
    const cutoffIso = new Date(
      Date.now() - SHARE_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    let snap;
    try {
      snap = await adminDb.collection("sharedContent").where("createdAt", "<=", cutoffIso).get();
    } catch (e) {
      console.error("cleanupExpiredShares: query failed:", e);
      return null;
    }

    console.log(`cleanupExpiredShares: deleting ${snap.size} share(s) older than ${SHARE_RETENTION_DAYS} days`);

    for (const docSnap of snap.docs) {
      try {
        await docSnap.ref.delete();
      } catch (e) {
        // A failed delete never blocks the rest of the batch — it's simply
        // retried on the next daily run.
        console.error(`cleanupExpiredShares: failed to delete ${docSnap.id}:`, e);
      }
    }

    return null;
  });
