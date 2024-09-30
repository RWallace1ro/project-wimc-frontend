import React, { useEffect, useState } from "react";
import { fetchImage } from "../../utils/CloudinaryAPI";
import "./ClosetSectionCard.css";

function ClosetSectionCard({ sectionName, onClick }) {
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    fetchImage(sectionName)
      .then((response) => {
        setImageUrl(response.secure_url);
      })
      .catch((error) => {
        console.error("Error fetching image:", error);
        setImageUrl("/path/to/fallback-image.jpg");
      });
  }, [sectionName]);

  return (
    <div className="closet-section-card" onClick={onClick}>
      <img
        src={imageUrl}
        alt={sectionName}
        className="closet-section-card__image"
      />
      <div className="closet-section-card__overlay">
        <h3 className="closet-section-card__title">{sectionName}</h3>
      </div>
    </div>
  );
}

export default ClosetSectionCard;
