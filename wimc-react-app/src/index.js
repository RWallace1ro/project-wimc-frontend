import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";
import * as Sentry from "@sentry/react";
import App from "./components/App/App";
import { unregister as unregisterSW } from "./serviceWorkerRegistration";
import { initSentry } from "./utils/analytics";
import { hasAnalyticsConsent } from "./utils/consent";
import "./index.css";

// ── Sentry error monitoring (consent-gated) ──────────────────────────────────
// Optional analytics. Per GDPR, Sentry is only initialized once the user has
// explicitly accepted optional cookies. If they haven't chosen yet, or chose
// "essential only", nothing is sent. The CookieConsent banner calls initSentry()
// at the moment the user accepts, so it also starts within the same session.
if (hasAnalyticsConsent()) {
  initSentry();
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

// Unregister any lingering/old service worker so every new deploy takes effect
// immediately on the next load (no stale cached pages, no manual cache clearing).
unregisterSW();
