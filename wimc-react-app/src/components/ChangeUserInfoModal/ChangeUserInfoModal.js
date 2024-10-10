import React, { useState } from "react";
import { uploadImage } from "../../utils/CloudinaryAPI";
import { api } from "../../utils/BackendAPI";
import "./ChangeUserInfoModal.css";

function ChangeUserInfoModal({ isOpen, onClose, userData, onUserUpdate }) {
  const [formData, setFormData] = useState({
    username: userData.username || "",
    email: userData.email || "",
    avatarUrl: userData.avatarUrl || "",
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

  const handleImageUpload = (file) => {
    uploadImage(file)
      .then((response) => {
        console.log("Image uploaded successfully:", response);
      })
      .catch((error) => {
        console.error("Error uploading image:", error);
      });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      let updatedFormData = { ...formData };

      if (imageFile) {
        setIsUploading(true);
        const formDataImage = new FormData();
        formDataImage.append("file", imageFile);
        formDataImage.append("upload_preset", "wimc_upload");

        const imageResponse = await api.uploadImage(formDataImage);
        updatedFormData.avatarUrl = imageResponse.secure_url;
      }

      const updatedUser = await api.updateUser(userData.id, updatedFormData);
      onUserUpdate(updatedUser);
      onClose();
    } catch (err) {
      setError("Failed to update user information. Please try again.");
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
          <h2 className="modal__title">Update User Information</h2>
          <button className="modal__close" onClick={onClose}>
            &times;
          </button>
        </div>
        <form className="modal__form" onSubmit={handleSubmit}>
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            className="modal__input"
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
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
            {isUploading ? "Updating..." : "Update"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChangeUserInfoModal;
