import React, { useEffect, useState } from "react";
import { fetchImagesByTag } from "../../utils/CloudinaryAPI";
import { AdvancedImage } from "@cloudinary/react";
import { CloudinaryImage } from "@cloudinary/url-gen";
import "./ClosetSectionCard.css";

function ClosetSectionCard({
  imageUrl: propImageUrl,
  sectionName,
  tag,
  placeholderUrl,
  onClick,
}) {
  const [imageUrl, setImageUrl] = useState(propImageUrl || null);

  useEffect(() => {
    if (!propImageUrl && tag) {
      const fetchImageForSection = async () => {
        try {
          console.log(`Fetching images for section with tag: ${tag}`);
          const images = await fetchImagesByTag(tag);

          if (images && images.length > 0) {
            console.log("Fetched images:", images);
            setImageUrl(images[0]);
          } else {
            console.warn(`No images found for tag: ${tag}`);
            setImageUrl(placeholderUrl);
          }
        } catch (error) {
          console.error(`Error fetching image for tag ${tag}:`, error);
          setImageUrl(placeholderUrl);
        }
      };

      fetchImageForSection();
    }
  }, [propImageUrl, tag, placeholderUrl]);

  const isCloudinaryImage = imageUrl && imageUrl.includes("cloudinary.com");

  const renderImage = isCloudinaryImage ? (
    <AdvancedImage
      cldImg={new CloudinaryImage(imageUrl, { cloudName: "djoh2vfhd" })}
      className="closet-section-card__image"
    />
  ) : (
    <img
      src={imageUrl || placeholderUrl}
      alt={sectionName}
      className="closet-section-card__image"
    />
  );

  return (
    <div className="closet-section-card" onClick={onClick}>
      {renderImage}
      <h3 className="closet-section-card__title">{sectionName}</h3>
    </div>
  );
}

export default ClosetSectionCard;
