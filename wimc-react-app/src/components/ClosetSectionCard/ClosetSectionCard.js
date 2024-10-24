import React, { useEffect, useState } from "react";
import { api } from "../../utils/CloudinaryAPI";
import "./ClosetSectionCard.css";

function ClosetSectionCard({ sectionName, onClick }) {
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    const fetchImage = async () => {
      try {
        const response = await api.fetchImages(sectionName);
        const imageResource = response.resources.find((img) =>
          img.public_id.includes(sectionName)
        );

        if (imageResource) {
          setImageUrl(imageResource.secure_url);
        } else {
          setImageUrl("/path/to/fallback-image.jpg");
        }
      } catch (error) {
        console.error("Error fetching image:", error);
        setImageUrl("/path/to/fallback-image.jpg");
      }
    };

    fetchImage();
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

