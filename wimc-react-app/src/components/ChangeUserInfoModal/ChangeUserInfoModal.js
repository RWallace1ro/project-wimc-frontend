import React, { useState, useEffect, useRef } from "react";
import { api } from "../../utils/CloudinaryAPI";
import "./ChangeUserInfoModal.css";

function ChangeUserInfoModal({ isOpen, onClose, userData, onUserUpdate }) {
  const [formData, setFormData] = useState({
    username: userData?.username || "",
    email: userData?.email || "",
    avatarUrl: userData?.avatarUrl || "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        username: userData?.username || "",
        email: userData?.email || "",
        avatarUrl: userData?.avatarUrl || "",
      });
      setImageFile(null);
      setError("");
    }
  }, [isOpen, userData]);

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
    let updatedFormData = { ...formData };

    if (imageFile) {
      setIsUploading(true);
      try {
        const imageResponse = await api.uploadImage(imageFile);
        updatedFormData.avatarUrl = imageResponse.secure_url;
        setIsUploading(false);
      } catch (uploadError) {
        console.error("Error uploading image:", uploadError);
        setError("Failed to upload image. Please try again.");
        setIsUploading(false);
        return;
      }
    }

    onUserUpdate(updatedFormData);
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal" ref={modalRef}>
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
          <input
            type="url"
            name="avatarUrl"
            placeholder="Or enter Image URL"
            value={formData.avatarUrl}
            onChange={handleChange}
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
