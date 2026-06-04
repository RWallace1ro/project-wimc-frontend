/**
 * WIMC Firebase Cloud Functions
 *
 * anthropicProxy  — Secure server-side proxy for Anthropic API calls.
 * cloudinarySign  — Generates a signed upload signature for Cloudinary.
 *
 * Secrets:
 *   ANTHROPIC_API_KEY     — firebase functions:secrets:set ANTHROPIC_API_KEY
 *   CLOUDINARY_API_SECRET — firebase functions:secrets:set CLOUDINARY_API_SECRET
 */

const functions = require("firebase-functions");
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
// single account from running up the Anthropic bill.
const AI_DAILY_LIMIT = 50;

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
  const ref = adminDb.collection("aiUsage").doc(uid);
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : {};
    const count = data.date === today ? (data.count || 0) : 0;
    if (count >= AI_DAILY_LIMIT) {
      return { allowed: false, count };
    }
    tx.set(ref, { date: today, count: count + 1, updatedAt: Date.now() });
    return { allowed: true, count: count + 1 };
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

    // ── Per-user daily rate limit ─────────────────────────────────────────────
    try {
      const { allowed, count } = await checkAndIncrementUsage(uid);
      if (!allowed) {
        res.status(429).json({
          error: `You've reached today's limit of ${AI_DAILY_LIMIT} AI requests. Please try again tomorrow.`,
        });
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
        body: JSON.stringify({ ...req.body, stream: false }),
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
