import React, { useState, useEffect, useRef } from "react";
import ImageUpload from "../ImageUpload/ImageUpload";
import "./AddClothingModal.css";

function AddClothingModal({ isOpen, onClose, onClothingAdded }) {
  const [formData, setFormData] = useState({
    name: "",
    designer: "",
    size: "",
    category: "",
    imageUrl: "",
  });
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
    setFormData((prev) => ({ ...prev, imageUrl: result.secure_url }));
    setError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.imageUrl) {
      setError("Please upload an image before submitting.");
      return;
    }
    if (
      !formData.name ||
      !formData.designer ||
      !formData.size ||
      !formData.category
    ) {
      setError("Please fill in all fields.");
      return;
    }
    onClothingAdded({ ...formData });
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
      setError("");
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

  const tag = formData.category
    ? formData.category.replace(/\s+/g, "-").toLowerCase()
    : "uncategorized";

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div
        className="modal"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__header">
          <h2 className="modal__title">Add New Clothing Item</h2>
          <button className="modal__close" onClick={onClose}>
            &times;
          </button>
        </div>
        <form className="modal__form" onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            placeholder="Item Name"
            value={formData.name}
            onChange={handleChange}
            className="modal__input"
          />
          <input
            type="text"
            name="designer"
            placeholder="Designer"
            value={formData.designer}
            onChange={handleChange}
            className="modal__input"
          />
          <input
            type="text"
            name="size"
            placeholder="Size"
            value={formData.size}
            onChange={handleChange}
            className="modal__input"
          />
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="modal__select"
          >
            <option value="">Select Category</option>
            <option value="dresses-skirts">Dresses/Skirts</option>
            <option value="shoes-sneakers">Shoes/Sneakers</option>
            <option value="pants-jeans">Pants/Jeans</option>
            <option value="tops">Tops</option>
            <option value="bags-accessories">Bags/Accessories</option>
            <option value="jackets-coats">Jackets/Coats</option>
          </select>

          <ImageUpload
            folder="closet-items"
            tag={tag}
            onUploadSuccess={handleImageUploadSuccess}
          />

          {error && <p className="modal__error">{error}</p>}

          <button type="submit" className="modal__submit">
            Add Item
          </button>
        </form>
      </div>
    </div>
  );
}

export default AddClothingModal;
