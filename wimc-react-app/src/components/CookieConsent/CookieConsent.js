import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  savePreferences,
  hasChosen,
  ALL_PREFS,
  DEFAULT_PREFS,
  openConsentSettings,
} from "../../utils/consent";
import { applyAnalytics } from "../../utils/analytics";
import "./CookieConsent.css";

/**
 * CookieConsent — GDPR consent banner shown once on first visit.
 *
 * "Accept all" / "Reject all" save immediately; "Customize" opens the
 * preferences modal (CookiePreferences) for per-category control. Once any
 * choice is saved the banner hides and won't reappear unless reopened.
 */
function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!hasChosen()) setVisible(true);
    // Hide the banner whenever a choice gets saved (e.g. from the modal).
    const onChange = () => setVisible(false);
    window.addEventListener("wimc-consent-changed", onChange);
    return () => window.removeEventListener("wimc-consent-changed", onChange);
  }, []);

  const acceptAll = () => {
    applyAnalytics(savePreferences(ALL_PREFS));
    setVisible(false);
  };

  const rejectAll = () => {
    applyAnalytics(savePreferences(DEFAULT_PREFS));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="cookie-consent" role="dialog" aria-live="polite" aria-label="Cookie consent">
      <div className="cookie-consent__text">
        <strong>We value your privacy.</strong> WIMC uses essential storage to keep
        you signed in and save your closet, plus optional cookies you can control.
        See our{" "}
        <Link to="/privacy-policy" className="cookie-consent__link">
          Privacy Policy
        </Link>
        .
      </div>
      <div className="cookie-consent__actions">
        <button
          type="button"
          className="cookie-consent__btn cookie-consent__btn--ghost"
          onClick={openConsentSettings}
        >
          Customize
        </button>
        <button
          type="button"
          className="cookie-consent__btn cookie-consent__btn--ghost"
          onClick={rejectAll}
        >
          Reject all
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
