import { auth } from "../firebase";

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
 */
export async function aiProxyFetch(body, { signal } = {}) {
  const headers = { "Content-Type": "application/json" };
  try {
    const token = await auth.currentUser?.getIdToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    // No token (signed out) — the server will reject with 401.
  }
  const init = {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  };
  if (signal) init.signal = signal;
  return fetch(process.env.REACT_APP_ANTHROPIC_PROXY_URL, init);
}
