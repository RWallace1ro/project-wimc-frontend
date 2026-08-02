import React from "react";
import { useNavigate } from "react-router-dom";
import "./Header.css";

// A stripped-down header for public, standalone pages (Contact, FAQ, Privacy
// Policy, Terms of Service, About) that get linked from outside the app —
// e.g. the marketing site's own "Contact Us" link. The full <Header> renders
// the entire internal app toolbar (closet section tabs, Weather, Try On, AI
// Stylist, etc.) on every route unconditionally, which reads as cluttered
// and unfinished on a page a logged-out visitor lands on directly rather
// than navigates to from inside the app. This only swaps in for logged-out
// visitors on those specific routes — a logged-in user still sees the real
// Header everywhere, including here, so in-app navigation isn't disrupted.
export default function MinimalHeader({ onSignUpClick, onLoginClick }) {
  const navigate = useNavigate();
  return (
    <header className="header">
      <div className="header__top">
        <div className="header__logo-link" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
          <div className="header__logo">WIMC™</div>
        </div>
        <nav className="header__nav header__nav--desktop" aria-label="Main navigation">
          <div className="header__auth-buttons">
            <button className="header__button" onClick={onSignUpClick}>Sign Up</button>
            <button className="header__button" onClick={onLoginClick}>Login</button>
          </div>
        </nav>
        <div className="header__mobile-controls">
          <div className="header__mobile-auth">
            <button className="header__button header__button--signup-mobile" onClick={onSignUpClick}>Sign Up</button>
            <button className="header__button header__button--login-mobile" onClick={onLoginClick}>Login</button>
          </div>
        </div>
      </div>
    </header>
  );
}
