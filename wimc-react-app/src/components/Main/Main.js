import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Main.css";

function Main({ isLoggedIn }) {
  const [showAuthMessage, setShowAuthMessage] = useState(false);
  const navigate = useNavigate();

  const handleExploreClick = (e) => {
    if (!isLoggedIn) {
      e.preventDefault();
      setShowAuthMessage(true);
    } else {
      navigate("/closet-data");
    }
  };

  const closeAuthMessage = () => {
    setShowAuthMessage(false);
  };

  return (
    <main className="main">
      <section className="main__content">
        <h1 className="main__title">Welcome to What's In My Closet (WIMC)</h1>
        <p className="main__description">
          The WIMC app helps you organize and manage your closet effortlessly.
          You can add, view, and donate your clothing items, and even create a
          wish list for items you want to add in the future. You can also share
          your closet and wishlist.
        </p>

        <Link
          to="/closet-data"
          onClick={handleExploreClick}
          className="main__link"
        >
          Explore Your Closet
        </Link>

        {showAuthMessage && (
          <section className="main__message">
            <p>Please log in or sign up to explore your closet.</p>
            <button onClick={closeAuthMessage}>Close</button>
          </section>
        )}
      </section>
    </main>
  );
}

export default Main;
