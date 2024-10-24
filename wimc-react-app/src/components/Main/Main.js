import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../utils/CloudinaryAPI";
import "./Main.css";

function Main({ isLoggedIn }) {
  const [avatarUrl, setAvatarUrl] = useState("");
  const [showAuthMessage, setShowAuthMessage] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const publicId = "cloudinary_image_id";
    api
      .fetchImage(publicId)
      .then((response) => {
        setAvatarUrl(response.secure_url);
      })
      .catch((error) => {
        console.error("Error fetching image:", error);
      });
  }, []);

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
      <div className="main__content">
        <h1 className="main__title">Welcome to What's In My Closet (WIMC)</h1>
        <p className="main__description">
          The WIMC app helps you organize and manage your closet effortlessly.
          You can add, view, and donate your clothing items, and even create a
          wish list for items you want to add in the future. You can also share
          your closet and wishlist.
        </p>

        {avatarUrl && (
          <img src={avatarUrl} alt="User Avatar" className="main__avatar" />
        )}

        <Link
          to="/closet-data"
          onClick={handleExploreClick}
          className="main__link"
        >
          Explore Your Closet
        </Link>

        {showAuthMessage && (
          <div className="main__message">
            <p>Please log in or sign up to explore your closet.</p>
            <button onClick={closeAuthMessage}>Close</button>
          </div>
        )}
      </div>
    </main>
  );
}

export default Main;
