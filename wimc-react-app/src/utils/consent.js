/**
 * consent — per-category cookie / local-storage consent state (GDPR).
 *
 * Preferences are stored as JSON in localStorage under wimc_cookie_prefs:
 *   { essential, functional, analytics, marketing }
 *
 * Categories
 *   essential  — always ON (required to run the app: auth session, closet data).
 *   functional — remembers preferences (theme/background, tabs).
 *   analytics  — Sentry error/performance monitoring.
 *   marketing  — reserved for future use; WIMC currently sets no marketing cookies.
 *
 * A legacy v1 value ("accepted"/"essential") under wimc_cookie_consent is
 * migrated on read so returning users keep their prior choice.
 */

export const CONSENT_KEY = "wimc_cookie_prefs";
export const LEGACY_KEY = "wimc_cookie_consent";
export const CONSENT_EVENT = "wimc-consent-changed";
export const CONSENT_REOPEN_EVENT = "wimc-consent-reopen";

// Category metadata used to render the preferences modal.
export const CATEGORIES = [
  {
    id: "essential",
    label: "Strictly necessary",
    locked: true,
    desc: "Required for the app to work — keeps you signed in and saves your closet. Always on.",
  },
  {
    id: "functional",
    label: "Functional",
    locked: false,
    desc: "Remembers your preferences such as background/theme, selected closet, and tabs.",
  },
  {
    id: "analytics",
    label: "Analytics",
    locked: false,
    desc: "Helps us detect and fix errors and improve performance (Sentry).",
  },
  {
    id: "marketing",
    label: "Marketing",
    locked: false,
    desc: "Reserved for future use. WIMC does not currently set any marketing cookies.",
  },
];

// Everything off except the mandatory essential layer.
export const DEFAULT_PREFS = {
  essential: true,
  functional: false,
  analytics: false,
  marketing: false,
};

// Everything on.
export const ALL_PREFS = {
  essential: true,
  functional: true,
  analytics: true,
  marketing: true,
};

/**
 * Returns the saved preferences object, or null if the user hasn't chosen yet.
 * Migrates the legacy v1 string value when present.
 */
export function getPreferences() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_PREFS, ...parsed, essential: true };
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy === "accepted") return { ...ALL_PREFS };
    if (legacy === "essential") return { ...DEFAULT_PREFS };
  } catch {
    /* storage blocked */
  }
  return null;
}

/** Persist a full/partial preferences object (essential is forced on). */
export function savePreferences(prefs) {
  const full = { ...DEFAULT_PREFS, ...prefs, essential: true };
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(full));
    localStorage.removeItem(LEGACY_KEY); // supersede the old value
  } catch {
    /* storage blocked — modal/banner will simply reappear next load */
  }
  try {
    window.dispatchEvent(new Event(CONSENT_EVENT));
  } catch {
    /* no-op */
  }
  return full;
}

/** True once the user has made any choice (so the banner can hide). */
export function hasChosen() {
  return getPreferences() !== null;
}

/** True only when the user opted in to optional analytics. */
export function hasAnalyticsConsent() {
  const p = getPreferences();
  return !!(p && p.analytics);
}

/** Open the preferences modal so the user can change or withdraw consent. */
export function openConsentSettings() {
  try {
    window.dispatchEvent(new Event(CONSENT_REOPEN_EVENT));
  } catch {
    /* no-op */
  }
}
