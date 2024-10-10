import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./Home.css";

function Home() {
  const [doorsOpen, setDoorsOpen] = useState(false);

  const handleExploreClick = () => {
    setDoorsOpen(true);
    setTimeout(() => {
      window.location.href = "/closet-data";
    }, 3000);
  };

  return (
    <div className="home">
      <header className="home__header">
        <h1 className="home__title">Welcome to What's In My Closet (WIMC)</h1>
        <p className="home__description">
          Organize and manage your closet effortlessly. Add, view, and donate
          your clothing items.
        </p>
      </header>
      <div className="home__actions">
        <button onClick={handleExploreClick} className="home__link">
          Explore Your Closet
        </button>
        <Link to="/wish-list" className="home__link">
          View Your Wish List
        </Link>
      </div>
      <footer className="home__footer">
        <p>Manage your wardrobe with ease!</p>
      </footer>

      <div className={`door-container ${doorsOpen ? "active" : ""}`}>
        <div className="door-left"></div>
        <div className="door-right"></div>
      </div>
    </div>
  );
}

export default Home;
