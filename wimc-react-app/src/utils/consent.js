/**
 * consent — cookie / local-storage consent state (GDPR).
 *
 * Stored choices in localStorage under wimc_cookie_consent:
 *   "accepted"  — user allows optional analytics (Sentry error/performance).
 *   "essential" — user allows only the storage required to run the app.
 *   (absent)    — no choice yet → show the banner, treat analytics as OFF.
 *
 * Essential storage (auth session, closet data saved to localStorage/Firestore)
 * is required for the app to function and is not gated by this consent — only
 * the optional analytics layer is.
 */

export const CONSENT_KEY = "wimc_cookie_consent";
export const CONSENT_EVENT = "wimc-consent-changed";
export const CONSENT_REOPEN_EVENT = "wimc-consent-reopen";

/** Re-open the consent banner so the user can change or withdraw their choice. */
export function openConsentSettings() {
  try {
    window.dispatchEvent(new Event(CONSENT_REOPEN_EVENT));
  } catch {
    /* no-op */
  }
}

export function getConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY);
  } catch {
    return null;
  }
}

export function setConsent(value) {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    /* storage blocked — banner will simply reappear next load */
  }
  try {
    window.dispatchEvent(new Event(CONSENT_EVENT));
  } catch {
    /* no-op */
  }
}

/** True only when the user explicitly opted in to optional analytics. */
export function hasAnalyticsConsent() {
  return getConsent() === "accepted";
}

/** True once the user has made any choice (so the banner can hide). */
export function hasChosen() {
  const v = getConsent();
  return v === "accepted" || v === "essential";
}
