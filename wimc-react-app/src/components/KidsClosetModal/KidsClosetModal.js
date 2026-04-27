import React, { useState, useEffect } from "react";
import { fetchImagesByTag, fetchVideosByTag } from "../../utils/CloudinaryAPI";
import ClosetSectionCard from "../ClosetSectionCard/ClosetSectionCard";
import ClosetSectionModal from "../ClosetSectionModal/ClosetSectionModal";
import AddClothingModal from "../AddClothingModal/AddClothingModal";
import "./KidsClosetModal.css";

const SECTIONS = [
  { tag: "dresses-skirts", label: "Dresses/Skirts" },
  { tag: "shoes-sneakers", label: "Shoes/Sneakers" },
  { tag: "pants-jeans", label: "Pants/Jeans" },
  { tag: "tops", label: "Tops" },
  { tag: "bags-accessories", label: "Bags/Accessories" },
  { tag: "jackets-coats", label: "Jackets/Coats" },
];

// Tag items per child so they don't mix with the adult closet
function childTag(childId, section) {
  return `kid-${childId}-${section}`;
}

export default function KidsClosetModal({ child, onClose }) {
  const [closetItems, setClosetItems] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load images for the first section on open
  useEffect(() => {
    if (!child) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [child, onClose]);

  const fetchSection = async (section) => {
    setLoading(true);
    try {
      const tag = childTag(child.id, section);
      const imgs = await fetchImagesByTag(tag);
      setClosetItems(imgs || []);
    } catch {
      setClosetItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (section) => {
    setSelectedSection(section);
    setIsModalOpen(true);
    fetchSection(section);
  };

  const handleAddClothing = (item) => {
    const url = item?.mediaThumb || item?.mediaUrl || item?.imageUrl || item;
    if (url && typeof url === "string")
      setClosetItems((prev) => [...prev, url]);
    setIsAddOpen(false);
  };

  if (!child) return null;

  const GROUP_ICONS = { baby: "👶", toddler: "🧒", kids: "🧑", teen: "🧑‍🎓" };

  return (
    <div
      className="kcm-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="kcm-modal"
        role="dialog"
        aria-label={`${child.name}'s Closet`}
      >
        {/* Header */}
        <header className="kcm-header">
          <div className="kcm-header__left">
            <span className="kcm-header__icon">
              {GROUP_ICONS[child.ageGroup] || "👶"}
            </span>
            <div>
              <h2 className="kcm-header__title">{child.name}'s Closet</h2>
              <p className="kcm-header__sub">
                {child.ageGroup} · {child.age} &nbsp;|&nbsp; 👕 US{" "}
                {child.clothingSizeUS || "—"} / EU {child.clothingSizeEU || "—"}{" "}
                &nbsp;|&nbsp; 👟 US {child.shoeSizeUS || "—"} / EU{" "}
                {child.shoeSizeEU || "—"}
              </p>
            </div>
          </div>
          <div className="kcm-header__actions">
            <button
              className="kcm-header__add-btn"
              onClick={() => {
                setSelectedSection(null);
                setIsAddOpen(true);
              }}
            >
              + Add Item
            </button>
            <button
              className="kcm-header__close"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </header>

        {/* Section cards */}
        <div className="kcm-body">
          {loading && <p className="kcm-loading">Loading…</p>}
          <div className="kcm-grid">
            {SECTIONS.map((sec) => (
              <ClosetSectionCard
                key={sec.tag}
                sectionName={sec.label}
                tag={childTag(child.id, sec.tag)}
                placeholderUrl={null}
                onClick={() => handleCardClick(sec.tag)}
                onAdd={() => {
                  setSelectedSection(sec.tag);
                  setIsAddOpen(true);
                }}
              />
            ))}
          </div>
        </div>

        {/* Section viewer */}
        <ClosetSectionModal
          isOpen={isModalOpen}
          sectionName={
            selectedSection
              ? SECTIONS.find((s) => s.tag === selectedSection)?.label
              : ""
          }
          onClose={() => {
            setIsModalOpen(false);
            setSelectedSection(null);
          }}
          onAddItem={(tag) => {
            setIsModalOpen(false);
            setSelectedSection(tag.replace(`kid-${child.id}-`, ""));
            setIsAddOpen(true);
          }}
        />

        {/* Add clothing */}
        <AddClothingModal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          onClothingAdded={handleAddClothing}
          initialCategory={
            selectedSection ? childTag(child.id, selectedSection) : ""
          }
        />
      </div>
    </div>
  );
}
