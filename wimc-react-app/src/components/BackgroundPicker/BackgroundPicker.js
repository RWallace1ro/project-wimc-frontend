import React, { useState, useRef } from "react";
import { uploadImage } from "../../utils/CloudinaryAPI";
import { useBackground } from "../../context/BackgroundContext";
import { BACKGROUND_PRESETS, resolveBackgroundValue } from "../../utils/backgroundPresets";
import "./BackgroundPicker.css";

const SECTION_LABELS = {
  "dresses-skirts":    "Dresses/Skirts",
  "dress-shirts-suits":"Dress Shirts/Suits",
  "shoes-sneakers":    "Shoes/Sneakers",
  "pants-jeans":       "Pants/Jeans",
  tops:                "Tops",
  "bags-accessories":  "Bags/Accessories",
  "jackets-coats":     "Jackets/Coats",
  blazers:             "Blazers",
};

const COLOR_PREFIX = "color:";

// Colour palette — shown as solid swatches, applied as card background colour
const COLOR_PALETTE = [
  { id: "ivory",       label: "Ivory",        value: "#FFFFF0" },
  { id: "cream",       label: "Cream",        value: "#FFF8DC" },
  { id: "blush",       label: "Blush Pink",   value: "#FFE4E1" },
  { id: "rose",        label: "Rose",         value: "#F4A7B9" },
  { id: "mauve",       label: "Mauve",        value: "#C8A2C8" },
  { id: "lavender",    label: "Lavender",     value: "#E6E0F8" },
  { id: "periwinkle",  label: "Periwinkle",   value: "#CCCCFF" },
  { id: "sky",         label: "Sky Blue",     value: "#BFD7ED" },
  { id: "powder",      label: "Powder Blue",  value: "#B0E0E6" },
  { id: "mint",        label: "Mint",         value: "#C8E6C9" },
  { id: "sage",        label: "Sage Green",   value: "#B2C5B2" },
  { id: "linen",       label: "Warm Linen",   value: "#F5F0E8" },
  { id: "sand",        label: "Sand",         value: "#F5DEB3" },
  { id: "caramel",     label: "Caramel",      value: "#C68642" },
  { id: "terracotta",  label: "Terracotta",   value: "#C1603E" },
  { id: "slate",       label: "Slate",        value: "#708090" },
  { id: "charcoal",    label: "Charcoal",     value: "#36454F" },
  { id: "midnight",    label: "Midnight Blue",value: "#191970" },
  { id: "black",       label: "Black",        value: "#1a1a1a" },
  { id: "white",       label: "White",        value: "#FFFFFF" },
];

export default function BackgroundPicker({ isOpen, onClose, section }) {
  const { getBackground, setBackground, resetBackground } = useBackground();
  const [activeTab, setActiveTab] = useState("photos");
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const [saved, setSaved] = useState(false);
  const fileRef = useRef(null);

  const currentBg = getBackground(section);
  const isColor   = currentBg?.startsWith(COLOR_PREFIX);
  const currentColor = isColor ? currentBg.replace(COLOR_PREFIX, "") : null;

  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 1500); };

  const handleColor = (hex) => {
    setBackground(section, COLOR_PREFIX + hex);
    flash();
  };

  const handlePreset = (url) => {
    setBackground(section, url);
    flash();
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadErr("");
    try {
      const res = await uploadImage(file, "wimc-backgrounds");
      if (res?.secure_url) {
        setBackground(section, res.secure_url);
        flash();
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
    flash();
  };

  if (!isOpen) return null;

  const label = SECTION_LABELS[section] || section;

  // Preview swatch for the current background
  const previewStyle = isColor
    ? { backgroundColor: currentColor }
    : currentBg
      ? { backgroundImage: `url(${resolveBackgroundValue(currentBg)})`, backgroundSize: "cover", backgroundPosition: "center" }
      : {};

  return (
    <div
      className="bgp-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
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
          <button className="bgp-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        {/* Current preview */}
        <div className="bgp-current" style={previewStyle}>
          {!currentBg && (
            <span className="bgp-current__placeholder">Default background</span>
          )}
          {saved && <span className="bgp-saved-badge">✅ Saved!</span>}
        </div>

        {/* Tabs */}
        <div className="bgp-tabs">
          <button
            className={`bgp-tab${activeTab === "photos" ? " is-active" : ""}`}
            onClick={() => setActiveTab("photos")}
          >
            🧱 Wall Photos
          </button>
          <button
            className={`bgp-tab${activeTab === "colors" ? " is-active" : ""}`}
            onClick={() => setActiveTab("colors")}
          >
            🎨 Colors
          </button>
          <button
            className={`bgp-tab${activeTab === "image" ? " is-active" : ""}`}
            onClick={() => setActiveTab("image")}
          >
            🖼️ Custom Image
          </button>
        </div>

        <div className="bgp-body">
          {activeTab === "photos" && (
            <>
              <p className="bgp-tip">
                Closet wall panels and wallpapers — shown <strong>behind</strong> your clothing images as a card background.
              </p>
              <div className="bgp-preset-grid">
                {BACKGROUND_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    className={`bgp-preset${currentBg === p.url ? " is-active" : ""}`}
                    onClick={() => handlePreset(p.url)}
                    title={p.label}
                  >
                    <div
                      className="bgp-preset__thumb"
                      style={{ backgroundImage: `url(${p.preview || p.url})` }}
                    />
                    <span className="bgp-preset__name">{p.label}</span>
                    {currentBg === p.url && (
                      <span className="bgp-preset__check">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          {activeTab === "colors" && (
            <>
              <p className="bgp-tip">
                The selected colour shows <strong>behind</strong> your clothing images as a card background.
              </p>
              <div className="bgp-color-grid">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c.id}
                    className={`bgp-color-swatch${currentColor === c.value ? " is-active" : ""}`}
                    style={{ backgroundColor: c.value }}
                    onClick={() => handleColor(c.value)}
                    title={c.label}
                    aria-label={c.label}
                  >
                    {currentColor === c.value && (
                      <span className="bgp-color-swatch__check">✓</span>
                    )}
                    <span className="bgp-color-swatch__label">{c.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {activeTab === "image" && (
            <>
              <p className="bgp-tip">
                Upload a custom image to use as your card background. The image shows <strong>behind</strong> your clothing photos.
              </p>
              <div
                className="bgp-upload-area"
                onClick={() => fileRef.current?.click()}
              >
                <p>🖼️ Tap to upload your own image</p>
                <p className="bgp-upload-hint">JPG, PNG, WebP — recommended 1920×1080 or larger</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleFile}
                />
              </div>
              {uploading && <p className="bgp-uploading">Uploading…</p>}
              {uploadErr  && <p className="bgp-err">{uploadErr}</p>}
            </>
          )}

          {currentBg && (
            <button className="bgp-reset-btn" onClick={handleReset}>
              ↩️ Reset to default
            </button>
          )}
        </div>

        <footer className="bgp-footer">
          <button className="bgp-btn bgp-btn--close" onClick={onClose}>Done</button>
        </footer>
      </div>
    </div>
  );
}
