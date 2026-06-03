import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";
import * as Sentry from "@sentry/react";
import App from "./components/App/App";
import { unregister as unregisterSW } from "./serviceWorkerRegistration";
import "./index.css";

// ── Sentry error monitoring ──────────────────────────────────────────────────
// Only active in production so local dev errors don't pollute your dashboard.
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
