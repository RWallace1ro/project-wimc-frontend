import { syncSetItem } from '../utils/syncStore';
﻿import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { uploadImage, uploadRawJSON } from "../utils/CloudinaryAPI";
import { appShareUrl, createCollabDoc, shareAppLink, smsShareUrl } from "../utils/shareUtils";
import { useBackground } from "../context/BackgroundContext";
import { KID_BACKGROUND_PRESETS } from "../utils/backgroundPresets";
import KidsClosetModal from "../components/KidsClosetModal/KidsClosetModal";
import KidsProfileModal from "../components/KidsProfileModal/KidsProfileModal";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import "./KidsCloset.css";

const KIDS_PAGE_BG_KEY = "kids-closet-page";

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
const isColor  = (v) => v && v.startsWith(COLOR_PREFIX);
const colorVal = (v) => v.replace(COLOR_PREFIX, "");

// ── Inline background picker (mirrors Settings → Appearance) ─────────────────
function KidsPageBgPicker({ onClose }) {
  const { backgrounds, setBackground, resetBackground } = useBackground();
  const current  = backgrounds[KIDS_PAGE_BG_KEY] || null;
  const fileRef  = useRef(null);
  const [activeTab,  setActiveTab]  = useState("photos");
  const [uploading,  setUploading]  = useState(false);
  const [err,        setErr]        = useState("");
  const [saved,      setSaved]      = useState(false);

  const pick = (val) => {
    setBackground(KIDS_PAGE_BG_KEY, val);
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
      {/* Header row */}
      <div className="kcp-bg-picker__header">
        <span className="kcp-bg-picker__title">🎨 Choose Background</span>
        {saved && <span className="kcp-bg-picker__saved">✅ Saved!</span>}
        <div className="kcp-bg-picker__header-actions">
          {current && (
            <button
              className="kcp-bg-picker__reset"
              onClick={() => { resetBackground(KIDS_PAGE_BG_KEY); onClose(); }}
            >
              ↩️ Reset
            </button>
          )}
          <button className="kcp-bg-picker__close-btn" onClick={onClose}>×</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="kcp-bg-tabs">
        <button className={`kcp-bg-tab ${activeTab === "photos" ? "is-active" : ""}`} onClick={() => setActiveTab("photos")}>🖼️ Photos</button>
        <button className={`kcp-bg-tab ${activeTab === "colors" ? "is-active" : ""}`} onClick={() => setActiveTab("colors")}>🎨 Colors</button>
      </div>

      {/* Photos tab */}
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

      {/* Colors tab */}
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

const LS_KEY = "wimc_kids_profiles";
const LS_DELETED_KEY = "wimc_kids_deleted";
const RESTORE_DAYS = 14;

const AGE_GROUPS = [
  { value: "baby", label: "Baby", range: "0–12 months" },
  { value: "toddler", label: "Toddler", range: "1–3 years" },
  { value: "kids", label: "Kids", range: "4–12 years" },
  { value: "teen", label: "Teen", range: "13–17 years" },
];
const GROUP_ICONS = { baby: "👶", toddler: "🧒", kids: "🧑", teen: "🧑‍🎓" };

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

// Days remaining before permanent delete
function daysLeft(deletedAt) {
  const ms = RESTORE_DAYS * 24 * 60 * 60 * 1000;
  const diff = ms - (Date.now() - new Date(deletedAt).getTime());
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

export default function KidsCloset() {
  const navigate = useNavigate();
  const { backgrounds } = useBackground();
  const currentBg = backgrounds[KIDS_PAGE_BG_KEY] || null;
  const [showBgPicker, setShowBgPicker] = useState(false);

  // Current Firebase user UID — named currentUid to avoid shadowing the uid()
  // ID-generator function defined in module scope above.
  const currentUid = auth.currentUser?.uid || null;

  const [profiles, setProfiles] = useState(() => load(LS_KEY, []));
  const [deleted, setDeleted] = useState(() => load(LS_DELETED_KEY, []));
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [activeChild, setActiveChild] = useState(null);
  const [sharing, setSharing] = useState({});
  const [smsHrefs, setSmsHrefs] = useState({});
  const [showDeleted, setShowDeleted] = useState(false);

  // ── Firestore sync ─────────────────────────────────────────────────────────
  // firestoreLoaded gates the save effect so we never overwrite cloud data with
  // stale localStorage data before the initial Firestore fetch completes.
  const [firestoreLoaded, setFirestoreLoaded] = useState(false);

  // Derive page background style
  const pageStyle = currentBg
    ? isColor(currentBg)
      ? { backgroundImage: "none", backgroundColor: colorVal(currentBg) }
      : { backgroundImage: `url(${currentBg})` }
    : {};

  // ── Load from Firestore on mount (source of truth for cross-device sync) ──
  // Reads from the existing users/{uid} document (same collection App.js uses),
  // so no extra Firestore security-rule changes are required.
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
          // profiles/deleted both start seeded from a bare, non-account-scoped
          // localStorage key (LS_KEY) — on a browser previously used by a
          // DIFFERENT account, that seed is that other account's leftover
          // data. Firestore (keyed by currentUid) is the actual source of
          // truth here, so an account with no kidsProfiles field must clear
          // to empty, not silently keep whatever the stale local seed had —
          // otherwise that leftover data gets written right back into THIS
          // account's Firestore doc by the save effect below.
          setProfiles(data.kidsProfiles || []);
          setDeleted(
            (data.kidsDeleted || []).filter((p) => daysLeft(p.deletedAt) > 0)
          );
        } else {
          setProfiles([]);
          setDeleted([]);
        }
      } catch (e) {
        console.warn("KidsCloset: could not load from Firestore:", e);
        setDeleted((prev) => prev.filter((p) => daysLeft(p.deletedAt) > 0));
      } finally {
        setFirestoreLoaded(true);
      }
    })();
  }, [currentUid]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save to localStorage + Firestore whenever profiles or deleted change ──
  // Merges into users/{uid} so other user fields (name, avatar, etc.) are untouched.
  useEffect(() => {
    save(LS_KEY, profiles);
    save(LS_DELETED_KEY, deleted);
    if (!currentUid || !firestoreLoaded) return;
    const timer = setTimeout(async () => {
      try {
        await setDoc(
          doc(db, "users", currentUid),
          {
            kidsProfiles: profiles,
            kidsDeleted: deleted,
            kidsProfilesUpdatedAt: new Date().toISOString(),
          },
          { merge: true } // never overwrites userName, avatarUrl, etc.
        );
      } catch (e) {
        console.warn("KidsCloset: could not save to Firestore:", e);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [profiles, deleted, currentUid, firestoreLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveProfile = (data) => {
    setProfiles((prev) =>
      editingProfile
        ? prev.map((p) => (p.id === editingProfile.id ? { ...p, ...data } : p))
        : [
            ...prev,
            { id: uid(), createdAt: new Date().toISOString(), ...data },
          ],
    );
    setEditingProfile(null);
    setIsProfileOpen(false);
  };

  // ── Soft delete ───────────────────────────────────────────────────────────
  const handleDelete = (id) => {
    const profile = profiles.find((p) => p.id === id);
    if (!profile) return;
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    setDeleted((prev) => [
      ...prev,
      { ...profile, deletedAt: new Date().toISOString() },
    ]);
    setShowDeleted(true); // auto-show the recovery section
  };

  // ── Restore ───────────────────────────────────────────────────────────────
  const handleRestore = (id) => {
    const profile = deleted.find((p) => p.id === id);
    if (!profile) return;
    const { deletedAt, ...rest } = profile;
    setProfiles((prev) => [...prev, rest]);
    setDeleted((prev) => prev.filter((p) => p.id !== id));
  };

  // ── Permanent delete ──────────────────────────────────────────────────────
  const handlePermanentDelete = (id) => {
    if (
      !window.confirm("Permanently delete this profile? This cannot be undone.")
    )
      return;
    setDeleted((prev) => prev.filter((p) => p.id !== id));
  };

  const handleEdit = (profile) => {
    setEditingProfile(profile);
    setIsProfileOpen(true);
  };

  // ── Share ─────────────────────────────────────────────────────────────────
  const handleShare = async (profile, withEdit = false) => {
    setSharing((prev) => ({ ...prev, [profile.id]: "sharing" }));
    setSmsHrefs((prev) => ({ ...prev, [profile.id]: "" }));
    const payload = {
      kind: "wimc.kidsProfile",
      version: 1,
      createdAt: new Date().toISOString(),
      child: {
        name: profile.name,
        ageGroup: profile.ageGroup,
        age: profile.age,
        clothingSizeUS: profile.clothingSizeUS,
        clothingSizeEU: profile.clothingSizeEU,
        shoeSizeUS: profile.shoeSizeUS,
        shoeSizeEU: profile.shoeSizeEU,
        favoriteColors: profile.favoriteColors,
        favoriteStyles: profile.favoriteStyles,
        notes: profile.notes || "",
        photoUrl: profile.photoUrl || "",
      },
      meta: { source: "WIMC Kids' Closet" },
    };
    try {
      let shareUrl;
      if (withEdit) {
        shareUrl = await createCollabDoc("kidsprofile", payload);
      } else {
        const res = await uploadRawJSON(payload, "wimc/kids-profiles");
        const cloudUrl = res?.secure_url || res?.url || "";
        if (!cloudUrl) throw new Error("no url");
        shareUrl = appShareUrl(cloudUrl, "kidsprofile");
      }
      const msgText = `Here is ${profile.name}'s current clothing and shoe sizes!`;
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

  const groupLabel = (val) =>
    AGE_GROUPS.find((g) => g.value === val)?.label || val;
  const groupIcon = (val) => GROUP_ICONS[val] || "👶";

  // ── Profile card ──────────────────────────────────────────────────────────
  const ProfileCard = ({ p, isDeletedCard = false }) => {
    const cardPhotoRef = useRef(null);
    const [cardPhotoLoading, setCardPhotoLoading] = useState(false);

    const handleCardPhotoChange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setCardPhotoLoading(true);
      try {
        const res = await uploadImage(file, "kid-avatars");
        if (res?.secure_url) {
          setProfiles((prev) =>
            prev.map((q) =>
              q.id === p.id ? { ...q, photoUrl: res.secure_url } : q
            )
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
        {/* Avatar / icon with camera overlay (active cards only) */}
        <div
          className="kids-card__avatar-wrap"
          title={isDeletedCard ? undefined : "Change photo"}
        >
          {p.photoUrl ? (
            <img src={p.photoUrl} alt={p.name} className="kids-card__avatar" />
          ) : (
            <span className="kids-card__icon">{groupIcon(p.ageGroup)}</span>
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
              <input
                ref={cardPhotoRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleCardPhotoChange}
              />
            </>
          )}
        </div>
        <div className="kids-card__name-group">
          <h2 className="kids-card__name">{p.name}</h2>
          <span className="kids-card__age-badge">
            {groupLabel(p.ageGroup)} · {p.age}
          </span>
        </div>
      </div>

      <div className="kids-card__sizes">
        <div className="kids-card__size-block">
          <span className="kids-card__size-label">👕 Clothing</span>
          <div className="kids-card__size-row">
            <span className="kids-card__size-val">
              US: {p.clothingSizeUS || "—"}
            </span>
            <span className="kids-card__size-val">
              EU: {p.clothingSizeEU || "—"}
            </span>
          </div>
        </div>
        <div className="kids-card__size-block">
          <span className="kids-card__size-label">👟 Shoes</span>
          <div className="kids-card__size-row">
            <span className="kids-card__size-val">
              US: {p.shoeSizeUS || "—"}
            </span>
            <span className="kids-card__size-val">
              EU: {p.shoeSizeEU || "—"}
            </span>
          </div>
        </div>
      </div>

      {(p.favoriteColors || p.favoriteStyles) && (
        <div className="kids-card__favorites">
          {p.favoriteColors && (
            <span className="kids-card__fav">🎨 {p.favoriteColors}</span>
          )}
          {p.favoriteStyles && (
            <span className="kids-card__fav">✨ {p.favoriteStyles}</span>
          )}
        </div>
      )}
      {p.notes && <p className="kids-card__notes">{p.notes}</p>}

      <div className="kids-card__actions">
        {!isDeletedCard ? (
          <>
            <button
              className="kids-card__btn kids-card__btn--closet"
              onClick={() => setActiveChild(p)}
            >
              🚪 Open Closet
            </button>
            <button
              className="kids-card__btn kids-card__btn--share"
              onClick={() => handleShare(p, false)}
              disabled={sharing[p.id] === "sharing"}
              title="Share child profile (view only)"
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
            <button
              className="kids-card__btn kids-card__btn--edit"
              onClick={() => handleEdit(p)}
            >
              ✏️ Edit
            </button>
            <button
              className="kids-card__btn kids-card__btn--delete"
              onClick={() => handleDelete(p.id)}
            >
              🗑️ Delete
            </button>
          </>
        ) : (
          <>
            <button
              className="kids-card__btn kids-card__btn--restore"
              onClick={() => handleRestore(p.id)}
            >
              ↩️ Restore
            </button>
            <button
              className="kids-card__btn kids-card__btn--delete"
              onClick={() => handlePermanentDelete(p.id)}
            >
              🗑️ Delete Forever
            </button>
          </>
        )}
      </div>

    </div>
    );
  };

  // Active (non-expired) deleted cards
  const activeDeleted = deleted.filter((p) => daysLeft(p.deletedAt) > 0);

  return (
    <main className="kids-closet" style={pageStyle}>
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
            <h1 className="kids-closet__title">👶 Kids' Closet</h1>
            <p className="kids-closet__sub">
              Manage clothing and sizing for each child — and share their info
              with family and friends.
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
            onClick={() => {
              setEditingProfile(null);
              setIsProfileOpen(true);
            }}
          >
            + Add Child
          </button>
        </div>
      </header>

      {/* ── Background picker panel ── */}
      {showBgPicker && (
        <KidsPageBgPicker onClose={() => setShowBgPicker(false)} />
      )}

      {/* ── Active profiles ── */}
      {profiles.length === 0 ? (
        <div className="kids-closet__empty">
          <p>No children added yet.</p>
          <p>
            Click <strong>+ Add Child</strong> to create a profile.
          </p>
        </div>
      ) : (
        <div className="kids-closet__grid">
          {profiles.map((p) => (
            <ProfileCard key={p.id} p={p} />
          ))}
        </div>
      )}

      {/* ── Recently deleted section ── */}
      {activeDeleted.length > 0 && (
        <div className="kids-closet__deleted-section">
          <button
            className="kids-closet__deleted-toggle"
            onClick={() => setShowDeleted((v) => !v)}
          >
            🗑️ Recently Deleted ({activeDeleted.length}){" "}
            {showDeleted ? "▾" : "▸"}
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

      <KidsProfileModal
        isOpen={isProfileOpen}
        onClose={() => {
          setIsProfileOpen(false);
          setEditingProfile(null);
        }}
        onSave={handleSaveProfile}
        profile={editingProfile}
      />

      {activeChild && (
        <KidsClosetModal
          child={activeChild}
          siblings={profiles}
          onSwitchChild={(p) => setActiveChild(p)}
          onClose={() => setActiveChild(null)}
          onUpdateChild={(updated) => {
            setProfiles((prev) =>
              prev.map((p) => (p.id === updated.id ? updated : p))
            );
            setActiveChild(updated);
          }}
        />
      )}
    </main>
  );
}
