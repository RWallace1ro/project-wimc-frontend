import React, { useState, useEffect, useRef } from "react";
import { fetchImagesByTag, uploadImage } from "../../utils/CloudinaryAPI";
import { useBackground } from "../../context/BackgroundContext";
import { KID_BACKGROUND_PRESETS } from "../../utils/backgroundPresets";
import ClosetSectionCard from "../ClosetSectionCard/ClosetSectionCard";
import ClosetSectionModal from "../ClosetSectionModal/ClosetSectionModal";
import AddClothingModal from "../AddClothingModal/AddClothingModal";
import { getSubSectionDefs } from "../../utils/closetSubsections";
import OutfitPreviewPanel from "../OutfitPreviewPanel/OutfitPreviewPanel";
import OutfitPlanner from "../OutfitPlanner/OutfitPlanner";
import TravelPackPanel from "../TravelPackPanel/TravelPackPanel";
import ClosetSearch from "../ClosetSearch/ClosetSearch";
import WishList from "../WishList/WishList";
import DonateBin from "../DonateBin/DonateBin";
import ClosetDoorCarousel from "../common/ClosetDoorCarousel";
import ClosetInteriorBackdrop from "../common/ClosetInteriorBackdrop";
import { resolveBackgroundValue } from "../../utils/backgroundPresets";
import "./KidsClosetModal.css";

// Unisex kids closet: one fixed 8-category list, same for every child.
// No placeholder photos — unlike the main closet (which shows an example
// image so users know what to expect), these stay empty with an "Add
// Clothing Items" prompt (see ClosetSectionCard) until the child's own
// first item is uploaded.
const SECTIONS = [
  { tag: "dresses-skirts",      label: "Dresses/Skirts" },
  { tag: "dress-shirts-suits",  label: "Button-Ups/Dress Clothes" },
  { tag: "shoes-sneakers",      label: "Shoes/Sneakers" },
  { tag: "pants-jeans",         label: "Pants/Jeans" },
  { tag: "tops",                label: "Tops" },
  { tag: "bags-accessories",    label: "Bags/Accessories" },
  { tag: "jackets-coats",       label: "Jackets/Coats" },
  { tag: "blazers",             label: "Blazers" },
];

const GROUP_ICONS = { baby: "👶", toddler: "🧒", kids: "🧑", teen: "🧑‍🎓" };

function childTag(childId, section) {
  return `kid-${childId}-${section}`;
}

const DOOR_MS = 3000;

// ── Background picker data (mirrored from Appearance tab in Settings) ─────────
const PRESETS = KID_BACKGROUND_PRESETS;

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
function KcmBgPicker({ bgKey, onClose: closePicker }) {
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
    } catch {
      setErr("Upload failed.");
    } finally {
      setUploading(false);
    }
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

      {/* Tab switcher */}
      <div className="kcm-bg-tabs">
        <button
          className={`kcm-bg-tab ${activeTab === "photos" ? "is-active" : ""}`}
          onClick={() => setActiveTab("photos")}
        >
          🖼️ Photos
        </button>
        <button
          className={`kcm-bg-tab ${activeTab === "colors" ? "is-active" : ""}`}
          onClick={() => setActiveTab("colors")}
        >
          🎨 Colors
        </button>
      </div>

      {/* Photos tab */}
      {activeTab === "photos" && (
        <div className="kcm-bg-presets">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              className={`kcm-bg-preset ${current === p.url ? "is-active" : ""}`}
              onClick={() => pick(p.url)}
              title={p.label}
            >
              <div
                className="kcm-bg-preset__thumb"
                style={{ backgroundImage: `url(${p.preview || resolveBackgroundValue(p.url)})` }}
              />
              <span className="kcm-bg-preset__name">{p.label}</span>
              {current === p.url && <span className="kcm-bg-preset__check">✓</span>}
            </button>
          ))}
          {/* Custom upload */}
          <button
            className="kcm-bg-preset kcm-bg-preset--upload"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            title="Upload custom image"
          >
            <div className="kcm-bg-preset__thumb kcm-bg-preset__thumb--upload">
              {uploading ? "…" : "🖼️"}
            </div>
            <span className="kcm-bg-preset__name">Custom</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFile}
            />
          </button>
        </div>
      )}

      {/* Colors tab */}
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
export default function KidsClosetModal({ child, onClose, onUpdateChild, siblings = [], onSwitchChild }) {
  // ── Background ────────────────────────────────────────────────────────────
  const { backgrounds } = useBackground();
  const bgKey = `kid-closet-${child?.id}`;
  const currentBg = child ? backgrounds[bgKey] || null : null;
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [kidsPreviewIncoming, setKidsPreviewIncoming] = useState(null);
  const [kidsPlannerIncoming, setKidsPlannerIncoming] = useState(null);
  const [kidsPackIncoming,    setKidsPackIncoming]    = useState(null);
  const [kidsDonateIncoming,  setKidsDonateIncoming]  = useState(null);

  const handleKidsApplyItems = (items, target) => {
    const payload = { items, ts: Date.now() };
    if (target === "preview") setKidsPreviewIncoming(payload);
    if (target === "planner") setKidsPlannerIncoming(payload);
    if (target === "pack")    setKidsPackIncoming(payload);
    if (target === "donate")  setKidsDonateIncoming(payload);
  };

  // ── Profile photo ─────────────────────────────────────────────────────────
  const photoInputRef = useRef(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoErr, setPhotoErr] = useState("");

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateChild) return;
    setPhotoUploading(true);
    setPhotoErr("");
    try {
      const res = await uploadImage(file, "kid-avatars");
      if (res?.secure_url) {
        onUpdateChild({ ...child, photoUrl: res.secure_url });
      } else {
        setPhotoErr("Upload failed.");
      }
    } catch {
      setPhotoErr("Upload failed.");
    } finally {
      setPhotoUploading(false);
      // reset via ref — the synthetic event 'e' is recycled by React after await
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const bodyStyle = currentBg
    ? isColor(currentBg)
      ? { backgroundColor: colorValue(currentBg) }
      : { backgroundImage: `url(${resolveBackgroundValue(currentBg)})`, backgroundSize: "cover", backgroundPosition: "center" }
    : {};

  // ── Door animation ────────────────────────────────────────────────────────
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [doorsGone, setDoorsGone] = useState(false);

  // ── Closet state ──────────────────────────────────────────────────────────
  const [closetItems, setClosetItems] = useState([]); // eslint-disable-line no-unused-vars
  // sectionThumbs: { [kid-{id}-{section}]: url } — optimistic thumbnail update
  // after an upload so the card shows the new image before Cloudinary's tag-list
  // cache refreshes (which can take a few minutes).
  const [sectionThumbs, setSectionThumbs] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [recentUpload, setRecentUpload] = useState(null); // {tag, url, mediaType, ts}
  const [selectedSection, setSelectedSection] = useState(null);
  const [loading, setLoading] = useState(false);

  // Switching to another child (via the in-modal switcher) should close any
  // open sub-modal/panel from the previous child rather than carrying it over.
  useEffect(() => {
    setIsModalOpen(false);
    setIsAddOpen(false);
    setSelectedSection(null);
    setIsSearchOpen(false);
    setShowBgPicker(false);
  }, [child.id]);

  // Start door animation on mount
  useEffect(() => {
    const arm   = setTimeout(() => setDoorsOpen(true), 50);
    const clear = setTimeout(() => setDoorsGone(true), DOOR_MS + 50);
    return () => { clearTimeout(arm); clearTimeout(clear); };
  }, []);

  // Escape key
  useEffect(() => {
    if (!child) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [child, onClose]);

  const fetchSection = async (section) => {
    setLoading(true);
    try {
      const tag  = childTag(child.id, section);
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

  // Called by ClosetSectionModal's section-tab nav when the user clicks a
  // different section pill.  The modal passes back the full kid-scoped tag
  // (e.g. "kid-abc123-tops"); we strip the prefix to get the plain section key.
  const handleSwitchSection = (newFullTag) => {
    const prefix = `kid-${child.id}-`;
    const plainTag = newFullTag.startsWith(prefix)
      ? newFullTag.slice(prefix.length)
      : newFullTag;
    setSelectedSection(plainTag);
    // ClosetSectionModal re-fetches internally when its tag prop changes,
    // so no manual fetch call needed here.
  };

  const handleAddClothing = (item) => {
    const url = item?.mediaThumb || item?.mediaUrl || item?.imageUrl || item;
    // item.category is the value the user actually selected in the dropdown
    // (may differ from selectedSection if they changed it before submitting).
    const actualSection = item?.category || selectedSection;
    if (url && typeof url === "string") {
      setClosetItems((prev) => [...prev, url]);
      // Optimistically update the card thumbnail so it shows immediately
      // without waiting for Cloudinary's tag-list cache to refresh.
      if (actualSection) {
        const tag = childTag(child.id, actualSection);
        setSectionThumbs((prev) => ({ ...prev, [tag]: url }));
        // Also inject into the open section viewer's grid
        setRecentUpload({ tag, url, mediaType: item?.mediaType || "image", ts: Date.now() });
      }
    }
    setIsAddOpen(false);
  };

  if (!child) return null;

  return (
    <div
      className="kcm-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="kcm-modal"
        role="dialog"
        aria-label={`${child.name}'s Closet`}
      >
        {/* ── Door animation ── */}
        {!doorsGone && (
          <div className="kcm-doors">
            <ClosetInteriorBackdrop />
            <ClosetDoorCarousel tagPrefix={`kid-${child.id}`} />
            <div className={`kcm-door kcm-door--left  ${doorsOpen ? "is-open" : ""}`} />
            <div className={`kcm-door kcm-door--right ${doorsOpen ? "is-open" : ""}`} />
          </div>
        )}

        {/* ── Header ── */}
        <header className="kcm-header">
          <div className="kcm-header__left">
            {/* Profile photo / avatar */}
            <div className="kcm-avatar-wrap">
              {child.photoUrl ? (
                <img
                  src={child.photoUrl}
                  alt={child.name}
                  className="kcm-avatar"
                />
              ) : (
                <span className="kcm-header__icon">{GROUP_ICONS[child.ageGroup] || "👶"}</span>
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
            <button className="kcm-header__close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
        </header>

        {/* ── Switch to another child without closing this closet ── */}
        {siblings.length > 1 && onSwitchChild && (
          <nav className="kcm-switcher" aria-label="Switch child">
            {siblings.map((sib) => (
              <button
                key={sib.id}
                type="button"
                className={`kcm-switcher__pill${sib.id === child.id ? " is-active" : ""}`}
                onClick={() => sib.id !== child.id && onSwitchChild(sib)}
                aria-current={sib.id === child.id ? "true" : undefined}
                title={`Switch to ${sib.name}'s closet`}
              >
                {sib.photoUrl
                  ? <img src={sib.photoUrl} alt={sib.name} className="kcm-switcher__avatar" />
                  : <span className="kcm-switcher__icon">{GROUP_ICONS[sib.ageGroup] || "👶"}</span>
                }
                <span className="kcm-switcher__name">{sib.name}</span>
              </button>
            ))}
          </nav>
        )}

        {/* ── Background picker panel ── */}
        {showBgPicker && (
          <KcmBgPicker bgKey={bgKey} onClose={() => setShowBgPicker(false)} />
        )}

        {/* ── Section cards ── */}
        <div className="kcm-body" style={bodyStyle}>
          {loading && <p className="kcm-loading">Loading…</p>}
          <div className="kcm-grid">
            {SECTIONS.map((sec) => {
              const kidTag = childTag(child.id, sec.tag);
              // Pinned card image (set via 📌 in the section modal, always
              // keyed by this card's own base tag) takes priority; otherwise
              // fall back to the optimistic post-upload thumb, otherwise let
              // the card self-fetch (now sub-section aware).
              let pinnedCardUrl = null;
              try { pinnedCardUrl = localStorage.getItem(`wimc_card_image_${kidTag}`) || null; } catch {}
              return (
                <ClosetSectionCard
                  key={sec.tag}
                  sectionName={sec.label}
                  tag={kidTag}
                  placeholderUrl={sec.placeholder}
                  imageUrl={pinnedCardUrl || sectionThumbs[kidTag] || undefined}
                  onClick={() => handleCardClick(sec.tag)}
                  onAdd={() => { setSelectedSection(sec.tag); setIsAddOpen(true); }}
                />
              );
            })}
          </div>

          {/* ── Features row ── */}
          {/* Each panel is rendered with a child-specific tagPrefix so it fetches
              and stores data for this child only, independent of the main closet. */}
          <div className="kcm-features">
            <h3 className="kcm-features__heading">Features</h3>
            <div className="kcm-features__panels">
              <OutfitPreviewPanel tagPrefix={`kid-${child.id}`} incomingItems={kidsPreviewIncoming} />
              <OutfitPlanner      tagPrefix={`kid-${child.id}`} incomingItems={kidsPlannerIncoming} />
              <TravelPackPanel    tagPrefix={`kid-${child.id}`} incomingItems={kidsPackIncoming} />
              <WishList           storageKey={`kid-${child.id}-wishlist`} tagPrefix={`kid-${child.id}`} />
              <DonateBin          tagPrefix={`kid-${child.id}`} incomingItems={kidsDonateIncoming} />
            </div>
          </div>
        </div>

        {/* ── Section viewer ── */}
        {/* tag prop passes the kids-scoped Cloudinary tag so ClosetSectionModal
            fetches "kid-{id}-tops" not "tops" (which would show main-closet items).
            onAddItem receives the same scoped tag back; we strip the prefix to get
            the plain section name needed for initialCategory + uploadTag. */}
        <ClosetSectionModal
          isOpen={isModalOpen}
          sectionName={
            selectedSection
              ? SECTIONS.find((s) => s.tag === selectedSection)?.label
              : ""
          }
          tag={selectedSection ? childTag(child.id, selectedSection) : undefined}
          onClose={() => { setIsModalOpen(false); setSelectedSection(null); }}
          onAddItem={() => {
            // Keep the section card OPEN underneath — the Add form stacks on
            // top and the new item appears in the grid as soon as it uploads.
            setIsAddOpen(true);
          }}
          recentUpload={recentUpload}
          allSections={SECTIONS.map((s) => ({
            label: s.label,
            tag: childTag(child.id, s.tag), // e.g. "kid-abc123-tops"
          }))}
          onSwitchSection={handleSwitchSection}
        />

        {/* ── Kids Closet Search ── */}
        <ClosetSearch
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onApplyItems={handleKidsApplyItems}
          tagPrefix={`kid-${child.id}`}
        />

        {/* ── Add clothing ── */}
        {/* initialCategory = short section name so the dropdown pre-selects correctly.
            uploadTag = full kids-scoped tag so Cloudinary never mixes these images
            into the main closet (which uses plain "tops", "dresses-skirts", etc.). */}
        {/* tagPrefix="kid-{id}" lets the category dropdown control which
            kids-closet section the upload lands in. If the user opens the
            Dresses card but then switches the dropdown to Tops before
            uploading, the item goes to kid-{id}-tops (not kid-{id}-dresses-skirts). */}
        <AddClothingModal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          onClothingAdded={handleAddClothing}
          initialCategory={selectedSection || ""}
          tagPrefix={`kid-${child.id}`}
          sections={SECTIONS.flatMap((s) => {
            // Expand each card into its sub-sections so uploads can target one.
            // Values are the un-prefixed sub-tag (slug, or the card's own tag
            // for the first one); AddClothingModal prepends `tagPrefix`.
            const defs = getSubSectionDefs(s.tag, { kind: "kid" });
            if (defs) {
              return defs.map((d) => ({ value: d.slug || s.tag, label: d.label }));
            }
            return [{ value: s.tag, label: s.label }];
          })}
        />
      </div>
    </div>
  );
}
