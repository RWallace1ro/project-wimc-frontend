import React, { useState, useEffect } from "react";
import ClosetTabs from "../ClosetTabs/ClosetTabs";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ReactComponent as HomeIcon } from "../../assets/images/home-icon.svg";
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
    "https://res.cloudinary.com/djoh2vfhd/image/upload/v1729608070/2011-10-27_20.07.18_HDR_cdbudn.jpg";

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
      <nav className="header__nav">
        <Link to={isLoggedIn ? "/home" : "/"} className="header__logo-link">
          <div className="header__logo">WIMC{"\u2122"}</div>
          {location.pathname === "/home" && (
            <HomeIcon className="header__home-icon" />
          )}
        </Link>

        <section className="header__tabs-user-container">
          <div className="header__tabs-container">
            <ClosetTabs
              selectedTab={selectedTab}
              onSelectTab={handleTabChange}
            />
          </div>

          {isLoggedIn ? (
            <div className="header__user">
              <span className="header__user-name">
                {currentUserName ? `${userName}'s Closet` : "Your Closet"}
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
              <button
                className="header__about-button"
                onClick={handleAboutClick}
              >
                About
              </button>
            </div>
          ) : (
            <div className="header__auth-buttons">
              <button className="header__button" onClick={onSignUpClick}>
                Sign Up
              </button>
              <button className="header__button" onClick={onLoginClick}>
                Login
              </button>
              <button
                className="header__about-button"
                onClick={handleAboutClick}
              >
                About
              </button>
            </div>
          )}
        </section>
      </nav>
    </header>
  );
}

export default Header;
