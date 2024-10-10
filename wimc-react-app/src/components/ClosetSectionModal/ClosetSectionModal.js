import React, { useEffect, useState } from "react";
import { api } from "../../utils/CloudinaryAPI";
import "./ClosetSectionModal.css";

function ClosetSectionModal({ isOpen, sectionName, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);
      api
        .fetchImage(sectionName)
        .then((response) => {
          setItems(response.resources);
          setLoading(false);
        })
        .catch((error) => {
          setError("Failed to load items. Please try again.");
          setLoading(false);
          console.error("Error fetching section items:", error);
        });
    }
  }, [isOpen, sectionName]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="closet-section-modal__overlay" onClick={onClose}>
      <div
        className="closet-section-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="closet-section-modal__close" onClick={onClose}>
          &#10006;
        </button>
        <h2>{sectionName}</h2>

        {loading ? (
          <p>Loading items...</p>
        ) : error ? (
          <p className="closet-section-modal__error">{error}</p>
        ) : items.length === 0 ? (
          <p>No items found in this section.</p>
        ) : (
          <div className="closet-section-modal__levels">
            <div className="closet-section-modal__level closet-section-modal__level--dark">
              <h3>Level 1</h3>
              <div className="closet-section-modal__scroll">
                {items
                  .slice(0, Math.floor(items.length / 3))
                  .map((item, index) => (
                    <div key={index} className="closet-section-modal__item">
                      <img
                        src={item.secure_url}
                        alt={item.public_id}
                        className="closet-section-modal__item-image"
                      />
                    </div>
                  ))}
              </div>
            </div>

            <div className="closet-section-modal__level closet-section-modal__level--dark">
              <h3>Level 2</h3>
              <div className="closet-section-modal__scroll">
                {items
                  .slice(
                    Math.floor(items.length / 3),
                    2 * Math.floor(items.length / 3)
                  )
                  .map((item, index) => (
                    <div key={index} className="closet-section-modal__item">
                      <img
                        src={item.secure_url}
                        alt={item.public_id}
                        className="closet-section-modal__item-image"
                      />
                    </div>
                  ))}
              </div>
            </div>

            <div className="closet-section-modal__level closet-section-modal__level--dark">
              <h3>Level 3</h3>
              <div className="closet-section-modal__scroll">
                {items
                  .slice(2 * Math.floor(items.length / 3))
                  .map((item, index) => (
                    <div key={index} className="closet-section-modal__item">
                      <img
                        src={item.secure_url}
                        alt={item.public_id}
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
