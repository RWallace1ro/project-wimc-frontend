import React, { useState, useEffect } from "react";
import ClosetTabs from "../ClosetTabs/ClosetTabs";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./Header.css";

function Header({
  userName,
  avatarUrl,
  isLoggedIn,
  onSignUpClick,
  onLoginClick,
  onLogoutClick,
  handleSelectTab,
}) {
  const [selectedTab, setSelectedTab] = useState("");
  const [currentUserName, setCurrentUserName] = useState(userName);
  const defaultAvatarUrl =
    "https://images.unsplash.com/photo-1631887624820-5435b375c9cf?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
  const displayAvatarUrl = avatarUrl || defaultAvatarUrl;
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setCurrentUserName(userName);
  }, [userName]);

  const handleTabChange = (tab) => {
    setSelectedTab(tab);
    if (handleSelectTab) {
      handleSelectTab(tab);
    } else {
      console.error("handleSelectTab is not defined");
    }
  };

  const handleLogout = () => {
    onLogoutClick();
    setCurrentUserName("Your Closet");
    navigate("/");
  };

  const handleAboutClick = () => {
    navigate("/about");
  };

  return (
    <header className="header">
      <Link to={isLoggedIn ? "/home" : "/"} className="header__logo-link">
        <div className="header__logo">WIMC{"\u2122"}</div>

        {location.pathname === "/home" && (
          <img
            src={require("../../assets/images/home-icon.jpg")}
            alt="Home Icon"
            className="header__home-icon"
          />
        )}
      </Link>

      {isLoggedIn ? (
        <div className="header__content">
          <div className="header__tabs-container">
            <ClosetTabs
              selectedTab={selectedTab}
              onSelectTab={handleTabChange}
            />
          </div>

          <div className="header__user">
            <span className="header__user-name">
              {/* {userName ? `${userName}'s Closet` : "Your Closet"} */}
              {currentUserName || "Your Closet"}
            </span>
            <img
              src={displayAvatarUrl}
              alt="User Avatar"
              className="header__avatar"
              onError={(e) => {
                e.target.src = defaultAvatarUrl;
              }}
            />
            <button className="header__button" onClick={handleLogout}>
              Logout
            </button>
            <button className="header__about-button" onClick={handleAboutClick}>
              About
            </button>
          </div>
        </div>
      ) : (
        <div className="header__auth-buttons">
          <button className="header__button" onClick={onSignUpClick}>
            Sign Up
          </button>
          <button className="header__button" onClick={onLoginClick}>
            Login
          </button>
          <button className="header__about-button" onClick={handleAboutClick}>
            About
          </button>
        </div>
      )}
    </header>
  );
}

export default Header;
