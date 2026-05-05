import React, { useEffect, useMemo, useState } from "react";
import {
  fetchImagesByTag,
  fetchVideosByTag,
  videoPoster,
} from "../../utils/CloudinaryAPI";
import { useBackground } from "../../context/BackgroundContext";
import "./ClosetSectionModal.css";

const LABEL_TO_TAG = {
  "Dresses/Skirts": "dresses-skirts",
  "Shoes/Sneakers": "shoes-sneakers",
  "Pants/Jeans": "pants-jeans",
  Tops: "tops",
  "Bags/Accessories": "bags-accessories",
  "Jackets/Coats": "jackets-coats",
};

function ClosetSectionModal({ isOpen, sectionName, onClose, onAddItem }) {
  const [items, setItems] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("images");

  const { getBackground } = useBackground();

  // ✅ Correctly derive the section background
  const sectionBg = sectionName
    ? getBackground(LABEL_TO_TAG[sectionName] || null)
    : null;

  const tag = useMemo(() => {
    if (!sectionName) return "";
    const s = String(sectionName);
    return s.includes(" ")
      ? s.replace(/\s+/g, "-").toLowerCase()
      : s.toLowerCase();
  }, [sectionName]);

  useEffect(() => {
    const fetchItems = async () => {
      if (!isOpen || !sectionName || !tag) return;
      setLoading(true);
      setError(null);
      try {
        const [fetchedImages, fetchedVideos] = await Promise.all([
          fetchImagesByTag(tag),
          fetchVideosByTag(tag),
        ]);
        setItems(fetchedImages || []);
        setVideos(fetchedVideos || []);
      } catch {
        setError("Failed to load items. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [isOpen, tag]);

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains("closet-section-modal__overlay")) onClose();
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
      {/* ✅ style prop is now correctly inside the opening tag */}
      <div
        className="closet-section-modal"
        onClick={(e) => e.stopPropagation()}
        style={
          sectionBg
            ? {
                backgroundImage: `url(${sectionBg})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {}
        }
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
          {onAddItem && (
            <button
              type="button"
              className="closet-section-modal__add"
              onClick={() => onAddItem(tag)}
              title={`Add item to ${sectionName}`}
              aria-label={`Add item to ${sectionName}`}
            >
              + Add
            </button>
          )}
        </header>

        {/* Tabs */}
        <nav
          className="closet-section-modal__tabs"
          role="tablist"
          aria-label="Media"
        >
          <button
            role="tab"
            aria-selected={tab === "images"}
            className={`tab ${tab === "images" ? "is-active" : ""}`}
            onClick={() => setTab("images")}
          >
            Images
          </button>
          <button
            role="tab"
            aria-selected={tab === "videos"}
            className={`tab ${tab === "videos" ? "is-active" : ""}`}
            onClick={() => setTab("videos")}
          >
            Videos
          </button>
        </nav>

        {loading && <div className="preloader">Loading items...</div>}
        {!loading && error && (
          <p className="closet-section-modal__error">{error}</p>
        )}
        {!loading && !error && items.length === 0 && tab === "images" && (
          <p className="closet-section-modal__no-items">
            No images in this section yet.
          </p>
        )}
        {!loading && !error && videos.length === 0 && tab === "videos" && (
          <p className="closet-section-modal__no-items">
            No videos in this section yet.
          </p>
        )}

        {!loading && !error && tab === "images" && items.length > 0 && (
          <main className="closet-section-modal__levels">
            <section className="closet-section-modal__level closet-section-modal__level--dark">
              <div className="closet-section-modal__grid">
                {items.map((url, i) => (
                  <figure
                    key={`img-${i}`}
                    className="closet-section-modal__item"
                  >
                    <img
                      src={url}
                      alt={`image-${i}`}
                      className="closet-section-modal__item-image"
                      loading="lazy"
                    />
                  </figure>
                ))}
              </div>
            </section>
          </main>
        )}

        {!loading && !error && tab === "videos" && videos.length > 0 && (
          <main className="closet-section-modal__levels">
            <section className="closet-section-modal__level closet-section-modal__level--dark">
              <div className="closet-section-modal__grid">
                {videos.map((vurl, i) => (
                  <figure
                    key={`vid-${i}`}
                    className="closet-section-modal__item"
                  >
                    <video
                      className="closet-section-modal__item-video"
                      controls
                      preload="metadata"
                      poster={videoPoster(vurl)}
                    >
                      <source src={vurl} />
                    </video>
                  </figure>
                ))}
              </div>
            </section>
          </main>
        )}
      </div>
    </section>
  );
}

export default ClosetSectionModal;
