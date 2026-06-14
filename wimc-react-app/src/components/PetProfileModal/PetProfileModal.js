import React, { useState, useEffect } from "react";
// Reuse the Kids profile modal styling for an identical look & feel.
import "../KidsProfileModal/KidsProfileModal.css";

const SPECIES = [
  { value: "dog",   label: "Dog",   icon: "🐕" },
  { value: "cat",   label: "Cat",   icon: "🐈" },
  { value: "other", label: "Other", icon: "🐾" },
];

// Pet apparel is sized by letter (brand-dependent) plus key body measurements.
const APPAREL_SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL"];

const EMPTY = {
  name: "",
  species: "dog",
  gender: "female",
  breed: "",
  age: "",
  weight: "",
  apparelSize: "",
  backLength: "",   // inches — base of neck to base of tail
  neckSize: "",     // inches — collar
  chestSize: "",    // inches — girth behind front legs
  favoriteColors: "",
  favoriteStyles: "",
  notes: "",
};

export default function PetProfileModal({ isOpen, onClose, onSave, profile }) {
  const [form, setForm] = useState(EMPTY);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (isOpen) {
      setForm(profile ? { ...EMPTY, ...profile } : EMPTY);
      setErr("");
    }
  }, [isOpen, profile]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setErr("Please enter your pet's name.");
      return;
    }
    if (!form.species) {
      setErr("Please select a species.");
      return;
    }
    setErr("");
    onSave(form);
  };

  if (!isOpen) return null;

  return (
    <div
      className="kpm-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="kpm-modal" role="dialog" aria-label="Pet Profile">
        <header className="kpm-header">
          <h2 className="kpm-title">{profile ? "Edit Pet" : "Add Pet"}</h2>
          <button className="kpm-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <form className="kpm-form" onSubmit={handleSubmit}>
          {/* Name */}
          <div className="kpm-field">
            <label className="kpm-label">Pet's Name *</label>
            <input
              className="kpm-input"
              type="text"
              placeholder="e.g. Bella"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
          </div>

          {/* Species */}
          <div className="kpm-field">
            <label className="kpm-label">Species *</label>
            <div className="kpm-age-groups">
              {SPECIES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  className={`kpm-age-btn ${form.species === s.value ? "is-active" : ""}`}
                  onClick={() => set("species", s.value)}
                >
                  <span className="kpm-age-btn__label">{s.icon} {s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Gender */}
          <div className="kpm-field">
            <label className="kpm-label">Gender</label>
            <div className="kpm-gender-toggle">
              <button
                type="button"
                className={`kpm-gender-btn${form.gender === "female" || !form.gender ? " is-active" : ""}`}
                onClick={() => set("gender", "female")}
              >
                ♀ Female
              </button>
              <button
                type="button"
                className={`kpm-gender-btn${form.gender === "male" ? " is-active" : ""}`}
                onClick={() => set("gender", "male")}
              >
                ♂ Male
              </button>
            </div>
          </div>

          {/* Breed */}
          <div className="kpm-field">
            <label className="kpm-label">Breed</label>
            <input
              className="kpm-input"
              type="text"
              placeholder="e.g. Golden Retriever, Tabby, Mixed"
              value={form.breed}
              onChange={(e) => set("breed", e.target.value)}
            />
          </div>

          {/* Age + Weight */}
          <div className="kpm-field">
            <label className="kpm-label">Age & Weight</label>
            <div className="kpm-size-row">
              <div className="kpm-size-col">
                <span className="kpm-size-badge">Age</span>
                <input
                  className="kpm-input"
                  type="text"
                  placeholder="e.g. 3 years"
                  value={form.age}
                  onChange={(e) => set("age", e.target.value)}
                />
              </div>
              <div className="kpm-size-col">
                <span className="kpm-size-badge">Weight</span>
                <input
                  className="kpm-input"
                  type="text"
                  placeholder="e.g. 24 lbs"
                  value={form.weight}
                  onChange={(e) => set("weight", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Apparel size */}
          <div className="kpm-field">
            <label className="kpm-label">🧥 Apparel Size</label>
            <select
              className="kpm-select"
              value={form.apparelSize}
              onChange={(e) => set("apparelSize", e.target.value)}
            >
              <option value="">Select</option>
              {APPAREL_SIZES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Measurements */}
          <div className="kpm-field">
            <label className="kpm-label">📏 Measurements (inches)</label>
            <div className="kpm-size-row">
              <div className="kpm-size-col">
                <span className="kpm-size-badge">Back</span>
                <input
                  className="kpm-input"
                  type="text"
                  placeholder='e.g. 16"'
                  value={form.backLength}
                  onChange={(e) => set("backLength", e.target.value)}
                />
              </div>
              <div className="kpm-size-col">
                <span className="kpm-size-badge">Neck</span>
                <input
                  className="kpm-input"
                  type="text"
                  placeholder='e.g. 12"'
                  value={form.neckSize}
                  onChange={(e) => set("neckSize", e.target.value)}
                />
              </div>
              <div className="kpm-size-col">
                <span className="kpm-size-badge">Chest</span>
                <input
                  className="kpm-input"
                  type="text"
                  placeholder='e.g. 20"'
                  value={form.chestSize}
                  onChange={(e) => set("chestSize", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Favorite colors */}
          <div className="kpm-field">
            <label className="kpm-label">🎨 Favorite Colors</label>
            <input
              className="kpm-input"
              type="text"
              placeholder="e.g. Red, Plaid, Pastel"
              value={form.favoriteColors}
              onChange={(e) => set("favoriteColors", e.target.value)}
            />
          </div>

          {/* Favorite styles */}
          <div className="kpm-field">
            <label className="kpm-label">✨ Favorite Styles</label>
            <input
              className="kpm-input"
              type="text"
              placeholder="e.g. Cozy sweaters, Raincoats, Costumes"
              value={form.favoriteStyles}
              onChange={(e) => set("favoriteStyles", e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="kpm-field">
            <label className="kpm-label">📝 Notes (optional)</label>
            <input
              type="text"
              className="kpm-textarea"
              placeholder="Allergies, fit preferences, anything useful…"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>

          {err && <p className="kpm-error">{err}</p>}

          <div className="kpm-footer">
            <button type="button" className="kpm-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="kpm-btn kpm-btn--save">
              {profile ? "Save Changes" : "Add Pet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
