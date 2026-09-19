import { auth } from "../firebase";

/**
 * billing — client helpers for Stripe Checkout & the customer billing portal.
 *
 * Both call auth-gated Firebase Functions with the user's Firebase ID token,
 * then redirect the browser to the Stripe-hosted URL the function returns.
 */

const CHECKOUT_URL = process.env.REACT_APP_STRIPE_CHECKOUT_URL;
const PORTAL_URL   = process.env.REACT_APP_STRIPE_PORTAL_URL;
const CANCEL_ON_DELETE_URL = process.env.REACT_APP_CANCEL_SUB_URL;

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
 * Cancel the signed-in user's Stripe subscription(s) — called right before an
 * IMMEDIATE account deletion. Deleting a WIMC account does not stop Stripe
 * billing by itself, so without this the user keeps being charged. Resolves
 * with how many subscriptions were cancelled (0 is fine — e.g. a Free user);
 * throws if the server couldn't do it, in which case the caller must NOT
 * proceed with the deletion.
 *
 * (Scheduled deletions don't call this — the daily cleanup job cancels
 * server-side when the 14-day grace period ends.)
 */
export async function cancelSubscriptionsForDeletion() {
  if (!CANCEL_ON_DELETE_URL) throw new Error("Subscription cancellation is not configured.");
  if (!auth.currentUser) throw new Error("Please sign in.");

  const res = await fetch(CANCEL_ON_DELETE_URL, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not cancel your subscription.");
  return data.cancelled || 0;
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
