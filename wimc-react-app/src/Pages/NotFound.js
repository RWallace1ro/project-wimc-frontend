import React from "react";
import { Link } from "react-router-dom";
import "./NotFound.css";

export default function NotFound({ isLoggedIn = false }) {
  return (
    <main className="notfound">
      <div className="notfound__card">
        <span className="notfound__emoji" role="img" aria-label="Empty hanger">
          🧥
        </span>
        <h1 className="notfound__code">404</h1>
        <h2 className="notfound__title">This page isn't in the closet</h2>
        <p className="notfound__text">
          The page you're looking for doesn't exist or may have been moved.
        </p>
        <div className="notfound__actions">
          {isLoggedIn ? (
            <>
              <Link to="/home" className="notfound__btn notfound__btn--primary">
                🏠 Go Home
              </Link>
              <Link to="/closet-data" className="notfound__btn">
                👗 My Closet
              </Link>
            </>
          ) : (
            <Link to="/" className="notfound__btn notfound__btn--primary">
              🏠 Go Home
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
