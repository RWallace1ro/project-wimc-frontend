import React, { useEffect, useState } from "react";
import { fetchImage } from "../../utils/CloudinaryAPI";
import "./ClosetSectionModal.css";

function ClosetSectionModal({ isOpen, sectionName, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchItems = () => {
      if (isOpen && sectionName) {
        setLoading(true);
        setError(null);

        const formattedSectionName = sectionName
          .replace(/\s+/g, "-")
          .toLowerCase();
        const publicId = `closet-items/${formattedSectionName}`;

        fetchImage(publicId)
          .then((response) => {
            if (response && !response.error) {
              setItems([response]);
            } else {
              setItems([]);
              setError(response?.error?.message || "Unknown error");
            }
          })
          .catch((err) => {
            console.error("Error fetching section items:", err);
            setError("Failed to load items. Please try again.");
          })
          .finally(() => setLoading(false));
      }
    };

    fetchItems();
  }, [isOpen, sectionName]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyPress);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [isOpen, onClose]);

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
        <h2>{sectionName}</h2>

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
                  <div key={index} className="closet-section-modal__item">
                    <img
                      src={
                        item.secure_url ||
                        "https://res.cloudinary.com/djoh2vfhd/image/upload/v1730849371/photo-1708397016786-8916880649b8_ryvylu.jpg"
                      }
                      alt={item.public_id || "fallback"}
                      className="closet-section-modal__item-image"
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
