import React, { useEffect, useState } from "react";
import { fetchImagesByTag } from "../../utils/CloudinaryAPI";
import "./ClosetSectionModal.css";

function ClosetSectionModal({ isOpen, sectionName, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchItems = async () => {
      if (isOpen && sectionName) {
        setLoading(true);
        setError(null);

        try {
          const formattedTag = sectionName.replace(/\s+/g, "-").toLowerCase();
          const fetchedItems = await fetchImagesByTag(formattedTag);

          if (fetchedItems && fetchedItems.length > 0) {
            setItems(fetchedItems);
          } else {
            setItems([]);
            setError("No items found in this section.");
          }
        } catch (err) {
          console.error("Error fetching section items:", err);
          setError("Failed to load items. Please try again.");
        } finally {
          setLoading(false);
        }
      }
    };

    fetchItems();
  }, [isOpen, sectionName]);

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains("closet-section-modal__overlay")) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="closet-section-modal__overlay" onClick={handleOverlayClick}>
      <div
        className="closet-section-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="closet-section-modal__close" onClick={onClose}>
          &#10006;
        </button>
        <h2 className="closet-section-modal__title">{sectionName}</h2>

        {loading && <div className="preloader">Loading items...</div>}

        {!loading && error && (
          <p className="closet-section-modal__error">{error}</p>
        )}

        {!loading && items.length === 0 && !error && (
          <p className="closet-section-modal__no-items">
            No items found in this section.
          </p>
        )}

        {!loading && items.length > 0 && (
          <div className="closet-section-modal__levels">
            <div className="closet-section-modal__level closet-section-modal__level--dark">
              <h3>Level 1</h3>
              <div className="closet-section-modal__scroll">
                {items.map((item, index) => (
                  <div
                    key={item?.public_id || index}
                    className="closet-section-modal__item"
                  >
                    <img
                      src={
                        item?.secure_url ||
                        "https://res.cloudinary.com/djoh2vfhd/image/upload/public_id:closet-items/"
                      }
                      alt={`Closet item ${index + 1}`}
                      className="closetsection-modal__item-image"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ClosetSectionModal;
