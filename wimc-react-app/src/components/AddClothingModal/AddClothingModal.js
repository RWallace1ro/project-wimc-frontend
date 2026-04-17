import React, { useState, useEffect, useRef } from "react";
import MediaUploader from "../MediaUploader/MediaUploader";
import ImageUpload from "../ImageUpload/ImageUpload";
import "./AddClothingModal.css";

// function AddClothingModal({ isOpen, onClose, onClothingAdded }) {
function AddClothingModal({
  isOpen,
  onClose,
  onClothingAdded,
  initialCategory,
}) {
  const [formData, setFormData] = useState({
    name: "",
    designer: "",
    size: "",
    category: "",
    imageUrl: "", // keep for backward-compat with anything expecting it
  });

  const [source, setSource] = useState("device"); // "device" | "web"

  // NEW: media state (image or video)
  const [media, setMedia] = useState(null); // { type, url, thumb?, poster?, __raw? }
  const [error, setError] = useState("");

  const modalRef = useRef(null);

  const handleOverlayClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUploadSuccess = (result) => {
    // your ImageUpload returns Cloudinary result with secure_url
    setFormData((prev) => ({ ...prev, imageUrl: result.secure_url }));
    // clear media so we don't accidentally treat this as video
    setMedia(null);
    setError("");
  };

  // NEW: called by MediaUploader
  const handleMediaUploaded = (payload) => {
    // payload: { type: "image"|"video", url, thumb?, poster?, __raw? }
    setMedia(payload);
    // Preserve legacy imageUrl for any existing code that might still read it:
    if (payload.type === "image") {
      setFormData((prev) => ({
        ...prev,
        imageUrl: payload.thumb || payload.url,
      }));
    } else {
      // if video, we don't set imageUrl; card/grid should use mediaType/mediaUrl
      setFormData((prev) => ({ ...prev, imageUrl: "" }));
    }
    setError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.designer ||
      !formData.size ||
      !formData.category
    ) {
      setError("Please fill in all fields.");
      return;
    }

    // Validate media: accept either an uploaded image/video (preferred) or legacy imageUrl
    const hasMedia = media?.url || formData.imageUrl;
    if (!hasMedia) {
      setError("Please upload an image or video before submitting.");
      return;
    }

    // Build the item your app will use going forward (backward-compatible)
    const newItem = {
      name: formData.name,
      designer: formData.designer,
      size: formData.size,
      category: formData.category,

      // Preferred new fields:
      mediaType: media?.type || (formData.imageUrl ? "image" : "image"),
      mediaUrl: media?.url || formData.imageUrl || "",
      mediaThumb: media?.thumb || "",
      mediaPoster: media?.poster || "",

      // Legacy field (kept just in case other parts of the app still read it)
      imageUrl: formData.imageUrl || "",
    };

    onClothingAdded(newItem);

    // reset
    setFormData({
      name: "",
      designer: "",
      size: "",
      category: "",
      imageUrl: "",
    });
    setMedia(null);
    setError("");
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: "",
        designer: "",
        size: "",
        category: "",
        imageUrl: "",
      });
      setMedia(null);
      setError("");
    }

    if (isOpen && initialCategory) {
      setFormData((p) => ({ ...p, category: initialCategory }));
    }

    const handleKeyPress = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [isOpen, onClose]);

  const tag = formData.category?.trim()
    ? formData.category.trim().toLowerCase()
    : "uncategorized";

  if (!isOpen) return null;

  return (
    <section className="modal-overlay" onClick={handleOverlayClick}>
      <div
        className="modal"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__header">
          <h2 className="modal__title">Add New Clothing Item</h2>
          <button
            className="modal__close"
            onClick={onClose}
            aria-label="Close Modal"
          >
            &times;
          </button>
        </header>

        <form className="modal__form" onSubmit={handleSubmit}>
          {/* Upload source toggle */}
          <div className="modal__segmented">
            <button
              type="button"
              className={`segmented__btn ${
                source === "device" ? "is-active" : ""
              }`}
              onClick={() => setSource("device")}
            >
              From device (image/video)
            </button>
            <button
              type="button"
              className={`segmented__btn ${
                source === "web" ? "is-active" : ""
              }`}
              onClick={() => setSource("web")}
            >
              Web search (image)
            </button>
          </div>
          <label htmlFor="name">Item Name</label>
          <input
            id="name"
            type="text"
            name="name"
            placeholder="Item Name"
            value={formData.name}
            onChange={handleChange}
            className="modal__input"
            required
          />

          <label htmlFor="designer">Designer</label>
          <input
            id="designer"
            type="text"
            name="designer"
            placeholder="Designer"
            value={formData.designer}
            onChange={handleChange}
            className="modal__input"
            required
          />

          <label htmlFor="size">Size</label>
          <input
            id="size"
            type="text"
            name="size"
            placeholder="Size"
            value={formData.size}
            onChange={handleChange}
            className="modal__input"
            required
          />

          <label htmlFor="category">Category</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="modal__select"
            required
          >
            <option value="">Select Category</option>
            <option value="dresses-skirts">Dresses/Skirts</option>
            <option value="shoes-sneakers">Shoes/Sneakers</option>
            <option value="pants-jeans">Pants/Jeans</option>
            <option value="tops">Tops</option>
            <option value="bags-accessories">Bags/Accessories</option>
            <option value="jackets-coats">Jackets/Coats</option>
          </select>

          {source === "device" ? (
            <MediaUploader tag={tag} onUploaded={handleMediaUploaded} />
          ) : (
            <ImageUpload
              folder="closet-items"
              tag={tag}
              onUploadSuccess={handleImageUploadSuccess}
            />
          )}
          {error && <p className="modal__error">{error}</p>}

          <button type="submit" className="modal__submit">
            Add Item
          </button>
        </form>
      </div>
    </section>
  );
}

export default AddClothingModal;
