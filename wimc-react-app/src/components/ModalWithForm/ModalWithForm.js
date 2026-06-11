import React, { useState, useEffect, useRef } from "react";
import "./ModalWithForm.css";

function ModalWithForm({
  isOpen,
  onClose,
  onSubmit,
  isSignUp,
  switchToLogin,
  error,
  onForgotPassword, // async (email) => sends a password-reset email
}) {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    avatarUrl: "",
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetMsg, setResetMsg] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const modalRef = useRef(null);
  const firstInputRef = useRef(null);

  // Reset form when modal closes/opens
  useEffect(() => {
    if (!isOpen) {
      setFormData({ username: "", email: "", password: "", confirmPassword: "", avatarUrl: "" });
      setAgreedToTerms(false);
      setValidationError("");
      setIsSubmitting(false);
      setResetMsg("");
      setResetBusy(false);
    } else {
      setTimeout(() => firstInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Trap focus inside modal
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;
    const focusable = modalRef.current.querySelectorAll(
      'button, input, a[href], select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const trapFocus = (e) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      }
    };
    document.addEventListener("keydown", trapFocus);
    return () => document.removeEventListener("keydown", trapFocus);
  }, [isOpen]);

  const handleOverlayClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (validationError) setValidationError("");
  };

  const validate = () => {
    if (isSignUp && formData.username.trim().length < 2)
      return "Name must be at least 2 characters.";
    if (!formData.email.trim())
      return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      return "Please enter a valid email address.";
    if (formData.password.length < 8)
      return "Password must be at least 8 characters.";
    if (isSignUp && formData.password !== formData.confirmPassword)
      return "Passwords do not match.";
    if (isSignUp && !agreedToTerms)
      return "You must agree to the Terms of Service and Privacy Policy to create an account.";
    return "";
  };

  const handleForgot = async () => {
    if (resetBusy) return;
    const email = formData.email.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setValidationError('Enter your email above, then click "Forgot password?"');
      return;
    }
    setValidationError("");
    setResetMsg("");
    setResetBusy(true);
    try {
      await onForgotPassword?.(email);
      setResetMsg("✅ Password reset email sent! Check your inbox (and spam folder).");
    } catch (err) {
      if (err?.code === "auth/invalid-email") {
        setValidationError("Please enter a valid email address.");
      } else if (err?.code === "auth/too-many-requests") {
        setResetMsg("Too many requests. Please wait a minute and try again.");
      } else {
        // Don't reveal whether an account exists — show a neutral confirmation
        setResetMsg("✅ If an account exists for that email, a reset link is on its way. Check your inbox (and spam).");
      }
    } finally {
      setResetBusy(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const msg = validate();
    if (msg) {
      setValidationError(msg);
      return;
    }
    setValidationError("");
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const errorMessage = validationError || error;

  return (
    <div
      className="modal-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="modal" ref={modalRef}>
        <header className="modal__header">
          <h2 className="modal__title" id="modal-title">
            {isSignUp ? "Sign Up" : "Login"}
          </h2>
          <button
            className="modal__close"
            onClick={onClose}
            aria-label="Close modal"
            type="button"
          >
            &times;
          </button>
        </header>

        <section className="modal__form-section">
          <form className="modal__form" onSubmit={handleSubmit} noValidate>

            {isSignUp && (
              <label className="modal__label">
                <span className="modal__label-text">Name</span>
                <input
                  ref={firstInputRef}
                  type="text"
                  name="username"
                  placeholder="Your name"
                  value={formData.username}
                  onChange={handleChange}
                  className="modal__input"
                  autoComplete="name"
                  aria-required="true"
                  aria-describedby={errorMessage ? "modal-error" : undefined}
                />
              </label>
            )}

            <label className="modal__label">
              <span className="modal__label-text">Email</span>
              <input
                ref={!isSignUp ? firstInputRef : undefined}
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                className="modal__input"
                autoComplete="email"
                aria-required="true"
                aria-describedby={errorMessage ? "modal-error" : undefined}
              />
            </label>

            <label className="modal__label">
              <span className="modal__label-text">Password</span>
              <input
                type="password"
                name="password"
                placeholder={isSignUp ? "At least 8 characters" : "Password"}
                value={formData.password}
                onChange={handleChange}
                className="modal__input"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                aria-required="true"
                aria-describedby={errorMessage ? "modal-error" : undefined}
              />
            </label>

            {isSignUp && (
              <>
                <label className="modal__label">
                  <span className="modal__label-text">Confirm Password</span>
                  <input
                    type="password"
                    name="confirmPassword"
                    placeholder="Re-enter your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="modal__input"
                    autoComplete="new-password"
                    aria-required="true"
                  />
                </label>

                <label className="modal__label">
                  <span className="modal__label-text">
                    Profile Image URL{" "}
                    <span className="modal__optional">(optional)</span>
                  </span>
                  <input
                    type="url"
                    name="avatarUrl"
                    placeholder="https://..."
                    value={formData.avatarUrl}
                    onChange={handleChange}
                    className="modal__input"
                    autoComplete="off"
                  />
                </label>

                {/* ── Terms & Privacy agreement ── */}
                <label className="modal__agreement">
                  <input
                    type="checkbox"
                    className="modal__agreement-checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => {
                      setAgreedToTerms(e.target.checked);
                      if (validationError) setValidationError("");
                    }}
                    aria-required="true"
                    aria-describedby={errorMessage ? "modal-error" : undefined}
                  />
                  <span className="modal__agreement-text">
                    I am 13 or older and I agree to the{" "}
                    <a
                      href={`${process.env.PUBLIC_URL || ""}/terms-of-service`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="modal__agreement-link"
                    >
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a
                      href={`${process.env.PUBLIC_URL || ""}/privacy-policy`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="modal__agreement-link"
                    >
                      Privacy Policy
                    </a>
                    .
                  </span>
                </label>
              </>
            )}

            {/* Forgot password — login only */}
            {!isSignUp && (
              <button
                type="button"
                className="modal__forgot"
                onClick={handleForgot}
                disabled={resetBusy}
              >
                {resetBusy ? "Sending reset link…" : "Forgot password?"}
              </button>
            )}

            {resetMsg && (
              <p className="modal__reset-msg" role="status" aria-live="polite">
                {resetMsg}
              </p>
            )}

            {errorMessage && (
              <p
                className="modal__error"
                id="modal-error"
                role="alert"
                aria-live="assertive"
              >
                {errorMessage}
              </p>
            )}

            <section className="modal__footer">
              <button
                type="submit"
                className="modal__submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting
                  ? isSignUp ? "Creating account…" : "Logging in…"
                  : isSignUp ? "Sign Up" : "Login"}
              </button>
              {isSignUp && (
                <button
                  type="button"
                  className="modal__switch"
                  onClick={switchToLogin}
                >
                  Already have an account? Login
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
