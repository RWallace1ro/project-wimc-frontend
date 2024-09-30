import React from "react";
import { Link } from "react-router-dom";
import "./Navigation.css";

function Navigation({ isLoggedIn }) {
  return (
    <nav className="navigation">
      <ul className="navigation__list">
        <li className="navigation__item">
          <Link to="/" className="navigation__link">
            Home
          </Link>
        </li>

        {isLoggedIn && (
          <li className="navigation__item">
            <Link to="/closet-data" className="navigation__link">
              My Closet
            </Link>
          </li>
        )}

        {isLoggedIn && (
          <li className="navigation__item">
            <Link to="/wishlist" className="navigation__link">
              Wish List
            </Link>
          </li>
        )}

        {isLoggedIn && (
          <li className="navigation__item">
            <Link to="/donate" className="navigation__link">
              Donate
            </Link>
          </li>
        )}

        {isLoggedIn && (
          <li className="navigation__item">
            <button className="navigation__button" onClick={() => window.location.href = "/logout"}>
              Logout
            </button>
          </li>
        )}
        {!isLoggedIn && (
          <>
            <li className="navigation__item">
              <Link to="/login" className="navigation__link">
                Login
              </Link>
            </li>
            <li className="navigation__item">
              <Link to="/signup" className="navigation__link">
                Sign Up
              </Link>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}

export default Navigation;