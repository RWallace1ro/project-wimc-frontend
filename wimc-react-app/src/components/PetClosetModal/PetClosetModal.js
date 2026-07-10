import React, { useState, useEffect, useRef } from "react";
import { fetchImagesByTag, uploadImage } from "../../utils/CloudinaryAPI";
import { useBackground } from "../../context/BackgroundContext";
import ClosetSectionCard from "../ClosetSectionCard/ClosetSectionCard";
import ClosetSectionModal from "../ClosetSectionModal/ClosetSectionModal";
import AddClothingModal from "../AddClothingModal/AddClothingModal";
import OutfitPreviewPanel from "../OutfitPreviewPanel/OutfitPreviewPanel";
import OutfitPlanner from "../OutfitPlanner/OutfitPlanner";
import TravelPackPanel from "../TravelPackPanel/TravelPackPanel";
import ClosetSearch from "../ClosetSearch/ClosetSearch";
import WishList from "../WishList/WishList";
import DonateBin from "../DonateBin/DonateBin";
import dressesSkirtsImg   from "../../assets/images/dresses-skirts.jpg";
import shoesSneakersImg   from "../../assets/images/shoes-sneakers.jpg";
import pantsJeansImg      from "../../assets/images/pants-jeans.jpg";
import topsImg            from "../../assets/images/tops.jpg";
import bagsAccessoriesImg from "../../assets/images/bags-accessories.jpg";
import jacketsCoatsImg    from "../../assets/images/jackets-coats.jpg";
// Reuse the Kids closet modal styling for an identical look & feel.
import "../KidsClosetModal/KidsClosetModal.css";

// Pet-twist sections. The underlying Cloudinary `tag` stays standard so every
// shared feature panel (Outfit Preview/Planner, Travel Pack, Donate, Search)
// works unchanged — only the card label & icon get the pet spin.
const SECTIONS = [
  { tag: "jackets-coats",    label: "🧥 Sweaters/Coats",    placeholder: jacketsCoatsImg },
  { tag: "tops",             label: "👕 Shirts/Tops",       placeholder: topsImg },
  { tag: "dresses-skirts",   label: "🎽 Costumes/Dresses",  placeholder: dressesSkirtsImg },
  { tag: "bags-accessories", label: "🎀 Bandanas/Bows",     placeholder: bagsAccessoriesImg },
  { tag: "shoes-sneakers",   label: "🥾 Booties/Paw Wear",  placeholder: shoesSneakersImg },
  { tag: "pants-jeans",      label: "🦺 Collars/Harnesses", placeholder: pantsJeansImg },
];

const SPECIES_ICONS = { dog: "🐕", cat: "🐈", other: "🐾" };

function petTag(petId, section) {
  return `pet-${petId}-${section}`;
}

const DOOR_MS = 3000;

// ── Background picker data (mirrored from Appearance tab in Settings) ─────────
const PRESETS = [
  { id: "dark-wood",    label: "Dark Wood",    url: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1200&q=80" },
  { id: "marble-white", label: "Marble White", url: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200&q=80" },
  { id: "blush-pink",   label: "Blush Pink",   url: "https://images.unsplash.com/photo-1595526051245-4506e0005bd0?w=1200&q=80" },
  { id: "midnight-blue",label: "Midnight Blue",url: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=1200&q=80" },
  { id: "sage-green",   label: "Sage Green",   url: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=1200&q=80" },
  { id: "warm-linen",   label: "Warm Linen",   url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80" },
  { id: "charcoal",     label: "Charcoal",     url: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=1200&q=80" },
  { id: "rose-gold",    label: "Rose Gold",    url: "https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=1200&q=80" },
];

const COLOR_PALETTE = [
  { id: "col-ivory",      label: "Ivory",      value: "#FFFFF0" },
  { id: "col-cream",      label: "Cream",      value: "#FFF8DC" },
  { id: "col-blush",      label: "Blush",      value: "#FFE4E1" },
  { id: "col-rose",       label: "Rose",       value: "#F4A7B9" },
  { id: "col-mauve",      label: "Mauve",      value: "#C8A2C8" },
  { id: "col-lavender",   label: "Lavender",   value: "#E6E0F8" },
  { id: "col-periwinkle", label: "Periwinkle", value: "#CCCCFF" },
  { id: "col-sky",        label: "Sky",        value: "#BFD7ED" },
  { id: "col-powder",     label: "Powder",     value: "#B0E0E6" },
  { id: "col-mint",       label: "Mint",       value: "#C8E6C9" },
  { id: "col-sage",       label: "Sage",       value: "#B2C5B2" },
  { id: "col-sage-dk",    label: "Sage Dark",  value: "#8FAF8F" },
  { id: "col-sand",       label: "Sand",       value: "#F5DEB3" },
  { id: "col-caramel",    label: "Caramel",    value: "#C68642" },
  { id: "col-terracotta", label: "Terracotta", value: "#C1603E" },
  { id: "col-slate",      label: "Slate",      value: "#708090" },
  { id: "col-charcoal",   label: "Charcoal",   value: "#36454F" },
  { id: "col-midnight",   label: "Midnight",   value: "#191970" },
  { id: "col-black",      label: "Black",      value: "#1a1a1a" },
  { id: "col-white",      label: "White",      value: "#FFFFFF" },
];

const COLOR_PREFIX = "color:";
const isColor = (val) => val && val.startsWith(COLOR_PREFIX);
const colorValue = (val) => val.replace(COLOR_PREFIX, "");

// ── Inline BgPicker (same UX as Appearance tab) ───────────────────────────────
function PcmBgPicker({ bgKey, onClose: closePicker }) {
  const { backgrounds, setBackground, resetBackground } = useBackground();
  const current = backgrounds[bgKey] || null;
  const fileRef = useRef(null);
  const [activeTab, setActiveTab] = useState("photos");
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(false);

  const pick = (val) => {
    setBackground(bgKey, val);
    setSaved(true);
    setTimeout(() => { setSaved(false); closePicker(); }, 800);
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
    } catch { setErr("Upload failed."); }
    finally { setUploading(false); }
  };

  return (
    <div className="kcm-bg-picker">
      <div className="kcm-bg-picker__header">
        <span className="kcm-bg-picker__title">🎨 Choose Background</span>
        {saved && <span className="kcm-bg-picker__saved">✅ Saved!</span>}
        <div className="kcm-bg-picker__header-actions">
          {current && (
            <button
              className="kcm-bg-picker__reset"
              onClick={() => { resetBackground(bgKey); closePicker(); }}
            >
              ↩️ Reset
            </button>
          )}
          <button className="kcm-bg-picker__close-btn" onClick={closePicker}>×</button>
        </div>
      </div>

      <div className="kcm-bg-tabs">
        <button className={`kcm-bg-tab ${activeTab === "photos" ? "is-active" : ""}`} onClick={() => setActiveTab("photos")}>🖼️ Photos</button>
        <button className={`kcm-bg-tab ${activeTab === "colors" ? "is-active" : ""}`} onClick={() => setActiveTab("colors")}>🎨 Colors</button>
      </div>

      {activeTab === "photos" && (
        <div className="kcm-bg-presets">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              className={`kcm-bg-preset ${current === p.url ? "is-active" : ""}`}
              onClick={() => pick(p.url)}
              title={p.label}
            >
              <div className="kcm-bg-preset__thumb" style={{ backgroundImage: `url(${p.url})` }} />
              <span className="kcm-bg-preset__name">{p.label}</span>
              {current === p.url && <span className="kcm-bg-preset__check">✓</span>}
            </button>
          ))}
          <button
            className="kcm-bg-preset kcm-bg-preset--upload"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            title="Upload custom image"
          >
            <div className="kcm-bg-preset__thumb kcm-bg-preset__thumb--upload">{uploading ? "…" : "🖼️"}</div>
            <span className="kcm-bg-preset__name">Custom</span>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
          </button>
        </div>
      )}

      {activeTab === "colors" && (
        <div className="kcm-color-palette">
          {COLOR_PALETTE.map((c) => {
            const encoded = `${COLOR_PREFIX}${c.value}`;
            const isActive = current === encoded;
            return (
              <button
                key={c.id}
                className={`kcm-color-swatch ${isActive ? "is-active" : ""}`}
                style={{ backgroundColor: c.value }}
                title={c.label}
                onClick={() => pick(encoded)}
              >
                {isActive && <span className="kcm-color-swatch__check">✓</span>}
              </button>
            );
          })}
        </div>
      )}

      {err && <p className="kcm-bg-err">{err}</p>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PetClosetModal({ pet, onClose, onUpdatePet }) {
  const { backgrounds } = useBackground();
  const bgKey = `pet-closet-${pet?.id}`;
  const currentBg = pet ? backgrounds[bgKey] || null : null;
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [petPreviewIncoming, setPetPreviewIncoming] = useState(null);
  const [petPlannerIncoming, setPetPlannerIncoming] = useState(null);
  const [petPackIncoming,    setPetPackIncoming]    = useState(null);
  const [petDonateIncoming,  setPetDonateIncoming]  = useState(null);

  const handlePetApplyItems = (items, target) => {
    const payload = { items, ts: Date.now() };
    if (target === "preview") setPetPreviewIncoming(payload);
    if (target === "planner") setPetPlannerIncoming(payload);
    if (target === "pack")    setPetPackIncoming(payload);
    if (target === "donate")  setPetDonateIncoming(payload);
  };

  // ── Profile photo ─────────────────────────────────────────────────────────
  const photoInputRef = useRef(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoErr, setPhotoErr] = useState("");

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdatePet) return;
    setPhotoUploading(true);
    setPhotoErr("");
    try {
      const res = await uploadImage(file, "pet-avatars");
      if (res?.secure_url) {
        onUpdatePet({ ...pet, photoUrl: res.secure_url });
      } else {
        setPhotoErr("Upload failed.");
      }
    } catch {
      setPhotoErr("Upload failed.");
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const bodyStyle = currentBg
    ? isColor(currentBg)
      ? { backgroundColor: colorValue(currentBg) }
      : { backgroundImage: `url(${currentBg})`, backgroundSize: "cover", backgroundPosition: "center" }
    : {};

  // ── Door animation ────────────────────────────────────────────────────────
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [doorsGone, setDoorsGone] = useState(false);

  // ── Closet state ──────────────────────────────────────────────────────────
  const [closetItems, setClosetItems] = useState([]); // eslint-disable-line no-unused-vars
  const [sectionThumbs, setSectionThumbs] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [recentUpload, setRecentUpload] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const arm   = setTimeout(() => setDoorsOpen(true), 50);
    const clear = setTimeout(() => setDoorsGone(true), DOOR_MS + 50);
    return () => { clearTimeout(arm); clearTimeout(clear); };
  }, []);

  useEffect(() => {
    if (!pet) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pet, onClose]);

  const fetchSection = async (section) => {
    setLoading(true);
    try {
      const tag  = petTag(pet.id, section);
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

  const handleSwitchSection = (newFullTag) => {
    const prefix = `pet-${pet.id}-`;
    const plainTag = newFullTag.startsWith(prefix)
      ? newFullTag.slice(prefix.length)
      : newFullTag;
    setSelectedSection(plainTag);
  };

  const handleAddClothing = (item) => {
    const url = item?.mediaThumb || item?.mediaUrl || item?.imageUrl || item;
    const actualSection = item?.category || selectedSection;
    if (url && typeof url === "string") {
      setClosetItems((prev) => [...prev, url]);
      if (actualSection) {
        const tag = petTag(pet.id, actualSection);
        setSectionThumbs((prev) => ({ ...prev, [tag]: url }));
        setRecentUpload({ tag, url, mediaType: item?.mediaType || "image", ts: Date.now() });
      }
    }
    setIsAddOpen(false);
  };

  if (!pet) return null;

  const speciesIcon = SPECIES_ICONS[pet.species] || "🐾";
  const petGender = pet.gender || "female";
  const genderIcon = petGender === "male" ? "♂" : "♀";
  // Pet-twist section labels with standard underlying tags (gender-agnostic —
  // pet apparel categories are the same regardless of the pet's sex).
  const SECTION_OPTIONS = SECTIONS.map((s) => ({ value: s.tag, label: s.label }));

  return (
    <div
      className="kcm-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="kcm-modal" role="dialog" aria-label={`${pet.name}'s Closet`}>
        {/* ── Door animation ── */}
        {!doorsGone && (
          <div className="kcm-doors">
            <div className={`kcm-door kcm-door--left  ${doorsOpen ? "is-open" : ""}`} />
            <div className={`kcm-door kcm-door--right ${doorsOpen ? "is-open" : ""}`} />
          </div>
        )}

        {/* ── Header ── */}
        <header className="kcm-header">
          <div className="kcm-header__left">
            <div className="kcm-avatar-wrap">
              {pet.photoUrl ? (
                <img src={pet.photoUrl} alt={pet.name} className="kcm-avatar" />
              ) : (
                <span className="kcm-header__icon">{speciesIcon}</span>
              )}
              <button
                type="button"
                className="kcm-avatar-edit-btn"
                onClick={() => photoInputRef.current?.click()}
                title="Change profile photo"
                disabled={photoUploading}
              >
                {photoUploading ? "…" : "📷"}
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handlePhotoChange}
              />
            </div>
            {photoErr && <span className="kcm-avatar-err">{photoErr}</span>}
            <div>
              <h2 className="kcm-header__title">{pet.name}'s Closet</h2>
              <p className="kcm-header__sub">
                {speciesIcon} {genderIcon} {pet.breed || pet.species}
                {pet.age ? ` · ${pet.age}` : ""}
                {pet.weight ? ` · ${pet.weight}` : ""}
                &nbsp;|&nbsp; 🧥 {pet.apparelSize || "—"}
                {pet.backLength ? ` · Back ${pet.backLength}` : ""}
              </p>
            </div>
          </div>
          <div className="kcm-header__actions">
            <button
              className="kcm-header__bg-btn"
              onClick={() => setShowBgPicker((v) => !v)}
              title="Change background"
            >
              🎨 Background
            </button>
            <button
              className="kcm-header__add-btn"
              onClick={() => setIsSearchOpen(true)}
              title="Search this closet"
            >
              🔍 Search
            </button>
            <button
              className="kcm-header__add-btn"
              onClick={() => { setSelectedSection(null); setIsAddOpen(true); }}
            >
              + Add Item
            </button>
            <button className="kcm-header__close" onClick={onClose} aria-label="Close">×</button>
          </div>
        </header>

        {/* ── Background picker panel ── */}
        {showBgPicker && (
          <PcmBgPicker bgKey={bgKey} onClose={() => setShowBgPicker(false)} />
        )}

        {/* ── Section cards ── */}
        <div className="kcm-body" style={bodyStyle}>
          {loading && <p className="kcm-loading">Loading…</p>}
          <div className="kcm-grid">
            {SECTIONS.map((sec) => {
              const tag = petTag(pet.id, sec.tag);
              // Pinned card image (set via 📌 in the section modal) takes
              // priority; otherwise fall back to the optimistic post-upload
              // thumb, otherwise let the card self-fetch.
              let pinnedCardUrl = null;
              try { pinnedCardUrl = localStorage.getItem(`wimc_card_image_${tag}`) || null; } catch {}
              return (
                <ClosetSectionCard
                  key={sec.tag}
                  sectionName={sec.label}
                  tag={tag}
                  placeholderUrl={sec.placeholder}
                  imageUrl={pinnedCardUrl || sectionThumbs[tag] || undefined}
                  onClick={() => handleCardClick(sec.tag)}
                  onAdd={() => { setSelectedSection(sec.tag); setIsAddOpen(true); }}
                />
              );
            })}
          </div>

          {/* ── Features row ── */}
          {/* sectionOptions = pet-twist labels (with standard tags) so every
              panel shows pet section names; petGender flows through for
              consistency with the pet's gender choice. */}
          <div className="kcm-features">
            <h3 className="kcm-features__heading">Features</h3>
            <div className="kcm-features__panels">
              <OutfitPreviewPanel tagPrefix={`pet-${pet.id}`} gender={petGender} sectionOptions={SECTION_OPTIONS} incomingItems={petPreviewIncoming} />
              <OutfitPlanner      tagPrefix={`pet-${pet.id}`} gender={petGender} sectionOptions={SECTION_OPTIONS} incomingItems={petPlannerIncoming} />
              <TravelPackPanel    tagPrefix={`pet-${pet.id}`} gender={petGender} sectionOptions={SECTION_OPTIONS} incomingItems={petPackIncoming} />
              <WishList           storageKey={`pet-${pet.id}-wishlist`} gender={petGender} tagPrefix={`pet-${pet.id}`} sectionOptions={SECTION_OPTIONS} />
              <DonateBin          tagPrefix={`pet-${pet.id}`} gender={petGender} sectionOptions={SECTION_OPTIONS} incomingItems={petDonateIncoming} />
            </div>
          </div>
        </div>

        {/* ── Section viewer ── */}
        <ClosetSectionModal
          isOpen={isModalOpen}
          sectionName={
            selectedSection
              ? SECTIONS.find((s) => s.tag === selectedSection)?.label
              : ""
          }
          tag={selectedSection ? petTag(pet.id, selectedSection) : undefined}
          onClose={() => { setIsModalOpen(false); setSelectedSection(null); }}
          onAddItem={() => { setIsAddOpen(true); }}
          recentUpload={recentUpload}
          allSections={SECTIONS.map((s) => ({
            label: s.label,
            tag: petTag(pet.id, s.tag),
          }))}
          onSwitchSection={handleSwitchSection}
        />

        {/* ── Pet Closet Search ── */}
        <ClosetSearch
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onApplyItems={handlePetApplyItems}
          tagPrefix={`pet-${pet.id}`}
          gender={petGender}
          sectionOptions={SECTION_OPTIONS}
        />

        {/* ── Add clothing ── */}
        <AddClothingModal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          onClothingAdded={handleAddClothing}
          initialCategory={selectedSection || ""}
          tagPrefix={`pet-${pet.id}`}
          sections={SECTIONS.map((s) => ({ value: s.tag, label: s.label }))}
        />
      </div>
    </div>
  );
}
