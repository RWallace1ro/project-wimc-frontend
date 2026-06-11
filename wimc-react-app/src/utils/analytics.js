/**
 * analytics — Sentry error monitoring + Firebase Analytics, both gated behind
 * user consent (see utils/consent). No non-essential tracking fires until the
 * user explicitly accepts optional cookies — GDPR-compliant.
 *
 * Public API:
 *   initSentry()          — start Sentry (idempotent)
 *   stopSentry()          — stop Sentry for this session
 *   applyAnalytics(prefs) — start or stop both Sentry + Firebase based on prefs
 *   logAppEvent(name, params) — fire a Firebase Analytics event (no-op if not consented)
 */

import * as Sentry from "@sentry/react";
import { logEvent } from "firebase/analytics";
import { initFirebaseAnalytics, getFirebaseAnalytics } from "../firebase";

let started = false;

export function initSentry() {
  if (started) return;
  started = true;

  Sentry.init({
    dsn: process.env.REACT_APP_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    // Capture 100% of errors, 10% of performance traces (adjust after launch)
    tracesSampleRate: 0.1,
    // Ignore noisy browser-extension and network errors
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "Non-Error promise rejection captured",
      /^Network request failed/,
      /^Failed to fetch/,
    ],
    // Only send events from your own domain, not injected scripts
    allowUrls: [/https?:\/\/(.*\.)?rwallace1ro\.github\.io/],
    beforeSend(event) {
      // Never send events in development
      if (process.env.NODE_ENV !== "production") return null;
      return event;
    },
  });
}

/**
 * Stop sending analytics within the current session (used when the user
 * withdraws consent). Flushes/closes the Sentry client so nothing further is
 * transmitted without a page reload.
 */
/** Start or stop all analytics to match a saved preferences object. */
export function applyAnalytics(prefs) {
  if (prefs && prefs.analytics) {
    initSentry();
    initFirebaseAnalytics(); // consent granted — start Firebase Analytics
  } else {
    stopSentry();
    // Firebase Analytics cannot be fully stopped once initialized in the same
    // session, but we stop firing new events (logAppEvent no-ops when the
    // analytics instance is null). A page reload ensures a clean state.
  }
}

/**
 * Fire a Firebase Analytics event — silently no-ops if analytics has not been
 * initialized (i.e. user hasn't consented or browser doesn't support it).
 *
 * @param {string} eventName  - Firebase event name (use snake_case)
 * @param {object} [params]   - Optional key/value parameters
 */
export function logAppEvent(eventName, params = {}) {
  try {
    const analyticsInstance = getFirebaseAnalytics();
    if (analyticsInstance) {
      logEvent(analyticsInstance, eventName, params);
    }
  } catch {
    // Never let analytics errors surface to the user
  }
}

export function stopSentry() {
  if (!started) return;
  started = false;
  try {
    // Prefer the active client's close(); fall back to the top-level helper.
    const client =
      typeof Sentry.getClient === "function" ? Sentry.getClient() : null;
    if (client && typeof client.close === "function") {
      client.close();
    } else if (typeof Sentry.close === "function") {
      Sentry.close();
    }
  } catch {
    /* best-effort */
  }
}
