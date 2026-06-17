import { auth } from "../firebase";
import { logAppEvent } from "./analytics";

/**
 * POST to the Anthropic proxy Firebase Function with the current user's
 * Firebase ID token attached (required for per-user rate limiting).
 *
 * Returns the raw fetch Response so callers can keep using res.ok /
 * res.status / res.json() exactly as before.
 *
 * @param {object} body            - JSON body for the proxy (model, messages, …)
 * @param {object} [opts]
 * @param {AbortSignal} [opts.signal]
 * @param {string}  [opts.feature] - Analytics label e.g. "ai_stylist" (optional)
 */
export async function aiProxyFetch(body, { signal, feature } = {}) {
  logAppEvent("ai_feature_used", { feature: feature || "unknown" });
  const headers = { "Content-Type": "application/json" };
  try {
    const token = await auth.currentUser?.getIdToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    // No token (signed out) — the server will reject with 401.
  }
  // Send the feature label so the server can apply feature-specific rate limits
  // (e.g. the WIMC Assistant help bot has its own generous cap). The server
  // strips this field before forwarding to Anthropic.
  const init = {
    method: "POST",
    headers,
    body: JSON.stringify({ ...body, feature }),
  };
  if (signal) init.signal = signal;
  return fetch(process.env.REACT_APP_ANTHROPIC_PROXY_URL, init);
}
