import React, { useEffect, useState } from "react";
import { fetchImagesByTag } from "../../utils/CloudinaryAPI";
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
            setImageUrl(null);
          }
        } catch (error) {
          console.error(`Error fetching image for tag ${tag}:`, error);
          setImageUrl(null);
        }
      };

      fetchImageForSection();
    }
  }, [propImageUrl, tag]);

  console.log(`Received image URL in card for ${sectionName}:`, imageUrl);

  return (
    <div className="closet-section-card" onClick={onClick}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={sectionName}
          className="closet-section-card__image"
        />
      ) : (
        <div
          className="closet-section-card__placeholder"
          style={{ backgroundImage: `url(${placeholderUrl})` }}
        />
      )}
      <h3 className="closet-section-card__title">{sectionName}</h3>
    </div>
  );
}

export default ClosetSectionCard;
