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
            setError(null);
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
    <section
      className="closet-section-modal__overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-labelledby="closet-section-modal-title"
      aria-hidden={!isOpen}
    >
      <div
        className="closet-section-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="closet-section-modal__header">
          <button
            className="closet-section-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            &#10006;
          </button>
          <h2
            id="closet-section-modal-title"
            className="closet-section-modal__title"
          >
            {sectionName}
          </h2>
        </header>

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
          <main className="closet-section-modal__levels">
            <section className="closet-section-modal__level closet-section-modal__level--dark">
              <h3>Level 1</h3>
              <div className="closet-section-modal__scroll">
                {items.map((item, index) => {
                  const imageUrl = item;

                  return (
                    <figure
                      key={item?.public_id || index}
                      className="closet-section-modal__item"
                    >
                      <img
                        src={imageUrl}
                        alt={item?.public_id || "item"}
                        className="closet-section-modal__item-image"
                      />
                    </figure>
                  );
                })}
              </div>
            </section>
          </main>
        )}
      </div>
    </section>
  );
}

export default ClosetSectionModal;
