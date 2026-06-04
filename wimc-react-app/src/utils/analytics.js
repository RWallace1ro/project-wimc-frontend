/**
 * analytics — Sentry error/performance monitoring, gated behind user consent.
 *
 * initSentry() is idempotent and is only ever called once the user has opted in
 * to optional analytics (see utils/consent). This keeps WIMC GDPR-compliant:
 * no non-essential tracking fires until the user accepts.
 */

import * as Sentry from "@sentry/react";

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
