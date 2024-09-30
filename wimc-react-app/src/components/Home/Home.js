import React from "react";
import { Link } from "react-router-dom";
import "./Home.css";

function Home() {
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
        <Link to="/closet-data" className="home__link">
          Explore Your Closet
        </Link>
        <Link to="/wish-list" className="home__link">
          View Your Wish List
        </Link>
      </div>

      <footer className="home__footer">
        <p>Manage your wardrobe with ease!</p>
      </footer>
    </div>
  );
}

export default Home;
