import React, { useEffect, useState } from "react";
import { Cloudinary } from "@cloudinary/url-gen";
import { AdvancedImage } from "@cloudinary/react";
import "./ClosetSectionCard.css";

const cld = new Cloudinary({
  cloud: {
    cloudName: process.env.REACT_APP_CLOUD_NAME,
  },
});

function ClosetSectionCard({ sectionName, onClick }) {
  const [myImage, setMyImage] = useState(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  useEffect(() => {
    if (sectionName) {
      const formattedSectionName = sectionName
        .replace(/\s+/g, "_")
        .toLowerCase();
      const imagePublicId = `your_public_id_path/${formattedSectionName}`;

      const cloudinaryImage = cld.image(imagePublicId);
      setMyImage(cloudinaryImage);
    }
  }, [sectionName]);

  const handleImageLoad = () => {
    setIsImageLoaded(true);
  };

  const handleImageError = () => {
    setIsImageLoaded(false);
  };

  return (
    <div className="closet-section-card" onClick={onClick}>
      {myImage ? (
        <AdvancedImage
          cldImg={myImage}
          className={`closet-section-card__image ${
            isImageLoaded ? "loaded" : "loading"
          }`}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      ) : (
        <div className="closet-section-card__placeholder">No Image</div>
      )}
      {!isImageLoaded && (
        <div className="closet-section-card__placeholder">Loading...</div>
      )}
      <div className="closet-section-card__overlay">
        <h3 className="closet-section-card__title">{sectionName}</h3>
      </div>
    </div>
  );
}

export default ClosetSectionCard;
