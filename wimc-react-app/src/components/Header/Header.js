import React, { useState, useEffect, useRef, Suspense, lazy } from "react";
import ClosetTabs from "../ClosetTabs/ClosetTabs";
import { useNavigate, useLocation } from "react-router-dom";
import { ReactComponent as HomeIcon } from "../../assets/images/home-icon.svg";
import { useWIMCTour } from "../WIMCTourVideo/useTour";
import "./Header.css";

// Heavy modal components — lazy loaded so they don't bloat the initial bundle.
// Each only downloads when the user first opens it.
const WeatherModal      = lazy(() => import("../WeatherModal/WeatherModal"));
const TryOnStudio       = lazy(() => import("../TryOnStudio/TryOnStudio"));
const AIStylist         = lazy(() => import("../AIStylist/AIStylist"));
const UserSettingsModal = lazy(() => import("../UserSettingsModal/UserSettingsModal"));
const WIMCTourVideo     = lazy(() => import("../WIMCTourVideo/WIMCTourVideo"));

function Header({
  userName,
  avatarUrl,
  isLoggedIn,
  userData,
  onUserUpdate,
  onSignUpClick,
  onLoginClick,
  onLogoutClick,
  onDeletionScheduled,
  handleSelectTab,
  selectedTab,
  closetItems,
}) {
  const [currentUserName, setCurrentUserName] = useState(userName);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(avatarUrl);
  const [isWeatherOpen, setIsWeatherOpen] = useState(false);
  const [isTryOnOpen, setIsTryOnOpen] = useState(false);
  const [isStylistOpen, setIsStylistOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef(null);

  const { isOpen: isTourOpen, openTour, closeTour, showIfNew } = useWIMCTour();

  const defaultAvatarUrl =
    "https://res.cloudinary.com/djoh2vfhd/image/upload/v1729608070/2011-10-27_20.07.18_HDR_cdbudn.jpg";

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { setCurrentUserName(userName); }, [userName]);
  useEffect(() => { setCurrentAvatarUrl(avatarUrl); }, [avatarUrl]);

  useEffect(() => {
    if (isLoggedIn) showIfNew();
  }, [isLoggedIn, showIfNew]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handler = (e) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target)) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isMobileMenuOpen]);

  const handleTabChange = (tab) => {
    if (!isLoggedIn) { onLoginClick(); return; }
    if (handleSelectTab) handleSelectTab(tab);
  };

  const handleLogout = () => {
    onLogoutClick();
    setCurrentUserName("Your Closet");
    setIsMobileMenuOpen(false);
    navigate("/");
  };

  const handleSettingsUpdate = (updated) => {
    setCurrentUserName(updated.userName);
    setCurrentAvatarUrl(updated.avatarUrl || currentAvatarUrl);
    onUserUpdate?.(updated);
  };

  const activeTab = location.pathname === "/closet-data" ? selectedTab : "";
  const displayAvatarUrl = currentAvatarUrl || defaultAvatarUrl;

  const loggedInButtons = (
    <>
      <button className="header__button header__button--weather" onClick={() => { setIsWeatherOpen(true); setIsMobileMenuOpen(false); }}>🌤️ Weather</button>
      <button className="header__button header__button--tryon" onClick={() => { setIsTryOnOpen(true); setIsMobileMenuOpen(false); }}>🎬 Try On</button>
      <button className="header__button header__button--stylist" onClick={() => { setIsStylistOpen(true); setIsMobileMenuOpen(false); }}>✨ AI Stylist</button>
      <button className="header__button header__button--kids" onClick={() => { navigate("/kids-closet"); setIsMobileMenuOpen(false); }}>👶 Kids</button>
      <button className="header__button header__button--receipts" onClick={() => { navigate("/receipts"); setIsMobileMenuOpen(false); }}>🧾 Receipts</button>
      <button className="header__button header__button--tour" onClick={() => { openTour(); setIsMobileMenuOpen(false); }}>🎬 Tour</button>
      <button className="header__about-button" onClick={() => { navigate("/about"); setIsMobileMenuOpen(false); }}>About</button>
      <button className="header__button header__button--settings" onClick={() => { setIsSettingsOpen(true); setIsMobileMenuOpen(false); }}>⚙️ Settings</button>
      <div className="header__divider" />
      <button className="header__button header__button--logout" onClick={handleLogout}>Logout</button>
    </>
  );

  const loggedOutButtons = (
    <>
      <button className="header__button" onClick={() => { onSignUpClick(); setIsMobileMenuOpen(false); }}>Sign Up</button>
      <button className="header__button" onClick={() => { onLoginClick(); setIsMobileMenuOpen(false); }}>Login</button>
      <div className="header__divider" />
      <button className="header__button header__button--weather" onClick={() => { setIsWeatherOpen(true); setIsMobileMenuOpen(false); }}>🌤️ Weather</button>
      <button className="header__button header__button--tour" onClick={() => { openTour(); setIsMobileMenuOpen(false); }}>🎬 Tour</button>
      <div className="header__divider" />
      <button className="header__about-button" onClick={() => { navigate("/about"); setIsMobileMenuOpen(false); }}>About</button>
    </>
  );

  return (
    <>
      <header className="header">
        <div className="header__top">
          {/* Logo — brand mark only, no navigation */}
          <div className="header__logo-link">
            <div className="header__logo">WIMC™</div>
          </div>

          {/* Desktop nav */}
          <nav className="header__nav header__nav--desktop" aria-label="Main navigation">
            {isLoggedIn ? (
              <div className="header__user">
                <span className="header__user-name">{currentUserName ? `${currentUserName}'s Closet` : "Your Closet"}</span>
                <img src={displayAvatarUrl} alt="User avatar" className="header__avatar" onError={(e) => { e.target.src = defaultAvatarUrl; }} />
                <div className="header__divider" />
                {loggedInButtons}
              </div>
            ) : (
              <div className="header__auth-buttons">{loggedOutButtons}</div>
            )}
          </nav>

          {/* Mobile: auth buttons (logged out) + avatar + hamburger */}
          <div className="header__mobile-controls" ref={mobileMenuRef}>
            {/* Show Login / Sign Up directly in bar when logged out */}
            {!isLoggedIn && (
              <div className="header__mobile-auth">
                <button className="header__button header__button--signup-mobile" onClick={() => { onSignUpClick(); setIsMobileMenuOpen(false); }}>Sign Up</button>
                <button className="header__button header__button--login-mobile" onClick={() => { onLoginClick(); setIsMobileMenuOpen(false); }}>Login</button>
              </div>
            )}
            {isLoggedIn && (
              <img src={displayAvatarUrl} alt="User avatar" className="header__avatar" onError={(e) => { e.target.src = defaultAvatarUrl; }} />
            )}
            <button
              className="header__hamburger"
              onClick={() => setIsMobileMenuOpen((o) => !o)}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
            >
              <span className="header__hamburger-line" />
              <span className="header__hamburger-line" />
              <span className="header__hamburger-line" />
            </button>

            {isMobileMenuOpen && (
              <nav className="header__mobile-menu" aria-label="Mobile navigation">
                {isLoggedIn && (
                  <p className="header__mobile-username">{currentUserName ? `${currentUserName}'s Closet` : "Your Closet"}</p>
                )}
                {isLoggedIn ? loggedInButtons : loggedOutButtons}
              </nav>
            )}
          </div>
        </div>

        <div className="header__bottom">
          {location.pathname === "/closet-data" && (
            <button
              className="header__home-btn"
              onClick={() => navigate("/home")}
              aria-label="Go to Home"
              title="Go to Home"
            >
              <HomeIcon className="header__home-icon" />
              <span className="header__home-label">Home</span>
            </button>
          )}
          <ClosetTabs selectedTab={activeTab} onSelectTab={handleTabChange} />
        </div>
      </header>

      <Suspense fallback={null}>
        <WeatherModal isOpen={isWeatherOpen} onClose={() => setIsWeatherOpen(false)} />
        <TryOnStudio isOpen={isTryOnOpen} onClose={() => setIsTryOnOpen(false)} initialImageUrl={null} initialSection={null} />
        <AIStylist isOpen={isStylistOpen} onClose={() => setIsStylistOpen(false)} closetItems={closetItems} selectedTab={selectedTab} />
        <UserSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          userData={userData || { userName: currentUserName, email: "", avatarUrl: currentAvatarUrl }}
          onUserUpdate={handleSettingsUpdate}
          onLogout={onLogoutClick}
          onDeletionScheduled={() => { setIsSettingsOpen(false); onDeletionScheduled?.(); }}
        />
        <WIMCTourVideo isOpen={isTourOpen} onClose={closeTour} autoPlay={true} />
      </Suspense>
    </>
  );
}

export default Header;
