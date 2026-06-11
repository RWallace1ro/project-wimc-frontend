import React, { useState, useEffect } from "react";
import "./KidsProfileModal.css";

const AGE_GROUPS = [
  { value: "baby", label: "Baby", range: "0–12 months" },
  { value: "toddler", label: "Toddler", range: "1–3 years" },
  { value: "kids", label: "Kids", range: "4–12 years" },
  { value: "teen", label: "Teen", range: "13–17 years" },
];

const CLOTHING_SIZES_US = [
  "Preemie",
  "NB",
  "0-3M",
  "3-6M",
  "6-9M",
  "9-12M",
  "12-18M",
  "18-24M",
  "2T",
  "3T",
  "4T",
  "5T",
  "4",
  "5",
  "6",
  "6X",
  "7",
  "8",
  "10",
  "12",
  "14",
  "16",
  "18",
  "XS",
  "S",
  "M",
  "L",
  "XL",
];
const CLOTHING_SIZES_EU = [
  "44",
  "50",
  "56",
  "62",
  "68",
  "74",
  "80",
  "86",
  "92",
  "98",
  "104",
  "110",
  "116",
  "122",
  "128",
  "134",
  "140",
  "146",
  "152",
  "158",
  "164",
  "170",
  "176",
];
const SHOE_SIZES_US = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "1Y",
  "2Y",
  "3Y",
  "4Y",
  "5Y",
  "6Y",
  "7Y",
];
const SHOE_SIZES_EU = [
  "15",
  "16",
  "17",
  "18",
  "19",
  "20",
  "21",
  "22",
  "23",
  "24",
  "25",
  "26",
  "27",
  "28",
  "29",
  "30",
  "31",
  "32",
  "33",
  "34",
  "35",
  "36",
  "37",
  "38",
  "39",
  "40",
];

const EMPTY = {
  name: "",
  gender: "female",
  ageGroup: "baby",
  age: "",
  clothingSizeUS: "",
  clothingSizeEU: "",
  shoeSizeUS: "",
  shoeSizeEU: "",
  favoriteColors: "",
  favoriteStyles: "",
  notes: "",
};

export default function KidsProfileModal({ isOpen, onClose, onSave, profile }) {
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
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const set = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setErr("Please enter the child's name.");
      return;
    }
    if (!form.ageGroup) {
      setErr("Please select an age group.");
      return;
    }
    setErr("");
    onSave(form);
  };

  if (!isOpen) return null;

  return (
    <div
      className="kpm-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="kpm-modal" role="dialog" aria-label="Child Profile">
        <header className="kpm-header">
          <h2 className="kpm-title">
            {profile ? "Edit Profile" : "Add Child"}
          </h2>
          <button className="kpm-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <form className="kpm-form" onSubmit={handleSubmit}>
          {/* Name */}
          <div className="kpm-field">
            <label className="kpm-label">Child's Name *</label>
            <input
              className="kpm-input"
              type="text"
              placeholder="e.g. Emma"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
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
                👧 Female
              </button>
              <button
                type="button"
                className={`kpm-gender-btn${form.gender === "male" ? " is-active" : ""}`}
                onClick={() => set("gender", "male")}
              >
                👦 Male
              </button>
            </div>
          </div>

          {/* Age group */}
          <div className="kpm-field">
            <label className="kpm-label">Age Group *</label>
            <div className="kpm-age-groups">
              {AGE_GROUPS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  className={`kpm-age-btn ${form.ageGroup === g.value ? "is-active" : ""}`}
                  onClick={() => set("ageGroup", g.value)}
                >
                  <span className="kpm-age-btn__label">{g.label}</span>
                  <span className="kpm-age-btn__range">{g.range}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Specific age */}
          <div className="kpm-field">
            <label className="kpm-label">Current Age</label>
            <input
              className="kpm-input"
              type="text"
              placeholder="e.g. 2 years 4 months, or 8 years"
              value={form.age}
              onChange={(e) => set("age", e.target.value)}
            />
          </div>

          {/* Clothing sizes */}
          <div className="kpm-field">
            <label className="kpm-label">👕 Clothing Size</label>
            <div className="kpm-size-row">
              <div className="kpm-size-col">
                <span className="kpm-size-badge">US</span>
                <select
                  className="kpm-select"
                  value={form.clothingSizeUS}
                  onChange={(e) => set("clothingSizeUS", e.target.value)}
                >
                  <option value="">Select</option>
                  {CLOTHING_SIZES_US.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="kpm-size-col">
                <span className="kpm-size-badge">EU</span>
                <select
                  className="kpm-select"
                  value={form.clothingSizeEU}
                  onChange={(e) => set("clothingSizeEU", e.target.value)}
                >
                  <option value="">Select</option>
                  {CLOTHING_SIZES_EU.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Shoe sizes */}
          <div className="kpm-field">
            <label className="kpm-label">👟 Shoe Size</label>
            <div className="kpm-size-row">
              <div className="kpm-size-col">
                <span className="kpm-size-badge">US</span>
                <select
                  className="kpm-select"
                  value={form.shoeSizeUS}
                  onChange={(e) => set("shoeSizeUS", e.target.value)}
                >
                  <option value="">Select</option>
                  {SHOE_SIZES_US.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="kpm-size-col">
                <span className="kpm-size-badge">EU</span>
                <select
                  className="kpm-select"
                  value={form.shoeSizeEU}
                  onChange={(e) => set("shoeSizeEU", e.target.value)}
                >
                  <option value="">Select</option>
                  {SHOE_SIZES_EU.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Favorite colors */}
          <div className="kpm-field">
            <label className="kpm-label">🎨 Favorite Colors</label>
            <input
              className="kpm-input"
              type="text"
              placeholder="e.g. Pink, Purple, Blue"
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
              placeholder="e.g. Casual, Sporty, Princess dresses"
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
              placeholder="Allergies, preferences, anything useful for gift-givers…"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>

          {err && <p className="kpm-error">{err}</p>}

          <div className="kpm-footer">
            <button type="button" className="kpm-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="kpm-btn kpm-btn--save">
              {profile ? "Save Changes" : "Add Child"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
