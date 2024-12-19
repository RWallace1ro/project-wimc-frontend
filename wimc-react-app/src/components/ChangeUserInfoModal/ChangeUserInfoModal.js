import React, { useState, useEffect, useRef } from "react";
import { uploadImage } from "../../utils/CloudinaryAPI";
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

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
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
        const tag = "user-avatars";
        const imageResponse = await uploadImage(imageFile, "user-avatars", [
          tag,
        ]);
        updatedFormData.avatarUrl = imageResponse.secure_url;
        setIsUploading(false);
      } catch (uploadError) {
        console.error("Error uploading image:", uploadError);
        setError("Failed to upload image. Please try again.");
        setIsUploading(false);
        return;
      }
    }

    if (!imageFile && formData.avatarUrl) {
      updatedFormData.avatarUrl = formData.avatarUrl;
    }

    onUserUpdate(updatedFormData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <section
      className="modal-overlay"
      onClick={(e) => {
        if (!modalRef.current.contains(e.target)) onClose();
      }}
    >
      <div className="modal" ref={modalRef}>
        <header className="modal__header">
          <h2 className="modal__title">Update User Information</h2>
          <button
            className="modal__close"
            onClick={onClose}
            aria-label="Close Modal"
          >
            &times;
          </button>
        </header>
        <form className="modal__form" onSubmit={handleSubmit}>
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            className="modal__input"
            required
          />

          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="modal__input"
            required
          />

          <label htmlFor="image">Upload Image</label>
          <input
            type="file"
            id="image"
            accept="image/*"
            onChange={handleImageChange}
            className="modal__input"
          />

          <label htmlFor="avatarUrl">Or enter Image URL</label>
          <input
            type="url"
            id="avatarUrl"
            name="avatarUrl"
            placeholder="Image URL"
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
    </section>
  );
}

export default ChangeUserInfoModal;
