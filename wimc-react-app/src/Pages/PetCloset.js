import { syncSetItem } from '../utils/syncStore';
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { uploadImage, uploadRawJSON } from "../utils/CloudinaryAPI";
import { appShareUrl, createCollabDoc, shareAppLink, smsShareUrl } from "../utils/shareUtils";
import { useBackground } from "../context/BackgroundContext";
import { BACKGROUND_PRESETS, CLOSET_INTERIOR_BACKDROP_VALUE } from "../utils/backgroundPresets";
import ClosetInteriorBackdrop from "../components/common/ClosetInteriorBackdrop";
import PetClosetModal from "../components/PetClosetModal/PetClosetModal";
import PetProfileModal from "../components/PetProfileModal/PetProfileModal";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
// Reuse the Kids closet page styling for an identical look & feel.
import "./KidsCloset.css";

const PET_PAGE_BG_KEY = "pet-closet-page";

const PRESETS = BACKGROUND_PRESETS;

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
const isColor  = (v) => v && v.startsWith(COLOR_PREFIX);
const colorVal = (v) => v.replace(COLOR_PREFIX, "");

// ── Inline background picker (mirrors Settings → Appearance) ─────────────────
function PetPageBgPicker({ onClose }) {
  const { backgrounds, setBackground, resetBackground } = useBackground();
  const current  = backgrounds[PET_PAGE_BG_KEY] || null;
  const fileRef  = useRef(null);
  const [activeTab,  setActiveTab]  = useState("photos");
  const [uploading,  setUploading]  = useState(false);
  const [err,        setErr]        = useState("");
  const [saved,      setSaved]      = useState(false);

  const pick = (val) => {
    setBackground(PET_PAGE_BG_KEY, val);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 800);
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
    finally   { setUploading(false); }
  };

  return (
    <div className="kcp-bg-picker">
      <div className="kcp-bg-picker__header">
        <span className="kcp-bg-picker__title">🎨 Choose Background</span>
        {saved && <span className="kcp-bg-picker__saved">✅ Saved!</span>}
        <div className="kcp-bg-picker__header-actions">
          {current && (
            <button
              className="kcp-bg-picker__reset"
              onClick={() => { resetBackground(PET_PAGE_BG_KEY); onClose(); }}
            >
              ↩️ Reset
            </button>
          )}
          <button className="kcp-bg-picker__close-btn" onClick={onClose}>×</button>
        </div>
      </div>

      <div className="kcp-bg-tabs">
        <button className={`kcp-bg-tab ${activeTab === "photos" ? "is-active" : ""}`} onClick={() => setActiveTab("photos")}>🖼️ Photos</button>
        <button className={`kcp-bg-tab ${activeTab === "colors" ? "is-active" : ""}`} onClick={() => setActiveTab("colors")}>🎨 Colors</button>
      </div>

      {activeTab === "photos" && (
        <div className="kcp-bg-presets">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              className={`kcp-bg-preset ${current === p.url ? "is-active" : ""}`}
              onClick={() => pick(p.url)}
              title={p.label}
            >
              <div className="kcp-bg-preset__thumb" style={{ backgroundImage: `url(${p.url})` }} />
              <span className="kcp-bg-preset__name">{p.label}</span>
              {current === p.url && <span className="kcp-bg-preset__check">✓</span>}
            </button>
          ))}
          <button
            className="kcp-bg-preset kcp-bg-preset--upload"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            title="Upload custom image"
          >
            <div className="kcp-bg-preset__thumb kcp-bg-preset__thumb--upload">{uploading ? "…" : "🖼️"}</div>
            <span className="kcp-bg-preset__name">Custom</span>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
          </button>
        </div>
      )}

      {activeTab === "colors" && (
        <div className="kcp-color-palette">
          {COLOR_PALETTE.map((c) => {
            const encoded  = `${COLOR_PREFIX}${c.value}`;
            const isActive = current === encoded;
            return (
              <button
                key={c.id}
                className={`kcp-color-swatch ${isActive ? "is-active" : ""}`}
                style={{ backgroundColor: c.value }}
                title={c.label}
                onClick={() => pick(encoded)}
              >
                {isActive && <span className="kcp-color-swatch__check">✓</span>}
              </button>
            );
          })}
        </div>
      )}

      {err && <p className="kcp-bg-err">{err}</p>}
    </div>
  );
}

const LS_KEY = "wimc_pet_profiles";
const LS_DELETED_KEY = "wimc_pet_deleted";
const RESTORE_DAYS = 14;

const SPECIES_ICONS = { dog: "🐕", cat: "🐈", other: "🐾" };

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}
function save(key, val) {
  try {
    syncSetItem(key, JSON.stringify(val));
  } catch {}
}

function daysLeft(deletedAt) {
  const ms = RESTORE_DAYS * 24 * 60 * 60 * 1000;
  const diff = ms - (Date.now() - new Date(deletedAt).getTime());
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

export default function PetCloset() {
  const navigate = useNavigate();
  const { backgrounds } = useBackground();
  const currentBg = backgrounds[PET_PAGE_BG_KEY] || null;
  const [showBgPicker, setShowBgPicker] = useState(false);

  const currentUid = auth.currentUser?.uid || null;

  const [profiles, setProfiles] = useState(() => load(LS_KEY, []));
  const [deleted, setDeleted] = useState(() => load(LS_DELETED_KEY, []));
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [activePet, setActivePet] = useState(null);
  const [sharing, setSharing] = useState({});
  const [smsHrefs, setSmsHrefs] = useState({});
  const [showDeleted, setShowDeleted] = useState(false);

  const [firestoreLoaded, setFirestoreLoaded] = useState(false);

  const pageStyle = currentBg
    ? isColor(currentBg)
      ? { backgroundImage: "none", backgroundColor: colorVal(currentBg) }
      : currentBg === CLOSET_INTERIOR_BACKDROP_VALUE
        // Rendered as a real component below — see KidsCloset.js's identical
        // fix; the shared .kids-closet CSS class has a hardcoded fallback
        // background-image that an empty style object wouldn't override.
        ? { backgroundImage: "none", backgroundColor: "transparent" }
        : { backgroundImage: `url(${currentBg})` }
    : {};

  // ── Load from Firestore on mount ──
  useEffect(() => {
    if (!currentUid) {
      setFirestoreLoaded(true);
      return;
    }
    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", currentUid));
        if (snap.exists()) {
          const data = snap.data();
          // See KidsCloset.js's identical fix — profiles/deleted are seeded
          // from a bare, non-account-scoped localStorage key, which on a
          // shared browser can be a DIFFERENT account's leftover data.
          // Firestore (keyed by currentUid) must always win, clearing to
          // empty rather than keeping a stale cross-account local seed that
          // the save effect below would otherwise write back into Firestore.
          setProfiles(data.petProfiles || []);
          setDeleted(
            (data.petDeleted || []).filter((p) => daysLeft(p.deletedAt) > 0)
          );
        } else {
          setProfiles([]);
          setDeleted([]);
        }
      } catch (e) {
        console.warn("PetCloset: could not load from Firestore:", e);
        setDeleted((prev) => prev.filter((p) => daysLeft(p.deletedAt) > 0));
      } finally {
        setFirestoreLoaded(true);
      }
    })();
  }, [currentUid]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save to localStorage + Firestore whenever profiles or deleted change ──
  useEffect(() => {
    save(LS_KEY, profiles);
    save(LS_DELETED_KEY, deleted);
    if (!currentUid || !firestoreLoaded) return;
    const timer = setTimeout(async () => {
      try {
        await setDoc(
          doc(db, "users", currentUid),
          {
            petProfiles: profiles,
            petDeleted: deleted,
            petProfilesUpdatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (e) {
        console.warn("PetCloset: could not save to Firestore:", e);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [profiles, deleted, currentUid, firestoreLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveProfile = (data) => {
    setProfiles((prev) =>
      editingProfile
        ? prev.map((p) => (p.id === editingProfile.id ? { ...p, ...data } : p))
        : [...prev, { id: uid(), createdAt: new Date().toISOString(), ...data }],
    );
    setEditingProfile(null);
    setIsProfileOpen(false);
  };

  const handleDelete = (id) => {
    const profile = profiles.find((p) => p.id === id);
    if (!profile) return;
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    setDeleted((prev) => [...prev, { ...profile, deletedAt: new Date().toISOString() }]);
    setShowDeleted(true);
  };

  const handleRestore = (id) => {
    const profile = deleted.find((p) => p.id === id);
    if (!profile) return;
    const { deletedAt, ...rest } = profile;
    setProfiles((prev) => [...prev, rest]);
    setDeleted((prev) => prev.filter((p) => p.id !== id));
  };

  const handlePermanentDelete = (id) => {
    if (!window.confirm("Permanently delete this pet profile? This cannot be undone.")) return;
    setDeleted((prev) => prev.filter((p) => p.id !== id));
  };

  const handleEdit = (profile) => {
    setEditingProfile(profile);
    setIsProfileOpen(true);
  };

  // ── Share ──
  const handleShare = async (profile, withEdit = false) => {
    setSharing((prev) => ({ ...prev, [profile.id]: "sharing" }));
    setSmsHrefs((prev) => ({ ...prev, [profile.id]: "" }));
    const payload = {
      kind: "wimc.petProfile",
      version: 1,
      createdAt: new Date().toISOString(),
      pet: {
        name: profile.name,
        species: profile.species,
        breed: profile.breed,
        age: profile.age,
        weight: profile.weight,
        apparelSize: profile.apparelSize,
        backLength: profile.backLength,
        neckSize: profile.neckSize,
        chestSize: profile.chestSize,
        favoriteColors: profile.favoriteColors,
        favoriteStyles: profile.favoriteStyles,
        notes: profile.notes || "",
        photoUrl: profile.photoUrl || "",
      },
      meta: { source: "WIMC Pet Closet" },
    };
    try {
      let shareUrl;
      if (withEdit) {
        shareUrl = await createCollabDoc("petprofile", payload);
      } else {
        const res = await uploadRawJSON(payload, "wimc/pet-profiles");
        const cloudUrl = res?.secure_url || res?.url || "";
        if (!cloudUrl) throw new Error("no url");
        shareUrl = appShareUrl(cloudUrl, "petprofile");
      }
      const msgText = `Here is ${profile.name}'s current sizing and measurements!`;
      const result = await shareAppLink({
        title: `${profile.name}'s Sizing Info — WIMC`,
        text: msgText,
        url: shareUrl,
      });
      if (result === "clipboard" || result === "unsupported") {
        setSmsHrefs((prev) => ({ ...prev, [profile.id]: smsShareUrl(shareUrl, msgText) }));
        setTimeout(() => setSmsHrefs((prev) => ({ ...prev, [profile.id]: "" })), 6000);
      }
      setSharing((prev) => ({ ...prev, [profile.id]: "done" }));
      setTimeout(() => setSharing((prev) => ({ ...prev, [profile.id]: null })), 3000);
    } catch {
      setSharing((prev) => ({ ...prev, [profile.id]: "error" }));
    }
  };

  const speciesIcon = (val) => SPECIES_ICONS[val] || "🐾";

  // ── Profile card ──
  const ProfileCard = ({ p, isDeletedCard = false }) => {
    const cardPhotoRef = useRef(null);
    const [cardPhotoLoading, setCardPhotoLoading] = useState(false);

    const handleCardPhotoChange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setCardPhotoLoading(true);
      try {
        const res = await uploadImage(file, "pet-avatars");
        if (res?.secure_url) {
          setProfiles((prev) =>
            prev.map((q) => (q.id === p.id ? { ...q, photoUrl: res.secure_url } : q))
          );
        }
      } catch {}
      finally {
        setCardPhotoLoading(false);
        if (cardPhotoRef.current) cardPhotoRef.current.value = "";
      }
    };

    return (
    <div className={`kids-card ${isDeletedCard ? "kids-card--deleted" : ""}`}>
      {isDeletedCard && (
        <div className="kids-card__deleted-banner">
          🗑️ Deleted — {daysLeft(p.deletedAt)} day
          {daysLeft(p.deletedAt) !== 1 ? "s" : ""} to restore
        </div>
      )}

      <div className="kids-card__top">
        <div className="kids-card__avatar-wrap" title={isDeletedCard ? undefined : "Change photo"}>
          {p.photoUrl ? (
            <img src={p.photoUrl} alt={p.name} className="kids-card__avatar" />
          ) : (
            <span className="kids-card__icon">{speciesIcon(p.species)}</span>
          )}
          {!isDeletedCard && (
            <>
              <button
                className="kids-card__photo-btn"
                onClick={() => cardPhotoRef.current?.click()}
                title="Change photo"
                type="button"
              >
                {cardPhotoLoading ? "…" : "📷"}
              </button>
              <input ref={cardPhotoRef} type="file" accept="image/*" hidden onChange={handleCardPhotoChange} />
            </>
          )}
        </div>
        <div className="kids-card__name-group">
          <h2 className="kids-card__name">{p.name}</h2>
          <span className="kids-card__age-badge">
            {speciesIcon(p.species)} {p.breed || p.species}{p.age ? ` · ${p.age}` : ""}
          </span>
        </div>
      </div>

      <div className="kids-card__sizes">
        <div className="kids-card__size-block">
          <span className="kids-card__size-label">🧥 Apparel</span>
          <div className="kids-card__size-row">
            <span className="kids-card__size-val">Size: {p.apparelSize || "—"}</span>
            <span className="kids-card__size-val">Wt: {p.weight || "—"}</span>
          </div>
        </div>
        <div className="kids-card__size-block">
          <span className="kids-card__size-label">📏 Measurements</span>
          <div className="kids-card__size-row">
            <span className="kids-card__size-val">Back: {p.backLength || "—"}</span>
            <span className="kids-card__size-val">Neck: {p.neckSize || "—"}</span>
            <span className="kids-card__size-val">Chest: {p.chestSize || "—"}</span>
          </div>
        </div>
      </div>

      {(p.favoriteColors || p.favoriteStyles) && (
        <div className="kids-card__favorites">
          {p.favoriteColors && <span className="kids-card__fav">🎨 {p.favoriteColors}</span>}
          {p.favoriteStyles && <span className="kids-card__fav">✨ {p.favoriteStyles}</span>}
        </div>
      )}
      {p.notes && <p className="kids-card__notes">{p.notes}</p>}

      <div className="kids-card__actions">
        {!isDeletedCard ? (
          <>
            <button className="kids-card__btn kids-card__btn--closet" onClick={() => setActivePet(p)}>
              🐾 Open Closet
            </button>
            <button
              className="kids-card__btn kids-card__btn--share"
              onClick={() => handleShare(p, false)}
              disabled={sharing[p.id] === "sharing"}
              title="Share pet profile (view only)"
            >
              {sharing[p.id] === "sharing"
                ? "Sharing…"
                : sharing[p.id] === "done"
                  ? "✅ Shared!"
                  : sharing[p.id] === "error"
                    ? "❌ Failed"
                    : "Share (View Only)"}
            </button>
            <button
              className="kids-card__btn kids-card__btn--share-edit"
              onClick={() => handleShare(p, true)}
              disabled={sharing[p.id] === "sharing"}
              title="Share with edit access (WIMC users)"
            >
              ✏️ Share + Edit
            </button>
            {smsHrefs[p.id] && (
              <a
                href={smsHrefs[p.id]}
                className="kids-card__btn kids-card__btn--share"
                style={{ textDecoration: "none", textAlign: "center" }}
              >
                📱 Text
              </a>
            )}
            <button className="kids-card__btn kids-card__btn--edit" onClick={() => handleEdit(p)}>
              ✏️ Edit
            </button>
            <button className="kids-card__btn kids-card__btn--delete" onClick={() => handleDelete(p.id)}>
              🗑️ Delete
            </button>
          </>
        ) : (
          <>
            <button className="kids-card__btn kids-card__btn--restore" onClick={() => handleRestore(p.id)}>
              ↩️ Restore
            </button>
            <button className="kids-card__btn kids-card__btn--delete" onClick={() => handlePermanentDelete(p.id)}>
              🗑️ Delete Forever
            </button>
          </>
        )}
      </div>
    </div>
    );
  };

  const activeDeleted = deleted.filter((p) => daysLeft(p.deletedAt) > 0);

  return (
    <main className="kids-closet" style={pageStyle}>
      {currentBg === CLOSET_INTERIOR_BACKDROP_VALUE && (
        <ClosetInteriorBackdrop fixed />
      )}
      <header className="kids-closet__header">
        <div className="kids-closet__header-left">
          <button
            className="kids-closet__back-btn"
            onClick={() => navigate("/home")}
            aria-label="Back to home"
          >
            ← Back
          </button>
          <div className="kids-closet__header-text">
            <h1 className="kids-closet__title">🐾 Pet Closet</h1>
            <p className="kids-closet__sub">
              Manage apparel and sizing for each pet — and share their measurements
              with family, sitters, and friends.
            </p>
          </div>
        </div>
        <div className="kids-closet__header-actions">
          <button
            className="kids-closet__bg-btn"
            onClick={() => setShowBgPicker((v) => !v)}
            title="Change background"
          >
            🎨 Background
          </button>
          <button
            className="kids-closet__add-btn"
            onClick={() => { setEditingProfile(null); setIsProfileOpen(true); }}
          >
            + Add Pet
          </button>
        </div>
      </header>

      {showBgPicker && <PetPageBgPicker onClose={() => setShowBgPicker(false)} />}

      {profiles.length === 0 ? (
        <div className="kids-closet__empty">
          <p>No pets added yet.</p>
          <p>Click <strong>+ Add Pet</strong> to create a profile.</p>
        </div>
      ) : (
        <div className="kids-closet__grid">
          {profiles.map((p) => (
            <ProfileCard key={p.id} p={p} />
          ))}
        </div>
      )}

      {activeDeleted.length > 0 && (
        <div className="kids-closet__deleted-section">
          <button
            className="kids-closet__deleted-toggle"
            onClick={() => setShowDeleted((v) => !v)}
          >
            🗑️ Recently Deleted ({activeDeleted.length}) {showDeleted ? "▾" : "▸"}
          </button>
          {showDeleted && (
            <>
              <p className="kids-closet__deleted-hint">
                Deleted profiles are kept for {RESTORE_DAYS} days. Restore them
                before they're gone permanently.
              </p>
              <div className="kids-closet__grid">
                {activeDeleted.map((p) => (
                  <ProfileCard key={p.id} p={p} isDeletedCard />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <PetProfileModal
        isOpen={isProfileOpen}
        onClose={() => { setIsProfileOpen(false); setEditingProfile(null); }}
        onSave={handleSaveProfile}
        profile={editingProfile}
      />

      {activePet && (
        <PetClosetModal
          pet={activePet}
          onClose={() => setActivePet(null)}
          onUpdatePet={(updated) => {
            setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            setActivePet(updated);
          }}
        />
      )}
    </main>
  );
}
