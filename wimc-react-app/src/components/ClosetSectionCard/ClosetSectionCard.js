import React, { useEffect, useState } from "react";
import { AdvancedImage } from "@cloudinary/react";
import { cld } from "../../utils/CloudinaryAPI";
import "./ClosetSectionCard.css";

function ClosetSectionCard({ sectionName, placeholderUrl, onClick }) {
  const [myImage, setMyImage] = useState(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  useEffect(() => {
    if (sectionName) {
      const formattedSectionName = sectionName
        .replace(/\s+/g, "_")
        .toLowerCase();
      const imagePublicId = `closet-items/${formattedSectionName}`;

      const cloudinaryImage = cld.image(imagePublicId);
      setMyImage(cloudinaryImage);
    }
  }, [sectionName]);

  const handleImageLoad = () => {
    setIsImageLoaded(true);
  };

  const handleImageError = () => {
    setIsImageLoaded(false);
    setMyImage(null);
  };

  return (
    <div className="closet-section-card" onClick={onClick}>
      {myImage && isImageLoaded ? (
        <AdvancedImage
          cldImg={myImage}
          className="closet-section-card__image loaded"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      ) : (
        <img
          src={placeholderUrl}
          alt={`${sectionName} placeholder`}
          className="closet-section-card__image closet-section-card__placeholder"
        />
      )}
      <div className="closet-section-card__overlay">
        <h3 className="closet-section-card__title">{sectionName}</h3>
      </div>
    </div>
  );
}

export default ClosetSectionCard;
