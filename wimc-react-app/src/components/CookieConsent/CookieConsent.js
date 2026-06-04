import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { setConsent, hasChosen } from "../../utils/consent";
import { initSentry } from "../../utils/analytics";
import "./CookieConsent.css";

/**
 * CookieConsent — GDPR cookie/storage consent banner.
 *
 * Shows once on first visit (until the user makes a choice). "Accept all" opts
 * into optional analytics and starts Sentry immediately for the session;
 * "Essential only" keeps analytics off. Either choice hides the banner and is
 * remembered in localStorage.
 */
function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Defer to after first paint so it never blocks initial render.
    if (!hasChosen()) setVisible(true);
  }, []);

  const acceptAll = () => {
    setConsent("accepted");
    initSentry(); // begin analytics this session, no reload needed
    setVisible(false);
  };

  const essentialOnly = () => {
    setConsent("essential");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="cookie-consent" role="dialog" aria-live="polite" aria-label="Cookie consent">
      <div className="cookie-consent__text">
        <strong>We value your privacy.</strong> WIMC uses essential storage to keep
        you signed in and save your closet. With your permission we also use
        optional analytics (Sentry) to detect and fix errors. See our{" "}
        <Link to="/privacy-policy" className="cookie-consent__link">
          Privacy Policy
        </Link>
        .
      </div>
      <div className="cookie-consent__actions">
        <button
          type="button"
          className="cookie-consent__btn cookie-consent__btn--ghost"
          onClick={essentialOnly}
        >
          Essential only
        </button>
        <button
          type="button"
          className="cookie-consent__btn cookie-consent__btn--primary"
          onClick={acceptAll}
        >
          Accept all
        </button>
      </div>
    </div>
  );
}

export default CookieConsent;
