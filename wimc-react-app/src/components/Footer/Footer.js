import React from "react";
import { Link } from "react-router-dom";
import { openConsentSettings } from "../../utils/consent";
import "./Footer.css";

function Footer() {
  return (
    <footer className="footer">
      <p className="footer__year">© 2024–{new Date().getFullYear()} GingerFaith LLC. All rights reserved.</p>
      <nav className="footer__legal" aria-label="Legal">
        <Link to="/faq" className="footer__legal-link">FAQ</Link>
        <span className="footer__legal-sep" aria-hidden="true">·</span>
        <Link to="/pricing" className="footer__legal-link">Pricing</Link>
        <span className="footer__legal-sep" aria-hidden="true">·</span>
        <Link to="/privacy-policy" className="footer__legal-link">Privacy Policy</Link>
        <span className="footer__legal-sep" aria-hidden="true">·</span>
        <Link to="/terms-of-service" className="footer__legal-link">Terms of Service</Link>
        <span className="footer__legal-sep" aria-hidden="true">·</span>
        <button
          type="button"
          className="footer__legal-link footer__legal-link--button"
          onClick={openConsentSettings}
        >
          Cookie Settings
        </button>
      </nav>
    </footer>
  );
}

export default Footer;
