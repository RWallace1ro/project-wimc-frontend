import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";
import * as Sentry from "@sentry/react";
import App from "./components/App/App";
import { register as registerSW } from "./serviceWorkerRegistration";
import { initSentry, logAppEvent } from "./utils/analytics";
import { hasAnalyticsConsent } from "./utils/consent";
import { initFirebaseAnalytics, auth } from "./firebase";
import "./index.css";

// QA helper — lets a signed-in tester grab their own Firebase ID token from
// the browser console (e.g. to manually probe Firestore security rules via
// the REST API), since the SDK's real internals aren't reachable from a
// plain console otherwise. Only ever returns the CURRENT user's own token —
// same thing they already implicitly have via their live session — so this
// exposes nothing a signed-in user couldn't already do.
window.wimcGetIdToken = () => auth.currentUser?.getIdToken();

// ── Sentry error monitoring (consent-gated) ──────────────────────────────────
// Optional analytics. Per GDPR, Sentry is only initialized once the user has
// explicitly accepted optional cookies. If they haven't chosen yet, or chose
// "essential only", nothing is sent. The CookieConsent banner calls initSentry()
// at the moment the user accepts, so it also starts within the same session.
if (hasAnalyticsConsent()) {
  initSentry();
  initFirebaseAnalytics().then(() => {
    // Fire a page_view on initial load so Firebase Analytics captures the session
    logAppEvent("page_view", { page_location: window.location.href });
  });
}

// ── App ──────────────────────────────────────────────────────────────────────
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <Sentry.ErrorBoundary
      fallback={
        <div style={{ padding: 40, textAlign: "center" }}>
          <h2>Something went wrong.</h2>
          <p>We've been notified and are working on a fix.</p>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      }
    >
      <Router basename="/project-wimc-frontend">
        <App />
      </Router>
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);

// ── Service Worker (PWA / offline support) ───────────────────────────────────
// Registers a service worker that caches static assets for offline use.
// Uses network-first for HTML (so deploys always show fresh content) and
// cache-first for hashed JS/CSS (content-hash names auto-invalidate on deploy).
registerSW({
  onUpdate: (registration) => {
    // A new version has been downloaded and (per the SW's own skipWaiting())
    // is already activating in the background. Desktop browsers sometimes
    // show their own native "reload to update" prompt, but iOS Safari has no
    // such thing for installed/standalone PWAs — without this, phone users
    // had no way to get the update short of deleting and reinstalling the
    // app. UpdateBanner (mounted in App.js) listens for this and shows an
    // explicit "Refresh" control.
    console.log(`[WIMC DOOR DEBUG] SW onUpdate fired, t=${performance.now().toFixed(0)}ms`);
    window.dispatchEvent(new CustomEvent("wimc-sw-update", { detail: registration }));
  },
  onSuccess: () => {
    // App shell cached successfully — app is ready for offline use.
  },
});

// registerSW() only checks for a new version on the initial page load. An
// already-open installed PWA that's just resumed from the home screen (the
// common case on iOS — the app is suspended, not reloaded) never re-checks
// on its own. Re-check whenever the app becomes visible again, and on a
// slow background interval as a fallback, so an update is noticed without
// requiring the user to force-quit/relaunch.
if ("serviceWorker" in navigator) {
  const checkForUpdate = () => {
    // TEMP DIAGNOSTIC — remove once the door-animation snap bug is
    // root-caused.
    console.log(`[WIMC DOOR DEBUG] checkForUpdate running, t=${performance.now().toFixed(0)}ms`);
    navigator.serviceWorker.getRegistration().then((reg) => reg && reg.update());
  };
  document.addEventListener("visibilitychange", () => {
    console.log(`[WIMC DOOR DEBUG] visibilitychange -> ${document.visibilityState}, t=${performance.now().toFixed(0)}ms`);
    if (document.visibilityState === "visible") checkForUpdate();
  });
  // An hourly interval meant this never fired during a normal active testing
  // session — someone who deploys and then keeps the same tab open/focused
  // the whole time (no tab-switch, no re-visibility event) saw no banner at
  // all until they manually refreshed. 3 minutes still costs almost nothing
  // (a single lightweight byte-diff check against the SW script) but makes
  // the banner show up promptly for anyone actively using the app too, not
  // just people who happen to switch away and back.
  setInterval(checkForUpdate, 3 * 60 * 1000);
}
