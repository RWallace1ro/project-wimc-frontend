import React, { useState, useRef } from "react";
import { uploadImage } from "../../utils/CloudinaryAPI";
import { useBackground } from "../../context/BackgroundContext";
import "./BackgroundPicker.css";

const SECTION_LABELS = {
  "dresses-skirts": "Dresses/Skirts",
  "shoes-sneakers": "Shoes/Sneakers",
  "pants-jeans": "Pants/Jeans",
  tops: "Tops",
  "bags-accessories": "Bags/Accessories",
  "jackets-coats": "Jackets/Coats",
};

// Preset backgrounds — elegant closet-themed images from Unsplash (free)
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

export default function BackgroundPicker({ isOpen, onClose, section }) {
  const { getBackground, setBackground, resetBackground } = useBackground();
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const [preview, setPreview] = useState(null);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef(null);

  const currentBg = getBackground(section);

  const handlePreset = (url) => {
    setBackground(section, url);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadErr("");
    setPreview(URL.createObjectURL(file));
    try {
      const res = await uploadImage(file, "wimc-backgrounds");
      if (res?.secure_url) {
        setBackground(section, res.secure_url);
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      } else {
        setUploadErr("Upload failed. Please try again.");
      }
    } catch {
      setUploadErr("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    resetBackground(section);
    setPreview(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  if (!isOpen) return null;

  const label = SECTION_LABELS[section] || section;

  return (
    <div
      className="bgp-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bgp-modal" role="dialog" aria-label="Background Picker">
        <header className="bgp-header">
          <div className="bgp-header__left">
            <span className="bgp-header__icon">🎨</span>
            <div>
              <h2 className="bgp-header__title">Customize Background</h2>
              <p className="bgp-header__sub">{label}</p>
            </div>
          </div>
          <button className="bgp-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="bgp-body">
          {/* Current background preview */}
          <div
            className="bgp-current"
            style={{ backgroundImage: `url(${preview || currentBg || ""})` }}
          >
            {!preview && !currentBg && (
              <span className="bgp-current__placeholder">
                Default background
              </span>
            )}
            {saved && <span className="bgp-saved-badge">✅ Saved!</span>}
          </div>

          {/* Preset grid */}
          <div className="bgp-section-title">Choose a Preset</div>
          <div className="bgp-presets">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                className={`bgp-preset ${currentBg === p.url ? "is-active" : ""}`}
                onClick={() => handlePreset(p.url)}
                title={p.label}
              >
                <div
                  className="bgp-preset__thumb"
                  style={{ backgroundImage: `url(${p.url})` }}
                />
                <span className="bgp-preset__label">{p.label}</span>
                {currentBg === p.url && (
                  <span className="bgp-preset__check">✓</span>
                )}
              </button>
            ))}
          </div>

          {/* Upload custom */}
          <div className="bgp-section-title">Upload Custom Background</div>
          <div
            className="bgp-upload-area"
            onClick={() => fileRef.current?.click()}
          >
            <p>🖼️ Tap to upload your own image</p>
            <p className="bgp-upload-hint">
              JPG, PNG, WebP — recommended 1920×1080 or larger
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFile}
            />
          </div>
          {uploading && <p className="bgp-uploading">Uploading…</p>}
          {uploadErr && <p className="bgp-err">{uploadErr}</p>}

          {/* Reset */}
          {currentBg && (
            <button className="bgp-reset-btn" onClick={handleReset}>
              ↩️ Reset to default
            </button>
          )}
        </div>

        <footer className="bgp-footer">
          <button className="bgp-btn bgp-btn--close" onClick={onClose}>
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}
