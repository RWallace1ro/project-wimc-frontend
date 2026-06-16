import { auth } from "../firebase";

/**
 * billing — client helpers for Stripe Checkout & the customer billing portal.
 *
 * Both call auth-gated Firebase Functions with the user's Firebase ID token,
 * then redirect the browser to the Stripe-hosted URL the function returns.
 */

const CHECKOUT_URL = process.env.REACT_APP_STRIPE_CHECKOUT_URL;
const PORTAL_URL   = process.env.REACT_APP_STRIPE_PORTAL_URL;

async function authHeaders() {
  const headers = { "Content-Type": "application/json" };
  try {
    const token = await auth.currentUser?.getIdToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch { /* not signed in — server will 401 */ }
  return headers;
}

/**
 * Start Stripe Checkout for a given price ID. Redirects to Stripe on success.
 * Throws with a user-friendly message on failure so the caller can surface it.
 */
export async function startCheckout(priceId) {
  if (!CHECKOUT_URL) throw new Error("Checkout is not configured yet.");
  if (!auth.currentUser) throw new Error("Please sign in to subscribe.");

  const res = await fetch(CHECKOUT_URL, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ priceId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) {
    throw new Error(data.error || "Could not start checkout. Please try again.");
  }
  window.location.assign(data.url);
}

/**
 * Open the Stripe customer billing portal (manage/cancel subscription).
 */
export async function openBillingPortal() {
  if (!PORTAL_URL) throw new Error("Billing portal is not configured yet.");
  if (!auth.currentUser) throw new Error("Please sign in.");

  const res = await fetch(PORTAL_URL, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) {
    throw new Error(data.error || "Could not open the billing portal.");
  }
  window.location.assign(data.url);
}
