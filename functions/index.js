/**
 * WIMC Firebase Cloud Functions
 *
 * anthropicProxy            — Secure server-side proxy for Anthropic API calls.
 * cloudinarySign            — Generates a signed upload signature for Cloudinary.
 * deleteCloudinaryAsset     — Signed delete of a Cloudinary asset.
 * createCheckoutSession     — Starts a Stripe Checkout for a subscription.
 * createPortalSession       — Opens the Stripe customer billing portal.
 * stripeWebhook             — Signature-verified Stripe webhook → sets stripeTier.
 * cancelSubscriptionForDeletion — Cancels the caller's Stripe subscription(s) before an immediate account deletion.
 * revenuecatWebhook         — Bearer-secret RevenueCat webhook (Apple IAP) → sets appleTier.
 * syncEffectiveTier         — Firestore trigger: tier = higher of stripeTier/appleTier.
 * clearCountersOnUserDelete — On Auth-user deletion: clears AI usage counters AND sweeps the whole users/{uid} tree (stray sync docs).
 * finalizeScheduledDeletions — Daily job: completes 14-day-grace account deletions.
 * cleanupExpiredShares      — Daily job: deletes sharedContent links older than 30 days.
 * submitContactForm         — Public contact form → emails support via Resend.
 *
 * Secrets:
 *   ANTHROPIC_API_KEY        — firebase functions:secrets:set ANTHROPIC_API_KEY
 *   CLOUDINARY_API_SECRET    — firebase functions:secrets:set CLOUDINARY_API_SECRET
 *   STRIPE_SECRET_KEY        — firebase functions:secrets:set STRIPE_SECRET_KEY
 *   STRIPE_WEBHOOK_SECRET    — firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
 *   REVENUECAT_WEBHOOK_SECRET — firebase functions:secrets:set REVENUECAT_WEBHOOK_SECRET
 *   RESEND_API_KEY           — firebase functions:secrets:set RESEND_API_KEY
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

// The Shopping List's "Check my closet for duplicates" tool is likewise
// exempt from the paid-tier AI ladder — it directly serves the app's own
// "avoid buying duplicates" pitch, so it shouldn't be locked behind Pro+AI.
// Its own small daily cap (same tier-agnostic pattern as the help bot) bounds
// the cost since it's still a real API call.
const DUPE_CHECK_FEATURE = "ai_shopping_closet_check";
const DUPE_CHECK_DAILY_LIMIT = 5;

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

// Does this Firebase Auth user still exist? Server writes triggered by billing
// events (Stripe, RevenueCat) must not touch an account that has been deleted —
// a merge-write would quietly re-create a stub users/{uid} document. Only an
// explicit "no such user" counts as gone; any other lookup error is treated as
// "exists" so a transient failure never skips a real customer's update.
async function authUserExists(uid) {
  return admin.auth().getUser(uid).then(() => true, (e) => e?.code !== "auth/user-not-found");
}

// Split into a read-only PEEK (checked before calling Anthropic — never
// charges) and an INCREMENT (called only after Anthropic responds
// successfully). This means a failed/errored AI call — a 5xx from Anthropic,
// a network hiccup, etc. — never costs the user part of their daily limit;
// only a genuine successful response does. There's a small window where
// several simultaneous requests could all pass the peek before any of them
// increments (a user firing multiple tabs at once), but that's an acceptable
// tradeoff for never wrongly penalizing a failed request.
async function peekUsage(uid) {
  const adminDb = getAdminDb();
  const usageRef = adminDb.collection("aiUsage").doc(uid);
  const userRef  = adminDb.collection("users").doc(uid);
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  const [usageSnap, userSnap] = await Promise.all([usageRef.get(), userRef.get()]);
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
  return { allowed: count < limit, count, limit, tier };
}
async function incrementUsage(uid) {
  const adminDb = getAdminDb();
  const usageRef = adminDb.collection("aiUsage").doc(uid);
  const today = new Date().toISOString().slice(0, 10);
  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(usageRef);
    const data = snap.exists ? snap.data() : {};
    const count = data.date === today ? (data.count || 0) : 0;
    tx.set(usageRef, { date: today, count: count + 1, updatedAt: Date.now() });
    return count + 1;
  });
}

// Generic tier-agnostic daily counter, keyed by its own Firestore collection
// and cap — used for features exempt from the paid AI-request ladder (help
// bot, closet duplicate check) so each gets an independent daily allowance.
// Same peek/increment split as above. Also honors the aiUnlimited owner/dev
// bypass, same as the main tiered ladder — otherwise that flag would only
// cover the paid AI ladder and these separate counters would still cap out.
async function peekCustom(uid, collectionName, dailyLimit) {
  const adminDb = getAdminDb();
  const ref = adminDb.collection(collectionName).doc(uid);
  const userRef = adminDb.collection("users").doc(uid);
  const today = new Date().toISOString().slice(0, 10);
  const [snap, userSnap] = await Promise.all([ref.get(), userRef.get()]);
  const userData = userSnap.exists ? userSnap.data() : {};
  if (userData.aiUnlimited === true || userData.aiUnlimited === "true") {
    return { allowed: true, count: 0, limit: Infinity };
  }
  const data = snap.exists ? snap.data() : {};
  const count = data.date === today ? (data.count || 0) : 0;
  return { allowed: count < dailyLimit, count, limit: dailyLimit };
}
async function incrementCustom(uid, collectionName) {
  const adminDb = getAdminDb();
  const ref = adminDb.collection(collectionName).doc(uid);
  const today = new Date().toISOString().slice(0, 10);
  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : {};
    const count = data.date === today ? (data.count || 0) : 0;
    tx.set(ref, { date: today, count: count + 1, updatedAt: Date.now() });
    return count + 1;
  });
}
async function peekHelp(uid) { return peekCustom(uid, "aiHelpUsage", HELP_DAILY_LIMIT); }
async function incrementHelp(uid) { return incrementCustom(uid, "aiHelpUsage"); }
async function peekDupeCheck(uid) { return peekCustom(uid, "aiDupeCheckUsage", DUPE_CHECK_DAILY_LIMIT); }
async function incrementDupeCheck(uid) { return incrementCustom(uid, "aiDupeCheckUsage"); }

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
    // the rate-limit bucket: the help bot and the closet duplicate-check each
    // have their own counter, exempt from the tier AI ladder.
    const { feature, ...anthropicBody } = req.body || {};
    const isHelp = feature === HELP_FEATURE;
    const isDupeCheck = feature === DUPE_CHECK_FEATURE;

    // ── Per-user daily rate limit (peek only — charged after success below) ───
    let tier = "free";
    try {
      const { allowed, count, limit, tier: t } = isHelp
        ? await peekHelp(uid)
        : isDupeCheck
          ? await peekDupeCheck(uid)
          : await peekUsage(uid);
      tier = t;
      if (!allowed) {
        const msg = isHelp
          ? `You've reached today's limit of ${limit} help questions. Please try again tomorrow.`
          : isDupeCheck
            ? `You've reached today's limit of ${limit} closet duplicate checks. Please try again tomorrow.`
            : `You've reached today's limit of ${limit} AI requests. ${
                tier === "pro_ai"
                  ? "Please try again tomorrow."
                  : "Upgrade your plan for more daily AI requests, or try again tomorrow."
              }`;
        res.status(429).json({ error: msg });
        return;
      }
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
      // Only charge the user's daily limit on a genuine successful response —
      // an error from Anthropic (rate limit, 5xx, bad request, etc.) shouldn't
      // cost them part of their quota.
      if (upstream.ok) {
        try {
          const count = isHelp
            ? await incrementHelp(uid)
            : isDupeCheck
              ? await incrementDupeCheck(uid)
              : await incrementUsage(uid);
          res.set("X-AI-Usage", String(count));
        } catch (e) {
          console.error("usage increment failed:", e);
        }
      }
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

// Maps each Stripe Price ID → the tier it grants. LIVE-mode price IDs.
const TIER_BY_PRICE = {
  // Legacy prices (single shared product) — kept so existing subscriptions
  // created before the Pro/Pro+AI product split still resolve correctly.
  price_1Tb61FFHY9B8ibv9qQuXRN3v: "pro",     // Pro monthly  $4.99 (legacy)
  price_1Tb64ZFHY9B8ibv9pOIT5Uo2: "pro",     // Pro annual   $39.99 (legacy)
  price_1Tb646FHY9B8ibv9eU0jyW6N: "pro_ai",  // Pro+AI monthly $7.99 (legacy)
  price_1Tb64sFHY9B8ibv9VIKt86tq: "pro_ai",  // Pro+AI annual  $79.99 (legacy)

  // Prices in effect 2026-06 through 2026-09 — kept (not archived) so
  // subscribers who joined during that window at $4.99/$39.99/$7.99/$79.99
  // are grandfathered on their original price for life; only NEW checkout
  // sessions use the current prices below.
  price_1U19OrFHY9B8ibv9KlJbydxd: "pro",     // Pro monthly $4.99 (grandfathered)
  price_1U19RCFHY9B8ibv9LvXxDSnQ: "pro",     // Pro annual $39.99 (grandfathered)
  price_1U19TtFHY9B8ibv9a7FOiD3y: "pro_ai",  // Pro+AI monthly $7.99 (grandfathered)
  price_1U19UnFHY9B8ibv9pQbLRuUe: "pro_ai",  // Pro+AI annual $79.99 (grandfathered)

  // Current prices (2026-09+) — raised to net the same amount after Apple's
  // 15% Small Business Program IAP commission, since prices are now uniform
  // across web (Stripe) and iOS (Apple IAP/RevenueCat). See pricing-tiers
  // memory for the full rationale.
  price_1UEbVXFHY9B8ibv9DCtM856L: "pro",     // Pro monthly $5.99
  price_1UEbYqFHY9B8ibv9lpgPpw0s: "pro",     // Pro annual $47.99
  price_1UEbZqFHY9B8ibv9w5Pc56cd: "pro_ai",  // Pro+AI monthly $9.99
  price_1UEbaYFHY9B8ibv9Xy9O2G9I: "pro_ai",  // Pro+AI annual $94.99
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

// ── Transactional email (Resend) ──────────────────────────────────────────────
// Same Resend account + verified gingerfaith.com domain as the contact form.
// Best-effort by design: a failed email must never fail (and so make Stripe
// retry) the subscription webhook that triggered it.
const EMAIL_FROM = "WIMC <no-reply@gingerfaith.com>";
const PLAN_NAME = { pro: "Pro", pro_ai: "Pro + AI" };

async function sendEmail({ to, subject, text, html }) {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not bound");
  const upstream = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    // Replies go to a real, monitored inbox rather than the no-reply sender.
    body: JSON.stringify({ from: EMAIL_FROM, to: [to], reply_to: CONTACT_SUPPORT_EMAIL, subject, text, html }),
  });
  if (!upstream.ok) throw new Error(`Resend ${upstream.status}: ${await upstream.text()}`);
}

const escapeHtml = (s) =>
  String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const formatDateUTC = (iso) =>
  new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

// Newer Stripe API versions moved current_period_end off the subscription and
// onto its items — read both so the renewal date is populated either way.
function periodEndIso(sub) {
  const ts = sub.items?.data?.[0]?.current_period_end || sub.current_period_end;
  return ts ? new Date(ts * 1000).toISOString() : null;
}

function buildCancellationEmail({ name, plan, endDateIso, immediate }) {
  const hi = `Hi ${name || "there"},`;
  const closing = "Questions? Just reply to this email or write to wimcsupport@gingerfaith.com.";
  const paras = immediate
    ? [
        `Your WIMC ${plan} subscription has been canceled and your paid access has ended, so your account is now on the Free plan. You won't be charged again.`,
        "Your closet, photos, and outfits are all still there — some features are limited on the Free plan.",
        "You can subscribe again anytime from the Pricing page.",
      ]
    : [
        `Your WIMC ${plan} subscription has been canceled. You'll keep all your ${plan} features until ${formatDateUTC(endDateIso)}. After that, your account moves to the Free plan, and you won't be charged again.`,
        "Your closet, photos, and outfits stay with your account either way.",
        "Changed your mind? Sign in and open Settings → Subscription → Manage Subscription.",
      ];
  return {
    subject: "Your WIMC subscription has been canceled",
    text: [hi, ...paras, closing, "— The WIMC team"].join("\n\n"),
    html:
      `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#1e293b;max-width:560px">` +
      [hi, ...paras, closing].map((p) => `<p>${escapeHtml(p)}</p>`).join("") +
      `<p>— The WIMC team</p></div>`,
  };
}

// Cancel every still-live Stripe subscription belonging to a user. Called when
// an account is being deleted — deleting the WIMC account does not, by itself,
// stop Stripe billing, so without this a departed user keeps being charged.
//
// Looks at both the stored subscription id and every subscription on the
// user's Stripe customer (in case there is more than one). Cancelled with
// comment "account_deleted" so the webhook can tell this apart from a
// customer-initiated cancel and not email someone whose account is gone.
// Idempotent. THROWS on any Stripe failure — callers must treat that as
// "do not delete yet", or the user is left billed with no account.
//
// (Apple subscriptions can't be cancelled from our side at all — the app
// warns those users to cancel in iPhone Settings first.)
const LIVE_SUB_STATUSES = new Set(["active", "trialing", "past_due", "unpaid", "incomplete", "paused"]);

async function cancelStripeSubscriptionsForUser(stripe, adminDb, uid) {
  const snap = await adminDb.collection("users").doc(uid).get();
  const data = snap.exists ? snap.data() : {};

  const ids = new Set();
  if (data.stripeSubscriptionId) ids.add(data.stripeSubscriptionId);
  if (data.stripeCustomerId) {
    const list = await stripe.subscriptions.list({ customer: data.stripeCustomerId, status: "all", limit: 100 });
    for (const s of list.data) ids.add(s.id);
  }

  let cancelled = 0;
  for (const id of ids) {
    let sub;
    try {
      sub = await stripe.subscriptions.retrieve(id);
    } catch (e) {
      if (e.code === "resource_missing") continue; // already gone
      throw e;
    }
    if (!LIVE_SUB_STATUSES.has(sub.status)) continue; // already canceled/expired
    await stripe.subscriptions.cancel(id, { cancellation_details: { comment: "account_deleted" } });
    cancelled++;
  }
  return cancelled;
}

// Which cancellation email (if any) does this event warrant?
//   "scheduled" — the customer just scheduled a cancel-at-period-end (portal)
//   "immediate" — the subscription was canceled outright (dashboard)
//   null        — anything else: no email. Deliberately NOT sent when a
//                 scheduled cancellation later actually ends (they were already
//                 told), on un-cancel/renew, on plan switches, or for
//                 payment-failure cancellations (Stripe's own failed-payment
//                 emails cover those).
function cancellationKind(event, sub) {
  const scheduledNow = sub.cancel_at_period_end === true || sub.cancel_at != null;

  if (event.type === "customer.subscription.updated") {
    const prev = event.data?.previous_attributes || {};
    const changed = "cancel_at_period_end" in prev || "cancel_at" in prev;
    const wasScheduled =
      ("cancel_at_period_end" in prev ? prev.cancel_at_period_end : sub.cancel_at_period_end) === true ||
      ("cancel_at" in prev ? prev.cancel_at : sub.cancel_at) != null;
    return changed && scheduledNow && !wasScheduled && sub.status !== "canceled" ? "scheduled" : null;
  }
  if (event.type === "customer.subscription.deleted") {
    // Not for payment failures (Stripe emails those) and not for the automatic
    // cancel we do when an account is deleted (there's no account to email).
    const reason = sub.cancellation_details?.reason;
    const comment = sub.cancellation_details?.comment;
    return reason !== "payment_failed" && comment !== "account_deleted" && !scheduledNow ? "immediate" : null;
  }
  return null;
}

// Stripe can deliver the same event more than once. Claim the event id
// atomically first so a retry never sends a second email (emailLog is
// admin-only; clients are denied by the default-deny rule).
async function claimEmail(adminDb, key) {
  try {
    await adminDb.collection("emailLog").doc(key).create({ at: new Date().toISOString() });
    return true;
  } catch (e) {
    if (e.code === 6 || /already exists/i.test(e.message || "")) return false;
    throw e;
  }
}

// ── Stripe Webhook (signature-verified) ───────────────────────────────────────
// Updates users/{uid} subscription state. Stripe (not a browser) calls this, so
// no CORS. Signature verification requires the RAW body (req.rawBody).
exports.stripeWebhook = functions
  .runWith({ secrets: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "RESEND_API_KEY"] })
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
    //
    // Writes to `stripeTier` (NOT the effective `tier` field directly) — since
    // real Apple IAP shipped, a user's *effective* tier can come from either
    // Stripe (web) or Apple (iOS RevenueCat), whichever grants more. The
    // syncEffectiveTier Firestore trigger below recomputes `tier` from
    // `stripeTier` + `appleTier` any time either changes, so nothing here (or
    // in the RevenueCat webhook) ever needs to know about the other source.
    //
    // ORDER-INDEPENDENT by construction. Stripe delivers events concurrently
    // and not necessarily in order, and an early event's payload is a snapshot
    // from that moment (e.g. status "incomplete" at the instant of checkout).
    // Trusting it let a slow early event overwrite the final "active" state —
    // a customer was charged while their account stayed on Free (found live
    // 2026-09-18). So:
    //   1. always re-read the LIVE subscription from Stripe, and
    //   2. inside a transaction, refuse to write if a read that started later
    //      already landed (subscriptionUpdatedAt = when we read Stripe), or if
    //      this is a late event about an OLD subscription while a newer paid
    //      one is on the account.
    const isPaidTier = (t) => t === "pro" || t === "pro_ai";

    const applySubscription = async (subOrId) => {
      const startedAtIso = new Date().toISOString();
      const subId = typeof subOrId === "string" ? subOrId : subOrId?.id;
      if (!subId) return null;

      let sub;
      try {
        sub = await stripe.subscriptions.retrieve(subId);
      } catch (e) {
        if (typeof subOrId === "string") throw e;
        sub = subOrId; // couldn't re-read — fall back to the event's snapshot
      }

      const uid = sub.metadata?.firebaseUID;
      if (!uid) return null;

      // Cancelling a subscription during account deletion fires this webhook
      // for an account that no longer exists. Writing would re-create a ghost
      // users/{uid} document, so leave deleted accounts alone.
      if (!(await authUserExists(uid))) return { sub, uid };

      const priceId = sub.items?.data?.[0]?.price?.id;
      const active = sub.status === "active" || sub.status === "trialing";
      const tier = active ? (TIER_BY_PRICE[priceId] || "free") : "free";

      const ref = adminDb.collection("users").doc(uid);
      await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        // Deletion in flight: the app cancels billing FIRST and erases the
        // user doc a moment later, while the Auth user still exists — so the
        // check above can pass just as the doc is being removed. A cancel we
        // tagged account_deleted must never re-create it.
        if (!snap.exists && sub.cancellation_details?.comment === "account_deleted") return;
        const cur = snap.data() || {};
        if (cur.stripeSubscriptionId === sub.id
            && cur.subscriptionUpdatedAt && cur.subscriptionUpdatedAt > startedAtIso) return;
        if (cur.stripeSubscriptionId && cur.stripeSubscriptionId !== sub.id
            && isPaidTier(cur.stripeTier) && !active) return;
        tx.set(ref, {
          stripeTier: tier,
          subscriptionStatus: sub.status,
          stripeSubscriptionId: sub.id,
          stripePriceId: priceId || null,
          currentPeriodEnd: periodEndIso(sub),
          subscriptionUpdatedAt: startedAtIso,
        }, { merge: true });
      });
      return { sub, uid };
    };

    // "Your subscription was canceled" email. Sent when a cancellation is
    // SCHEDULED (portal cancel → keeps access until period end) or when a
    // subscription is canceled IMMEDIATELY. Not sent when a scheduled
    // cancellation later actually ends (they were already told), or for
    // payment-failure cancellations (Stripe's own failed-payment emails cover
    // those). Never throws — see sendEmail().
    const notifyCancellation = async (event, sub, uid) => {
      try {
        const kind = cancellationKind(event, sub);
        if (!kind) return;

        if (!(await claimEmail(adminDb, `cancel-${event.id}`))) return; // already sent

        const user = await admin.auth().getUser(uid).catch(() => null);
        if (!user?.email) { console.warn("notifyCancellation: no email for", uid); return; }

        const plan = PLAN_NAME[TIER_BY_PRICE[sub.items?.data?.[0]?.price?.id]] || "WIMC";
        const endDateIso = sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : periodEndIso(sub);
        const mail = buildCancellationEmail({
          name: user.displayName, plan, endDateIso, immediate: kind === "immediate",
        });
        await sendEmail({ to: user.email, ...mail });
        console.log(`notifyCancellation: sent ${kind} email for ${event.id}`);
      } catch (err) {
        console.error("notifyCancellation failed (non-fatal):", err);
      }
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
          const result = await applySubscription(event.data.object);
          if (result && event.type !== "customer.subscription.created") {
            await notifyCancellation(event, result.sub, result.uid);
          }
          break;
        }
        // Belt-and-suspenders: checkout.session.completed can fire and read
        // the subscription's status a moment BEFORE Stripe has finished
        // marking it active internally. invoice.paid fires once the first
        // invoice is actually paid, so it's another trigger to re-read and
        // re-apply the current subscription state. Must also be in the
        // endpoint's selected events in the Stripe Dashboard.
        //
        // The invoice's subscription id lives in different places depending on
        // the Stripe API version: `invoice.subscription` on older versions, and
        // `invoice.parent.subscription_details.subscription` on newer ones.
        // This handler only read the old spot, so on this account it silently
        // did nothing — the safety net below was dead until now.
        case "invoice.paid": {
          const invoice = event.data.object;
          const subId =
            invoice.subscription ||
            invoice.parent?.subscription_details?.subscription ||
            invoice.lines?.data?.[0]?.parent?.subscription_item_details?.subscription ||
            invoice.lines?.data?.[0]?.subscription;
          if (subId) await applySubscription(subId);
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

// ── Cancel Stripe billing before an immediate account deletion ────────────────
// The client calls this (signed in, with the user's ID token) BEFORE it erases
// their data, because it needs the users/{uid} doc to find the subscription.
// The scheduled-deletion path does the same thing inside
// finalizeScheduledDeletions. A failure returns 500 and the client aborts the
// deletion — better to make the user retry than leave them billed with no
// account.
exports.cancelSubscriptionForDeletion = functions
  .runWith({ secrets: ["STRIPE_SECRET_KEY"] })
  .https.onRequest(async (req, res) => {
    setCORS(res);
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST")    { res.status(405).send("Method Not Allowed"); return; }

    const uid = await verifyUser(req);
    if (!uid) { res.status(401).json({ error: "Please sign in." }); return; }

    try {
      const cancelled = await cancelStripeSubscriptionsForUser(getStripe(), getAdminDb(), uid);
      res.json({ cancelled });
    } catch (err) {
      console.error("cancelSubscriptionForDeletion failed for", uid, err);
      res.status(500).json({ error: "Could not cancel your subscription." });
    }
  });

// ── Effective tier merge (Stripe web + Apple IAP on the same account) ─────────
//
// Real Apple In-App Purchase (RevenueCat) shipped alongside the existing
// Stripe checkout — the SAME Firebase account can now hold either a Stripe
// subscription (web), an Apple subscription (iOS), or both (e.g. a user
// subscribed on the web, then also has an active trial on their phone).
// `tier` remains the single field every client reads (TierContext.js) and
// stays untouched by that file — this trigger is the only thing that writes
// it, computed as whichever source currently grants more.
const TIER_RANK = { free: 0, pro: 1, pro_ai: 2 };
function higherTier(a, b) {
  return (TIER_RANK[a] || 0) >= (TIER_RANK[b] || 0) ? (a || "free") : (b || "free");
}

exports.syncEffectiveTier = functions.firestore
  .document("users/{uid}")
  .onWrite(async (change, context) => {
    if (!change.after.exists) return null;
    const data = change.after.data();

    // Legacy compat: accounts that subscribed via Stripe before Apple IAP
    // existed have `tier` set but no `stripeTier` yet (the old webhook wrote
    // `tier` directly). Treat that old `tier` as the Stripe value once, so an
    // existing paying subscriber is never momentarily read as "free" before
    // their next Stripe webhook event happens to fire.
    const stripeTier = data.stripeTier !== undefined
      ? data.stripeTier
      : (data.tier || "free");
    const appleTier = data.appleTier || "free";

    const effective = higherTier(stripeTier, appleTier);

    // Guard against re-triggering itself: only write if something actually
    // changed (either the effective tier, or backfilling a missing stripeTier).
    const needsStripeTierBackfill = data.stripeTier === undefined;
    if (data.tier === effective && !needsStripeTierBackfill) return null;

    const patch = { tier: effective };
    if (needsStripeTierBackfill) patch.stripeTier = stripeTier;

    // update(), NOT set({merge:true}): this trigger runs a moment AFTER the
    // write that fired it, and by then the user may have deleted their account.
    // A merge-set would quietly re-create a stub users/{uid} doc holding just
    // { tier, stripeTier } (seen live 2026-09-19 after a test account
    // deletion). update() fails with NOT_FOUND on a missing doc — which is
    // exactly the right outcome, so swallow it.
    try {
      await change.after.ref.update(patch);
    } catch (e) {
      if (e.code === 5 || /NOT_FOUND/.test(e.message || "")) return null;
      throw e;
    }
    return null;
  });

// ── RevenueCat Webhook (Apple IAP → effective tier via syncEffectiveTier) ─────
//
// RevenueCat's dashboard is configured to POST here (Project Settings →
// Integrations → Webhooks) on every entitlement change. Auth is a shared
// secret in the "Authorization header value" field (set in RevenueCat's
// webhook config to match REVENUECAT_WEBHOOK_SECRET verbatim — RevenueCat
// sends that field's value as-is, with no "Bearer " prefix added) —
// RevenueCat doesn't sign payloads the way Stripe does, so this shared-secret
// check is what stands in for that.
//
// RevenueCat's `app_user_id` is set client-side (src/utils/iap.js) to the
// signed-in Firebase uid, so events map straight back to users/{uid} with no
// separate customer-id lookup step (unlike Stripe's getOrCreateCustomer).
const ENTITLEMENT_TO_TIER = {
  pro: "pro",
  pro_ai: "pro_ai",
};

exports.revenuecatWebhook = functions
  .runWith({ secrets: ["REVENUECAT_WEBHOOK_SECRET"] })
  .https.onRequest(async (req, res) => {
    if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }

    const auth = req.get("Authorization") || "";
    if (auth !== process.env.REVENUECAT_WEBHOOK_SECRET) {
      console.error("revenuecatWebhook: bad Authorization header");
      res.status(401).send("Unauthorized");
      return;
    }

    try {
      const event = req.body?.event || {};
      const uid = event.app_user_id;
      if (!uid) { res.json({ received: true }); return; } // anonymous/test event

      // entitlements active as of this event → highest tier among them.
      // RevenueCat sends the full current entitlement map on every event type
      // (INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, BILLING_ISSUE,
      // etc.) so re-deriving from scratch each time is simpler and safer than
      // trying to special-case each event type.
      const activeEntitlements = Object.keys(event.entitlement_ids
        ? Object.fromEntries((event.entitlement_ids || []).map((id) => [id, true]))
        : {});
      let appleTier = "free";
      for (const id of activeEntitlements) {
        appleTier = higherTier(appleTier, ENTITLEMENT_TO_TIER[id] || "free");
      }

      // Apple keeps renewing a subscription the user never cancelled, even
      // after they delete their WIMC account. Those events must not re-create
      // a deleted user's document.
      if (!(await authUserExists(uid))) {
        console.log("revenuecatWebhook: ignoring event for a deleted account");
        res.json({ received: true });
        return;
      }

      const adminDb = getAdminDb();
      await adminDb.collection("users").doc(uid).set({
        appleTier,
        appleSubscriptionStatus: event.type || null,
        appleProductId: event.product_id || null,
        appleExpiresAt: event.expiration_at_ms
          ? new Date(event.expiration_at_ms).toISOString()
          : null,
        appleSubscriptionUpdatedAt: new Date().toISOString(),
      }, { merge: true });

      res.json({ received: true });
    } catch (err) {
      console.error("revenuecatWebhook handler error:", err);
      res.status(500).send("Webhook handler error");
    }
  });

// ── Clear server-only per-user counters when an account is deleted ────────────
// aiUsage/{uid} and aiHelpUsage/{uid} hold a user's daily AI request counts.
// They live outside users/{uid} and the Firestore rules deny clients, so the
// in-app "delete now" path could never remove them — only the scheduled
// finalizer did. Hooking the deletion of the Auth user itself covers EVERY
// path (immediate delete, scheduled delete, or a manual delete in the console).
// Deleting a document that doesn't exist is a no-op, so this is idempotent and
// safe to overlap with the finalizer's own cleanup.
const USER_COUNTER_COLLECTIONS = ["aiUsage", "aiHelpUsage"];

async function clearUserCounters(adminDb, uid) {
  await Promise.all(USER_COUNTER_COLLECTIONS.map((c) => adminDb.collection(c).doc(uid).delete()));
}

// Everything that can outlive the account, swept once the Auth user is gone.
//
// Besides the counters, this removes the WHOLE users/{uid} tree (the profile
// doc and every subcollection, e.g. syncdata). Why: in the instant between the
// client deleting a user's synced data and their login being deleted, the
// still-mounted panels notice their data vanished, reset to defaults, and the
// app's sync layer immediately writes those defaults back — leaving a handful
// of stray syncdata docs behind (seen live 2026-09-19 on a heavy account:
// donateItems, wimc_travel_pack_v2, wimc_video_meta, wimc_week_plan_v1). This
// runs AFTER the login is deleted, so it catches them. Each step is
// independent and best-effort: one failing never skips the other.
async function sweepDeletedUserData(adminDb, uid) {
  const result = { counters: false, tree: false };
  try {
    await clearUserCounters(adminDb, uid);
    result.counters = true;
  } catch (e) {
    console.error(`sweepDeletedUserData(${uid}) counters failed:`, e);
  }
  try {
    await adminDb.recursiveDelete(adminDb.collection("users").doc(uid));
    result.tree = true;
  } catch (e) {
    console.error(`sweepDeletedUserData(${uid}) user tree failed:`, e);
  }
  return result;
}

exports.clearCountersOnUserDelete = functions.auth.user().onDelete(async (user) => {
  await sweepDeletedUserData(getAdminDb(), user.uid);
  return null;
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

// Every base closet-card tag + every sub-section slug across both unisex
// profiles (adult/kid). Kids/Pet closets prefix these with a per-profile id
// (kid-{id}-… / pet-{id}-…), making the resulting tag unique to one user —
// safe to fetch & delete by tag. KEEP IN SYNC with
// wimc-react-app/src/utils/closetSubsections.js (BASE_SLUGS + ALL_SUBSECTION_SLUGS).
const KID_PET_SECTION_KEYS = [
  // base cards
  "dresses-skirts", "dress-shirts-suits", "shoes-sneakers",
  "pants-jeans", "tops", "bags-accessories", "jackets-coats", "blazers",
  // sub-section slugs (union of both profiles)
  "skirts", "suits", "sneakers", "heels", "sandals-slides", "jeans",
  "t-shirts", "sweaters", "dress-shirts", "coats",
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
        // Tags are scoped per-user (see CloudinaryAPI.js's scopedTag on the
        // client) — must match that `${uid}-...` prefix here too, or this
        // cleanup silently finds nothing (or, before that client fix
        // shipped, could have matched another user's identically-named tag).
        const tag = `${uid}-${prof._prefix}-${prof.id}-${sec}`;
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
  .runWith({ secrets: ["CLOUDINARY_API_SECRET", "STRIPE_SECRET_KEY"] })
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

        // Stop Stripe billing FIRST, while the user doc (which holds the
        // subscription id) still exists. If this throws, the account is NOT
        // erased — it stays pending and retries tomorrow — so nobody is left
        // being charged with no account to show for it.
        const cancelledSubs = await cancelStripeSubscriptionsForUser(getStripe(), adminDb, uid);
        if (cancelledSubs) console.log(`finalizeScheduledDeletions: cancelled ${cancelledSubs} Stripe subscription(s) for ${uid}`);

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

// ── Contact form ─────────────────────────────────────────────────────────────
// Public (unauthenticated — visitors without an account need to reach
// support too), so it's rate-limited per IP instead of per uid, plus a
// honeypot field to silently drop simple bots. Sends via Resend's HTTP API
// (no SDK needed — it's one POST) so the visitor's own mail client/OS default
// handler is never involved.
const CONTACT_FORM_DAILY_LIMIT_PER_IP = 8;
const CONTACT_SUPPORT_EMAIL = "wimcsupport@gingerfaith.com";

function hashIp(ip) {
  return crypto.createHash("sha256").update(String(ip || "unknown")).digest("hex");
}

exports.submitContactForm = functions
  .runWith({ secrets: ["RESEND_API_KEY"] })
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

    const { name, email, subject, message, company } = req.body || {};

    // Honeypot — a real visitor never fills a field hidden via CSS. Bots that
    // blindly fill every field trip this; report success so they don't retry.
    if (company) {
      res.status(200).json({ ok: true });
      return;
    }

    if (!name || !email || !message) {
      res.status(400).json({ error: "Name, email, and message are required." });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: "Please enter a valid email address." });
      return;
    }
    if (String(message).length > 5000) {
      res.status(400).json({ error: "Message is too long (5000 characters max)." });
      return;
    }

    // Per-IP daily cap so an unauthenticated form can't be used to spam the
    // support inbox or burn through the email provider's monthly quota.
    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || "unknown";
    const ipKey = hashIp(ip);
    const adminDb = getAdminDb();
    const usageRef = adminDb.collection("contactFormUsage").doc(ipKey);
    const today = new Date().toISOString().slice(0, 10);

    try {
      const allowed = await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(usageRef);
        const data = snap.exists ? snap.data() : {};
        const count = data.date === today ? (data.count || 0) : 0;
        if (count >= CONTACT_FORM_DAILY_LIMIT_PER_IP) return false;
        tx.set(usageRef, { date: today, count: count + 1, updatedAt: Date.now() });
        return true;
      });
      if (!allowed) {
        res.status(429).json({ error: "Too many messages sent. Please try again tomorrow." });
        return;
      }
    } catch (e) {
      console.error("submitContactForm: rate-limit check failed:", e);
      res.status(500).json({ error: "Something went wrong. Please try again." });
      return;
    }

    if (!process.env.RESEND_API_KEY) {
      console.error("submitContactForm: RESEND_API_KEY is not bound");
      res.status(500).json({ error: "Server misconfiguration: email not configured" });
      return;
    }

    try {
      const upstream = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          // Resend requires the "from" address to be on a domain you've
          // verified with them — this can't be the visitor's own address.
          // Their real address goes in reply_to so hitting Reply in the
          // inbox goes straight back to them.
          from: "WIMC Contact Form <contact@gingerfaith.com>",
          to: [CONTACT_SUPPORT_EMAIL],
          reply_to: email,
          subject: subject ? `[WIMC Contact] ${subject}` : "[WIMC Contact] New message",
          text: `From: ${name} <${email}>\n\n${message}`,
        }),
      });
      if (!upstream.ok) {
        const errBody = await upstream.text();
        console.error("submitContactForm: Resend error:", upstream.status, errBody);
        res.status(502).json({ error: "Failed to send. Please try again or email us directly." });
        return;
      }
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error("submitContactForm error:", err);
      res.status(500).json({ error: "Failed to send. Please try again or email us directly." });
    }
  });
