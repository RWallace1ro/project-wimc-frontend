import React from "react";
import "./Footer.css";

function Footer() {
  // ✅ Always shows the current year — no manual updates needed
  // const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <p className="footer__developer">Developed by Rochelle Wallace</p>
      <p className="footer__year">© 2024-2026</p>
    </footer>
  );
}

export default Footer;
