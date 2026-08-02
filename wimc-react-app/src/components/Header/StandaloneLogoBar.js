import React from "react";

// A plain, non-interactive WIMC mark for external visitors on standalone
// pages (Contact, FAQ, Privacy Policy, Terms) — just enough branding to
// show what site you're on, with none of MinimalHeader's Sign Up/Login
// buttons or nav chrome. Sits visually separate from the page's own colored
// hero banner, not merged into one bar.
export default function StandaloneLogoBar() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "16px 0",
        background: "#ffffff",
      }}
    >
      <span style={{ fontSize: 20, fontWeight: 800, color: "#1a1a1a", letterSpacing: "0.02em" }}>
        WIMC™
      </span>
    </div>
  );
}
