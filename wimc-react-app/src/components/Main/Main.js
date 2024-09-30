import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchImage } from "../../utils/CloudinaryAPI";
import "./Main.css";

function Main() {
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    const publicId = "your_cloudinary_image_id";
    fetchImage(publicId)
      .then((response) => {
        setAvatarUrl(response.secure_url);
      })
      .catch((error) => {
        console.error("Error fetching image:", error);
      });
  }, []);

  return (
    <main className="main">
      <h1 className="main__title">Welcome to What's In My Closet (WIMC)</h1>
      <p className="main__description">
        The WIMC app helps you organize and manage your closet effortlessly. You
        can add, view, and donate your clothing items, and even create a wish
        list for items you want to add in the future. You can also share your
        closet and wishlist.
      </p>

      {avatarUrl && (
        <img src={avatarUrl} alt="User Avatar" className="main__avatar" />
      )}

      <Link to="/closet-data" className="main__link">
        Explore Your Closet
      </Link>
    </main>
  );
}

export default Main;
