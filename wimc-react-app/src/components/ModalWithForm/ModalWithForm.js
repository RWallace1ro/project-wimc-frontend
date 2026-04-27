import React, { useState, useEffect, useRef } from "react";
import "./ModalWithForm.css";

function ModalWithForm({
  isOpen,
  onClose,
  onSubmit,
  isSignUp,
  switchToLogin,
  error,
}) {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    avatarUrl: "",
  });

  // ✅ Validation error shown to the user (was silently returning before)
  const [validationError, setValidationError] = useState("");
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        avatarUrl: "",
      });
      setValidationError("");
    }
  }, [isOpen]);

  // ✅ Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // ✅ Close on overlay click
  const handleOverlayClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    if (isSignUp && formData.username.trim().length < 2)
      return "Name must contain at least 2 characters.";
    if (!formData.email.includes("@") || !formData.email.includes("."))
      return "Please enter a valid email address.";
    if (formData.password.length < 8)
      return "Password must be at least 8 characters long.";
    if (isSignUp && formData.password !== formData.confirmPassword)
      return "Passwords do not match.";
    return "";
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const msg = validate();
    if (msg) {
      setValidationError(msg); // ✅ display it instead of silently returning
      return;
    }
    setValidationError("");
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal" ref={modalRef}>
        <header className="modal__header">
          <h2 className="modal__title">{isSignUp ? "Sign Up" : "Login"}</h2>
          <button
            className="modal__close"
            onClick={onClose}
            aria-label="Close modal"
          >
            &times;
          </button>
        </header>

        <section className="modal__form-section">
          <form className="modal__form" onSubmit={handleSubmit}>
            {isSignUp && (
              <input
                type="text"
                name="username"
                placeholder="Username"
                value={formData.username}
                onChange={handleChange}
                className="modal__input"
                required
              />
            )}
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              className="modal__input"
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className="modal__input"
              required
            />
            {isSignUp && (
              <>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="modal__input"
                  required
                />
                <input
                  type="url"
                  name="avatarUrl"
                  placeholder="Profile Image URL (optional)"
                  value={formData.avatarUrl}
                  onChange={handleChange}
                  className="modal__input"
                />
              </>
            )}

            {/* ✅ Show validation errors AND server-side errors */}
            {validationError && (
              <p className="modal__error">{validationError}</p>
            )}
            {error && <p className="modal__error">{error}</p>}

            <section className="modal__footer">
              <button type="submit" className="modal__submit">
                {isSignUp ? "Sign Up" : "Login"}
              </button>
              {isSignUp && (
                <button
                  type="button"
                  className="modal__switch"
                  onClick={switchToLogin}
                >
                  or Login
                </button>
              )}
            </section>
          </form>
        </section>
      </div>
    </div>
  );
}

export default ModalWithForm;
