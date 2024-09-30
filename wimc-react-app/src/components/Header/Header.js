import React from "react";
import ClosetTabs from "../ClosetTabs/ClosetTabs";
import "./Header.css";

function Header({
  userName,
  avatarUrl,
  isLoggedIn,
  onSignUpClick,
  onLoginClick,
  onLogoutClick,
}) {
  const defaultAvatarUrl = "/assets/images/default-avatar.jpg";

  const displayAvatarUrl = avatarUrl || defaultAvatarUrl;

  return (
    <header className="header">
      <div className="header__logo">WIMC</div>

      {isLoggedIn ? (
        <>
          <ClosetTabs />

          <div className="header__user">
            <span className="header__user-name">{userName}</span>
            <img
              src={displayAvatarUrl}
              alt="User Avatar"
              className="header__avatar"
              onError={(e) => {
                e.target.src = defaultAvatarUrl;
              }}
            />
            <button className="header__button" onClick={onLogoutClick}>
              Logout
            </button>
          </div>
        </>
      ) : (
        <div className="header__auth-buttons">
          <button className="header__button" onClick={onSignUpClick}>
            Sign Up
          </button>
          <button className="header__button" onClick={onLoginClick}>
            Login
          </button>
        </div>
      )}
    </header>
  );
}

export default Header;
