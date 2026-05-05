import React, { useState, useEffect, useRef } from "react";
import { uploadImage } from "../../utils/CloudinaryAPI";
import { useBackground } from "../../context/BackgroundContext";
import "./UserSettingsModal.css";

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const DEFAULT_AVATAR =
  "https://res.cloudinary.com/djoh2vfhd/image/upload/v1729608070/2011-10-27_20.07.18_HDR_cdbudn.jpg";

const PAGE_BG_KEY = "closet-page";

const SECTION_OPTIONS = [
  { tag: "dresses-skirts", label: "Dresses/Skirts" },
  { tag: "shoes-sneakers", label: "Shoes/Sneakers" },
  { tag: "pants-jeans", label: "Pants/Jeans" },
  { tag: "tops", label: "Tops" },
  { tag: "bags-accessories", label: "Bags/Accessories" },
  { tag: "jackets-coats", label: "Jackets/Coats" },
];

const PRESETS = [
  {
    id: "dark-wood",
    label: "Dark Wood",
    url: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1200&q=80",
  },
  {
    id: "marble-white",
    label: "Marble White",
    url: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200&q=80",
  },
  {
    id: "blush-pink",
    label: "Blush Pink",
    url: "https://images.unsplash.com/photo-1595526051245-4506e0005bd0?w=1200&q=80",
  },
  {
    id: "midnight-blue",
    label: "Midnight Blue",
    url: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=1200&q=80",
  },
  {
    id: "sage-green",
    label: "Sage Green",
    url: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=1200&q=80",
  },
  {
    id: "warm-linen",
    label: "Warm Linen",
    url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80",
  },
  {
    id: "charcoal",
    label: "Charcoal",
    url: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=1200&q=80",
  },
  {
    id: "rose-gold",
    label: "Rose Gold",
    url: "https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=1200&q=80",
  },
];

// ── Mini background picker used for both page + each section ─────────────────
function BgPicker({ targetKey, label }) {
  const { backgrounds, setBackground, resetBackground } = useBackground();
  const current = backgrounds[targetKey] || null;
  const fileRef = useRef(null);
  const [open, setOpen] = useState(false); // ✅ collapsed by default
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  const pick = (url) => {
    setBackground(targetKey, url);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErr("");
    try {
      const res = await uploadImage(file, "wimc-backgrounds");
      if (res?.secure_url) pick(res.secure_url);
      else setErr("Upload failed.");
    } catch {
      setErr("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="usm-bg-picker">
      {/* ✅ Clickable header toggles the body */}
      <div
        className={`usm-bg-picker__head ${open ? "is-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
      >
        {/* Mini thumbnail of current bg */}
        <div
          className="usm-bg-picker__thumb-mini"
          style={current ? { backgroundImage: `url(${current})` } : {}}
        />
        <span className="usm-bg-picker__label">{label}</span>
        {saved && <span className="usm-bg-picker__saved">✅</span>}
        {current && (
          <button
            className="usm-bg-picker__reset"
            onClick={(e) => {
              e.stopPropagation();
              resetBackground(targetKey);
            }}
          >
            ↩️ Reset
          </button>
        )}
        <span className="usm-bg-picker__caret">▼</span>
      </div>

      {/* Collapsible body */}
      {open && (
        <div className="usm-bg-picker__body">
          {/* Current preview */}
          <div
            className="usm-bg-picker__preview"
            style={current ? { backgroundImage: `url(${current})` } : {}}
          >
            {!current && (
              <span className="usm-bg-picker__default">Default background</span>
            )}
          </div>

          {/* Preset chips */}
          <div className="usm-bg-picker__presets">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                className={`usm-bg-preset ${current === p.url ? "is-active" : ""}`}
                onClick={() => pick(p.url)}
                title={p.label}
              >
                <div
                  className="usm-bg-preset__thumb"
                  style={{ backgroundImage: `url(${p.url})` }}
                />
                <span className="usm-bg-preset__name">{p.label}</span>
                {current === p.url && (
                  <span className="usm-bg-preset__check">✓</span>
                )}
              </button>
            ))}
            <button
              className="usm-bg-preset usm-bg-preset--upload"
              onClick={() => fileRef.current?.click()}
              title="Upload custom"
              disabled={uploading}
            >
              <div className="usm-bg-preset__thumb usm-bg-preset__thumb--upload">
                {uploading ? "…" : "🖼️"}
              </div>
              <span className="usm-bg-preset__name">Custom</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleFile}
              />
            </button>
          </div>
          {err && <p className="usm-bg-err">{err}</p>}
        </div>
      )}
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
export default function UserSettingsModal({
  isOpen,
  onClose,
  userData,
  onUserUpdate,
}) {
  const [tab, setTab] = useState("profile"); // "profile" | "password" | "appearance"

  // Profile fields
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ text: "", type: "" });
  const [profileSaving, setProfileSaving] = useState(false);

  // Password fields
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwMsg, setPwMsg] = useState({ text: "", type: "" });
  const [pwSaving, setPwSaving] = useState(false);

  const fileInputRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setUserName(userData?.userName || "");
      setEmail(userData?.email || "");
      setAvatarUrl(userData?.avatarUrl || "");
      setAvatarPreview(userData?.avatarUrl || "");
      setAvatarFile(null);
      setProfileMsg({ text: "", type: "" });
      setPwMsg({ text: "", type: "" });
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setTab("profile");
    }
  }, [isOpen, userData]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const overlayClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
  };

  const handleAvatarFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setProfileMsg({ text: "", type: "" });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileMsg({ text: "", type: "" });
    if (!userName.trim()) {
      setProfileMsg({ text: "Username cannot be empty.", type: "error" });
      return;
    }
    if (!email.includes("@") || !email.includes(".")) {
      setProfileMsg({
        text: "Please enter a valid email address.",
        type: "error",
      });
      return;
    }

    setProfileSaving(true);
    let finalAvatarUrl = avatarUrl;

    if (avatarFile) {
      setUploading(true);
      try {
        const res = await uploadImage(avatarFile, "user-avatars");
        if (res?.secure_url) finalAvatarUrl = res.secure_url;
        else
          setProfileMsg({
            text: "Avatar upload failed. Profile saved without new photo.",
            type: "error",
          });
      } catch {
        setProfileMsg({ text: "Avatar upload failed.", type: "error" });
      } finally {
        setUploading(false);
      }
    }

    try {
      const updated = {
        ...userData,
        userName: userName.trim(),
        email: email.trim(),
        avatarUrl: finalAvatarUrl,
      };
      const users = JSON.parse(localStorage.getItem("users") || "[]");
      const updatedUsers = users.map((u) =>
        u.email === userData.email
          ? {
              ...u,
              userName: updated.userName,
              email: updated.email,
              avatarUrl: updated.avatarUrl,
            }
          : u,
      );
      localStorage.setItem("users", JSON.stringify(updatedUsers));
      localStorage.setItem("userData", JSON.stringify(updated));
      onUserUpdate(updated);
      setAvatarUrl(finalAvatarUrl);
      setAvatarFile(null);
      setProfileMsg({
        text: "✅ Profile updated successfully!",
        type: "success",
      });
    } catch {
      setProfileMsg({
        text: "Failed to save. Please try again.",
        type: "error",
      });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMsg({ text: "", type: "" });
    if (!currentPw) {
      setPwMsg({ text: "Please enter your current password.", type: "error" });
      return;
    }
    if (newPw.length < 8) {
      setPwMsg({
        text: "New password must be at least 8 characters.",
        type: "error",
      });
      return;
    }
    if (newPw !== confirmPw) {
      setPwMsg({ text: "New passwords do not match.", type: "error" });
      return;
    }
    if (newPw === currentPw) {
      setPwMsg({
        text: "New password must differ from current.",
        type: "error",
      });
      return;
    }

    setPwSaving(true);
    try {
      const hashedCurrent = await hashPassword(currentPw);
      const users = JSON.parse(localStorage.getItem("users") || "[]");
      const idx = users.findIndex((u) => u.email === userData.email);
      if (idx === -1) {
        setPwMsg({ text: "User not found.", type: "error" });
        return;
      }
      if (users[idx].password !== hashedCurrent) {
        setPwMsg({ text: "Current password is incorrect.", type: "error" });
        return;
      }
      const hashedNew = await hashPassword(newPw);
      users[idx].password = hashedNew;
      localStorage.setItem("users", JSON.stringify(users));
      const stored = JSON.parse(localStorage.getItem("userData") || "{}");
      stored.password = hashedNew;
      localStorage.setItem("userData", JSON.stringify(stored));
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setPwMsg({ text: "✅ Password changed successfully!", type: "success" });
    } catch {
      setPwMsg({ text: "Failed to change password.", type: "error" });
    } finally {
      setPwSaving(false);
    }
  };

  const pwStrength =
    newPw.length === 0
      ? null
      : newPw.length < 8
        ? { label: "Too short", cls: "weak", pct: 20 }
        : newPw.length < 12
          ? { label: "Fair", cls: "fair", pct: 50 }
          : newPw.length < 16
            ? { label: "Good", cls: "good", pct: 75 }
            : { label: "Strong 💪", cls: "strong", pct: 100 };

  if (!isOpen) return null;

  return (
    <div className="usm-overlay" onClick={overlayClick}>
      <div
        className="usm-modal"
        ref={modalRef}
        role="dialog"
        aria-label="User Settings"
      >
        <header className="usm-header">
          <div className="usm-header__left">
            <span className="usm-header__icon">⚙️</span>
            <div>
              <h2 className="usm-header__title">Account Settings</h2>
              <p className="usm-header__sub">
                {userData?.userName || "Your account"}
              </p>
            </div>
          </div>
          <button className="usm-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        {/* Tabs */}
        <div className="usm-tabs">
          <button
            className={`usm-tab ${tab === "profile" ? "is-active" : ""}`}
            onClick={() => setTab("profile")}
          >
            👤 Edit Profile
          </button>
          <button
            className={`usm-tab ${tab === "password" ? "is-active" : ""}`}
            onClick={() => setTab("password")}
          >
            🔒 Change Password
          </button>
          <button
            className={`usm-tab ${tab === "appearance" ? "is-active" : ""}`}
            onClick={() => setTab("appearance")}
          >
            🎨 Appearance
          </button>
        </div>

        <div className="usm-body">
          {/* ── Profile tab ── */}
          {tab === "profile" && (
            <form className="usm-form" onSubmit={handleSaveProfile}>
              <p className="usm-form__intro">
                Update your display name, email, and profile photo.
              </p>

              <div className="usm-avatar-section">
                <div className="usm-avatar-wrap">
                  <img
                    className="usm-avatar-preview"
                    src={avatarPreview || DEFAULT_AVATAR}
                    alt="Avatar preview"
                    onError={(e) => {
                      e.target.src = DEFAULT_AVATAR;
                    }}
                  />
                  <button
                    type="button"
                    className="usm-avatar-edit-btn"
                    onClick={() => fileInputRef.current?.click()}
                    title="Change profile photo"
                  >
                    📷
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleAvatarFile}
                />
                <div className="usm-avatar-info">
                  <p className="usm-avatar-hint">
                    Click the camera icon to upload a new profile photo.
                  </p>
                  {avatarFile && (
                    <p className="usm-avatar-filename">
                      Selected: <strong>{avatarFile.name}</strong>
                    </p>
                  )}
                  {uploading && (
                    <p className="usm-avatar-hint">Uploading photo…</p>
                  )}
                </div>
              </div>

              <div className="usm-field">
                <label className="usm-label" htmlFor="usm-username">
                  Username
                </label>
                <input
                  id="usm-username"
                  className="usm-input"
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Your display name"
                  required
                />
              </div>
              <div className="usm-field">
                <label className="usm-label" htmlFor="usm-email">
                  Email Address
                </label>
                <input
                  id="usm-email"
                  className="usm-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </div>

              {profileMsg.text && (
                <p className={`usm-msg usm-msg--${profileMsg.type}`}>
                  {profileMsg.text}
                </p>
              )}

              <div className="usm-footer">
                <button type="button" className="usm-btn" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="usm-btn usm-btn--save"
                  disabled={profileSaving || uploading}
                >
                  {uploading
                    ? "Uploading…"
                    : profileSaving
                      ? "Saving…"
                      : "Save Changes"}
                </button>
              </div>
            </form>
          )}

          {/* ── Password tab ── */}
          {tab === "password" && (
            <form className="usm-form" onSubmit={handleChangePassword}>
              <p className="usm-form__intro">
                Choose a strong password of at least 8 characters.
              </p>

              {[
                {
                  id: "usm-current-pw",
                  label: "Current Password",
                  val: currentPw,
                  set: setCurrentPw,
                  ph: "Enter current password",
                },
                {
                  id: "usm-new-pw",
                  label: "New Password",
                  val: newPw,
                  set: setNewPw,
                  ph: "At least 8 characters",
                },
                {
                  id: "usm-confirm-pw",
                  label: "Confirm Password",
                  val: confirmPw,
                  set: setConfirmPw,
                  ph: "Repeat new password",
                },
              ].map(({ id, label, val, set, ph }) => (
                <div key={id} className="usm-field">
                  <label className="usm-label" htmlFor={id}>
                    {label}
                  </label>
                  <input
                    id={id}
                    className="usm-input"
                    type={showPw ? "text" : "password"}
                    value={val}
                    onChange={(e) => set(e.target.value)}
                    placeholder={ph}
                    required
                  />
                </div>
              ))}

              <label className="usm-show-pw">
                <input
                  type="checkbox"
                  checked={showPw}
                  onChange={() => setShowPw((v) => !v)}
                />
                Show passwords
              </label>

              {pwStrength && (
                <div className="usm-strength">
                  <div className="usm-strength__bar">
                    <div
                      className={`usm-strength__fill usm-strength__fill--${pwStrength.cls}`}
                      style={{ width: `${pwStrength.pct}%` }}
                    />
                  </div>
                  <span className="usm-strength__label">
                    {pwStrength.label}
                  </span>
                </div>
              )}

              {pwMsg.text && (
                <p className={`usm-msg usm-msg--${pwMsg.type}`}>{pwMsg.text}</p>
              )}

              <div className="usm-footer">
                <button type="button" className="usm-btn" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="usm-btn usm-btn--save"
                  disabled={pwSaving}
                >
                  {pwSaving ? "Updating…" : "Change Password"}
                </button>
              </div>
            </form>
          )}

          {/* ── Appearance tab ── */}
          {tab === "appearance" && (
            <div className="usm-appearance">
              <p className="usm-form__intro">
                Customize the background for the closet page and each clothing
                section. Changes apply instantly and are saved automatically.
              </p>

              {/* Page background */}
              <BgPicker
                targetKey={PAGE_BG_KEY}
                label="🏠 Closet Page Background"
              />

              <div className="usm-appearance__divider" />

              {/* All 6 section backgrounds */}
              <p className="usm-appearance__section-title">
                Section Card Backgrounds
              </p>
              <div className="usm-appearance__sections">
                {SECTION_OPTIONS.map((s) => (
                  <BgPicker key={s.tag} targetKey={s.tag} label={s.label} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
