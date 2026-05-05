import React, { useState, useEffect } from "react";
import { uploadRawJSON } from "../utils/CloudinaryAPI";
import KidsClosetModal from "../components/KidsClosetModal/KidsClosetModal";
import KidsProfileModal from "../components/KidsProfileModal/KidsProfileModal";
import "./KidsCloset.css";

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
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

// Days remaining before permanent delete
function daysLeft(deletedAt) {
  const ms = RESTORE_DAYS * 24 * 60 * 60 * 1000;
  const diff = ms - (Date.now() - new Date(deletedAt).getTime());
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

export default function KidsCloset() {
  const [profiles, setProfiles] = useState(() => load(LS_KEY, []));
  const [deleted, setDeleted] = useState(() => load(LS_DELETED_KEY, []));
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [activeChild, setActiveChild] = useState(null);
  const [sharing, setSharing] = useState({});
  const [shareUrls, setShareUrls] = useState({});
  const [showDeleted, setShowDeleted] = useState(false);

  // Persist on change
  useEffect(() => {
    save(LS_KEY, profiles);
  }, [profiles]);
  useEffect(() => {
    save(LS_DELETED_KEY, deleted);
  }, [deleted]);

  // Purge permanently expired deleted cards on load
  useEffect(() => {
    setDeleted((prev) => prev.filter((p) => daysLeft(p.deletedAt) > 0));
  }, []);

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
  const handleShare = async (profile) => {
    setSharing((prev) => ({ ...prev, [profile.id]: "sharing" }));
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
      },
      meta: { source: "WIMC Kids' Closet" },
    };
    try {
      const res = await uploadRawJSON(payload, "wimc/kids-profiles");
      const url = res?.secure_url || res?.url || "";
      if (url) {
        setShareUrls((prev) => ({ ...prev, [profile.id]: url }));
        try {
          await navigator.clipboard.writeText(url);
        } catch {}
        if (navigator.share) {
          try {
            await navigator.share({
              title: `${profile.name}'s Sizing Info — WIMC`,
              text: `Here is ${profile.name}'s current clothing and shoe sizes!`,
              url,
            });
          } catch {}
        }
        setSharing((prev) => ({ ...prev, [profile.id]: "done" }));
      } else {
        setSharing((prev) => ({ ...prev, [profile.id]: "error" }));
      }
    } catch {
      setSharing((prev) => ({ ...prev, [profile.id]: "error" }));
    }
  };

  const groupLabel = (val) =>
    AGE_GROUPS.find((g) => g.value === val)?.label || val;
  const groupIcon = (val) => GROUP_ICONS[val] || "👶";

  // ── Profile card ──────────────────────────────────────────────────────────
  const ProfileCard = ({ p, isDeletedCard = false }) => (
    <div className={`kids-card ${isDeletedCard ? "kids-card--deleted" : ""}`}>
      {isDeletedCard && (
        <div className="kids-card__deleted-banner">
          🗑️ Deleted — {daysLeft(p.deletedAt)} day
          {daysLeft(p.deletedAt) !== 1 ? "s" : ""} to restore
        </div>
      )}

      <div className="kids-card__top">
        <span className="kids-card__icon">{groupIcon(p.ageGroup)}</span>
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
              👗 Open Closet
            </button>
            <button
              className="kids-card__btn kids-card__btn--share"
              onClick={() => handleShare(p)}
              disabled={sharing[p.id] === "sharing"}
            >
              {sharing[p.id] === "sharing"
                ? "Sharing…"
                : sharing[p.id] === "done"
                  ? "✅ Shared!"
                  : sharing[p.id] === "error"
                    ? "❌ Failed"
                    : "🔗 Share Sizes"}
            </button>
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

      {shareUrls[p.id] && (
        <div className="kids-card__share-url">
          <input
            className="kids-card__url-input"
            readOnly
            value={shareUrls[p.id]}
            onFocus={(e) => e.target.select()}
          />
        </div>
      )}
    </div>
  );

  // Active (non-expired) deleted cards
  const activeDeleted = deleted.filter((p) => daysLeft(p.deletedAt) > 0);

  return (
    <main className="kids-closet">
      <header className="kids-closet__header">
        <div className="kids-closet__header-text">
          <h1 className="kids-closet__title">👶 Kids' Closet</h1>
          <p className="kids-closet__sub">
            Manage clothing and sizing for each child — and share their info
            with family and friends.
          </p>
        </div>
        <button
          className="kids-closet__add-btn"
          onClick={() => {
            setEditingProfile(null);
            setIsProfileOpen(true);
          }}
        >
          + Add Child
        </button>
      </header>

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
          onClose={() => setActiveChild(null)}
        />
      )}
    </main>
  );
}
