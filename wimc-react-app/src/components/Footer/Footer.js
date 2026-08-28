import React from "react";
import { Link } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { openConsentSettings } from "../../utils/consent";
import "./Footer.css";

// No third-party tracking happens in the native app, so there's no cookie
// consent to manage there — see the matching gate in App.js for the full
// explanation (Apple App Review Guideline 5.1.2(i)).
const NATIVE_PLATFORM = Capacitor.isNativePlatform();

function Footer() {
  return (
    <footer className="footer">
      <p className="footer__year">
        © {new Date().getFullYear()} GingerFaith™ LLC. All rights reserved.
      </p>
      {/* All legal links rendered as inline text — no flexbox, no wrapping edge-cases */}
      <p className="footer__legal">
        <Link to="/faq" className="footer__legal-link">FAQ</Link>
        <span className="footer__legal-sep"> · </span>
        <Link to="/contact" className="footer__legal-link">Contact Us</Link>
        <span className="footer__legal-sep"> · </span>
        <Link to="/pricing" className="footer__legal-link">Pricing</Link>
        <span className="footer__legal-sep"> · </span>
        <Link to="/privacy-policy" className="footer__legal-link">Privacy Policy</Link>
        <span className="footer__legal-sep"> · </span>
        <Link to="/terms-of-service" className="footer__legal-link">Terms of Service</Link>
        {!NATIVE_PLATFORM && (
          <>
            <span className="footer__legal-sep"> · </span>
            <button
              type="button"
              className="footer__legal-link footer__legal-link--button"
              onClick={openConsentSettings}
            >
              Cookie Settings
            </button>
          </>
        )}
      </p>
    </footer>
  );
}

export default Footer;
