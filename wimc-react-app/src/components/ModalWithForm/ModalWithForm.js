import React, { useState, useEffect, useRef } from "react";
import { api } from "../../utils/BackendAPI";
import "./ModalWithForm.css";

function ModalWithForm({ isOpen, onClose, onLogin, isSignUp, switchToLogin }) {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    avatarUrl: "",
  });
  const [error, setError] = useState("");
  const modalRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [onClose]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const validateForm = () => {
    if (formData.username.length < 2) {
      return "Name must contain at least 2 characters.";
    }
    if (!formData.email.includes("@") || !formData.email.includes(".")) {
      return "Please enter a valid email address.";
    }
    if (formData.password.length < 8) {
      return "Password must be at least 8 characters long.";
    }
    if (isSignUp && formData.password !== formData.confirmPassword) {
      return "Passwords do not match.";
    }
    return "";
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    const userData = {
      username: formData.username,
      email: formData.email,
      password: formData.password,
      avatarUrl: formData.avatarUrl,
    };

    if (isSignUp) {
      api
        .signUp(userData)
        .then((data) => {
          onLogin();
          console.log("User data:", data);
        })
        .catch((err) => {
          setError("Failed to submit the form. Please try again.");
          console.error("Error:", err);
        });
    } else {
      api
        .login(userData)
        .then((data) => {
          onLogin();
          console.log("User data:", data);
        })
        .catch((err) => {
          setError("Failed to submit the form. Please try again.");
          console.error("Error:", err);
        });
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal" ref={modalRef}>
        <div className="modal__header">
          <h2 className="modal__title">{isSignUp ? "Sign Up" : "Login"}</h2>
          <button className="modal__close" onClick={onClose}>
            &times;
          </button>
        </div>
        <form className="modal__form" onSubmit={handleSubmit}>
          {isSignUp && (
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              className={`modal__input ${formData.username ? "filled" : ""}`}
            />
          )}
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className={`modal__input ${formData.email ? "filled" : ""}`}
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className={`modal__input ${formData.password ? "filled" : ""}`}
          />
          {isSignUp && (
            <>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`modal__input ${
                  formData.confirmPassword ? "filled" : ""
                }`}
              />
              <input
                type="text"
                name="avatarUrl"
                placeholder="Avatar URL (Optional)"
                value={formData.avatarUrl}
                onChange={handleChange}
                className={`modal__input ${formData.avatarUrl ? "filled" : ""}`}
              />
            </>
          )}
          {error && <p className="modal__error">{error}</p>}
          <div className="modal__footer">
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
          </div>
        </form>
      </div>
    </div>
  );
}

export default ModalWithForm;
