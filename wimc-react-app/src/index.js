import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";
import * as Sentry from "@sentry/react";
import App from "./components/App/App";
import { register as registerSW } from "./serviceWorkerRegistration";
import { initSentry, logAppEvent } from "./utils/analytics";
import { hasAnalyticsConsent } from "./utils/consent";
import { initFirebaseAnalytics } from "./firebase";
import "./index.css";

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
  onUpdate: () => {
    // A new version of the app has been downloaded. The SW activates immediately
    // (skipWaiting is set), so the next navigation will load fresh content.
    // No action needed — new pages are served automatically.
  },
  onSuccess: () => {
    // App shell cached successfully — app is ready for offline use.
  },
});
