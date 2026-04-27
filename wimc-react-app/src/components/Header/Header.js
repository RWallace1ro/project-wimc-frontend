import React, { useState, useEffect } from "react";
import ClosetTabs from "../ClosetTabs/ClosetTabs";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ReactComponent as HomeIcon } from "../../assets/images/home-icon.svg";
import WeatherModal from "../WeatherModal/WeatherModal";
import TryOnStudio from "../TryOnStudio/TryOnStudio";
import AIStylist from "../AIStylist/AIStylist";
import "./Header.css";

function Header({
  userName,
  avatarUrl,
  isLoggedIn,
  onSignUpClick,
  onLoginClick,
  onLogoutClick,
  handleSelectTab,
  selectedTab,
}) {
  const [currentUserName, setCurrentUserName] = useState(userName);
  const [isWeatherOpen, setIsWeatherOpen] = useState(false);
  const [isTryOnOpen, setIsTryOnOpen] = useState(false);
  const [isStylistOpen, setIsStylistOpen] = useState(false);

  const defaultAvatarUrl =
    "https://res.cloudinary.com/djoh2vfhd/image/upload/v1729608070/2011-10-27_20.07.18_HDR_cdbudn.jpg";
  const displayAvatarUrl = avatarUrl || defaultAvatarUrl;

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setCurrentUserName(userName);
  }, [userName]);

  // ✅ Guard: only allow tab navigation if logged in
  const handleTabChange = (tab) => {
    if (!isLoggedIn) {
      onLoginClick();
      return;
    }
    if (handleSelectTab) handleSelectTab(tab);
  };

  const handleLogout = () => {
    onLogoutClick();
    setCurrentUserName("Your Closet");
    navigate("/");
  };

  // ✅ On mount and route change, if we're not on /closet-data clear any
  //    persisted "dresses-skirts" default so no tab stays highlighted on refresh
  const activeTab = location.pathname === "/closet-data" ? selectedTab : "";

  return (
    <>
      <header className="header">
        {/* ── TOP LAYER ── */}
        <div className="header__top">
          {/* Logo */}
          <Link to={isLoggedIn ? "/home" : "/"} className="header__logo-link">
            <div className="header__logo">WIMC™</div>
            {location.pathname === "/home" && (
              <HomeIcon className="header__home-icon" />
            )}
          </Link>

          {/* Right side controls */}
          {isLoggedIn ? (
            <div className="header__user">
              <span className="header__user-name">
                {currentUserName
                  ? `${currentUserName}'s Closet`
                  : "Your Closet"}
              </span>
              <img
                src={displayAvatarUrl}
                alt="User Avatar"
                className="header__avatar"
                onError={(e) => {
                  e.target.src = defaultAvatarUrl;
                }}
              />
              <div className="header__divider" />
              <button
                className="header__button header__button--logout"
                onClick={handleLogout}
              >
                Logout
              </button>
              <button
                className="header__button header__button--weather"
                onClick={() => setIsWeatherOpen(true)}
              >
                🌤️ Weather
              </button>
              <button
                className="header__button header__button--tryon"
                onClick={() => setIsTryOnOpen(true)}
              >
                🎬 Try On
              </button>
              <button
                className="header__button header__button--stylist"
                onClick={() => setIsStylistOpen(true)}
              >
                ✨ AI Stylist
              </button>
              <div className="header__divider" />
              <button
                className="header__about-button"
                onClick={() => navigate("/about")}
              >
                <button
                  className="header__button header__button--kids"
                  onClick={() => navigate("/kids-closet")}
                >
                  👶 Kids
                </button>
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
              <div className="header__divider" />
              <button
                className="header__button header__button--weather"
                onClick={() => setIsWeatherOpen(true)}
              >
                🌤️ Weather
              </button>
              <div className="header__divider" />
              <button
                className="header__about-button"
                onClick={() => navigate("/about")}
              >
                About
              </button>
            </div>
          )}
        </div>

        {/* ── BOTTOM LAYER — tabs only ── */}
        <div className="header__bottom">
          <ClosetTabs
            selectedTab={activeTab} // ✅ empty string when not on /closet-data
            onSelectTab={handleTabChange}
          />
        </div>
      </header>

      {/* Modals rendered outside header */}
      <WeatherModal
        isOpen={isWeatherOpen}
        onClose={() => setIsWeatherOpen(false)}
      />
      <TryOnStudio
        isOpen={isTryOnOpen}
        onClose={() => setIsTryOnOpen(false)}
        initialImageUrl={null}
        initialSection={null}
      />
      <AIStylist
        isOpen={isStylistOpen}
        onClose={() => setIsStylistOpen(false)}
      />
      <button
        className="header__button header__button--kids"
        onClick={() => navigate("/kids-closet")}
      >
        👶 Kids
      </button>
    </>
  );
}

export default Header;
