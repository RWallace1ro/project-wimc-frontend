import React, { useState, useEffect, useRef } from "react";
import { uploadImage } from "../../utils/CloudinaryAPI";
import "./AddClothingModal.css";

function AddClothingModal({ isOpen, onClose, onClothingAdded }) {
  const [formData, setFormData] = useState({
    name: "",
    designer: "",
    size: "",
    category: "",
    imageUrl: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyPress);

    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [onClose]);

  const handleOverlayClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleImageChange = (e) => {
    setImageFile(e.target.files[0]);
    setFormData({ ...formData, imageUrl: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!imageFile && !formData.imageUrl) {
      setError("Please select an image file or enter an image URL.");
      return;
    }

    setIsUploading(true);

    try {
      let imageUrl = formData.imageUrl;

      if (imageFile) {
        const imageResponse = await uploadImage(imageFile);
        imageUrl = imageResponse.secure_url;
      }

      const newClothingItem = { ...formData, imageUrl };

      onClothingAdded(newClothingItem);
      onClose();
    } catch (err) {
      setError("Failed to add clothing item. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

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
            className="modal__input"
          >
            <option value="">Select Category</option>
            <option value="Dresses/Skirts">Dresses/Skirts</option>
            <option value="Shoes/Sneakers">Shoes/Sneakers</option>
            <option value="Pants/Jeans">Pants/Jeans</option>
            <option value="Tops">Tops</option>
            <option value="Bags/Accessories">Bags/Accessories</option>
            <option value="Jackets/Coats">Jackets/Coats</option>
          </select>

          <input
            type="text"
            name="imageUrl"
            placeholder="Image URL"
            value={formData.imageUrl}
            onChange={(e) => {
              handleChange(e);
              setImageFile(null);
            }}
            className="modal__input"
          />

          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="modal__input"
          />

          {error && <p className="modal__error">{error}</p>}

          <button
            type="submit"
            className="modal__submit"
            disabled={isUploading}
          >
            {isUploading ? "Uploading..." : "Add Item"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AddClothingModal;
