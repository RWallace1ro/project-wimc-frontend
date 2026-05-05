import React, { useState, useEffect } from "react";
import ClosetTabs from "../ClosetTabs/ClosetTabs";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ReactComponent as HomeIcon } from "../../assets/images/home-icon.svg";
import WeatherModal from "../WeatherModal/WeatherModal";
import TryOnStudio from "../TryOnStudio/TryOnStudio";
import AIStylist from "../AIStylist/AIStylist";
import UserSettingsModal from "../UserSettingsModal/UserSettingsModal";
import "./Header.css";

function Header({
  userName,
  avatarUrl,
  isLoggedIn,
  userData,
  onUserUpdate, // ✅ new — bubbles updates to App.js
  onSignUpClick,
  onLoginClick,
  onLogoutClick,
  handleSelectTab,
  selectedTab,
}) {
  const [currentUserName, setCurrentUserName] = useState(userName);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(avatarUrl);
  const [isWeatherOpen, setIsWeatherOpen] = useState(false);
  const [isTryOnOpen, setIsTryOnOpen] = useState(false);
  const [isStylistOpen, setIsStylistOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const defaultAvatarUrl =
    "https://res.cloudinary.com/djoh2vfhd/image/upload/v1729608070/2011-10-27_20.07.18_HDR_cdbudn.jpg";

  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Sync local state whenever App.js userData changes (e.g. on refresh)
  useEffect(() => {
    setCurrentUserName(userName);
  }, [userName]);
  useEffect(() => {
    setCurrentAvatarUrl(avatarUrl);
  }, [avatarUrl]);

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

  // ✅ When settings saves, update local display AND persist via App.js
  const handleSettingsUpdate = (updated) => {
    setCurrentUserName(updated.userName);
    setCurrentAvatarUrl(updated.avatarUrl || currentAvatarUrl);
    onUserUpdate?.(updated); // persists to localStorage via App.js
  };

  const activeTab = location.pathname === "/closet-data" ? selectedTab : "";
  const displayAvatarUrl = currentAvatarUrl || defaultAvatarUrl;

  return (
    <>
      <header className="header">
        {/* ── TOP LAYER ── */}
        <div className="header__top">
          <Link to={isLoggedIn ? "/home" : "/"} className="header__logo-link">
            <div className="header__logo">WIMC™</div>
            {location.pathname === "/home" && (
              <HomeIcon className="header__home-icon" />
            )}
          </Link>

          {isLoggedIn ? (
            <div className="header__user">
              <span className="header__user-name">
                {currentUserName
                  ? `${currentUserName}'s Closet`
                  : "Your Closet"}
              </span>
              {/* ✅ Avatar now reflects live updates */}
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
              <button
                className="header__button header__button--kids"
                onClick={() => navigate("/kids-closet")}
              >
                👶 Kids
              </button>
              <button
                className="header__button header__button--receipts"
                onClick={() => navigate("/receipts")}
              >
                🧾 Receipts
              </button>
              <div className="header__divider" />
              <button
                className="header__about-button"
                onClick={() => navigate("/about")}
              >
                About
              </button>
              <button
                className="header__button header__button--settings"
                onClick={() => setIsSettingsOpen(true)}
              >
                ⚙️ Settings
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
          <ClosetTabs selectedTab={activeTab} onSelectTab={handleTabChange} />
        </div>
      </header>

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
      <UserSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        userData={
          userData || {
            userName: currentUserName,
            email: "",
            avatarUrl: currentAvatarUrl,
          }
        }
        onUserUpdate={handleSettingsUpdate}
      />
    </>
  );
}

export default Header;
