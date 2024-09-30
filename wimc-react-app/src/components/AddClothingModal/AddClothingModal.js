import React, { useState } from "react";
import { postData } from "../../utils/BackendAPI";
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleImageChange = (e) => {
    setImageFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!imageFile) {
      setError("Please select an image.");
      return;
    }

    setIsUploading(true);

    try {
      const formDataImage = new FormData();
      formDataImage.append("file", imageFile);
      formDataImage.append("upload_preset", "wimc_upload");

      const imageResponse = await uploadImage(formDataImage);
      const imageUrl = imageResponse.secure_url;

      const newClothingItem = await postData("/clothing", {
        ...formData,
        imageUrl,
      });

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
    <div className="modal-overlay">
      <div className="modal">
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
            <option value="Evening Wear">Evening Wear</option>
            <option value="Shoes">Shoes</option>
            <option value="Pants/Jeans">Pants/Jeans</option>
            <option value="Tops">Tops</option>
            <option value="Bags">Bags</option>
            <option value="Jackets/Coats">Jackets/Coats</option>
          </select>

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
