import React, { useState, useEffect } from "react";
import { uploadRawJSON } from "../utils/CloudinaryAPI";
import KidsClosetModal from "../components/KidsClosetModal/KidsClosetModal";
import KidsProfileModal from "../components/KidsProfileModal/KidsProfileModal";
import "./KidsCloset.css";

const LS_KEY = "wimc_kids_profiles";

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

function loadProfiles() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveProfiles(profiles) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(profiles));
  } catch {}
}

export default function KidsCloset() {
  const [profiles, setProfiles] = useState(loadProfiles);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [activeChild, setActiveChild] = useState(null); // opens closet
  const [sharing, setSharing] = useState({}); // { [id]: status }
  const [shareUrls, setShareUrls] = useState({}); // { [id]: url }

  useEffect(() => {
    saveProfiles(profiles);
  }, [profiles]);

  const handleSaveProfile = (data) => {
    setProfiles((prev) => {
      if (editingProfile) {
        return prev.map((p) =>
          p.id === editingProfile.id ? { ...p, ...data } : p,
        );
      }
      return [
        ...prev,
        { id: uid(), createdAt: new Date().toISOString(), ...data },
      ];
    });
    setEditingProfile(null);
    setIsProfileOpen(false);
  };

  const handleDelete = (id) => {
    if (!window.confirm("Delete this child's profile and closet?")) return;
    setProfiles((prev) => prev.filter((p) => p.id !== id));
  };

  const handleEdit = (profile) => {
    setEditingProfile(profile);
    setIsProfileOpen(true);
  };

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
        // Native share sheet
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
            <div className="kids-card" key={p.id}>
              {/* Card header */}
              <div className="kids-card__top">
                <span className="kids-card__icon">{groupIcon(p.ageGroup)}</span>
                <div className="kids-card__name-group">
                  <h2 className="kids-card__name">{p.name}</h2>
                  <span className="kids-card__age-badge">
                    {groupLabel(p.ageGroup)} · {p.age}
                  </span>
                </div>
              </div>

              {/* Sizing */}
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

              {/* Favorites */}
              {(p.favoriteColors || p.favoriteStyles) && (
                <div className="kids-card__favorites">
                  {p.favoriteColors && (
                    <span className="kids-card__fav">
                      🎨 {p.favoriteColors}
                    </span>
                  )}
                  {p.favoriteStyles && (
                    <span className="kids-card__fav">
                      ✨ {p.favoriteStyles}
                    </span>
                  )}
                </div>
              )}

              {/* Notes */}
              {p.notes && <p className="kids-card__notes">{p.notes}</p>}

              {/* Actions */}
              <div className="kids-card__actions">
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
                  🗑️
                </button>
              </div>

              {/* Share URL */}
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
          ))}
        </div>
      )}

      {/* Add / Edit profile modal */}
      <KidsProfileModal
        isOpen={isProfileOpen}
        onClose={() => {
          setIsProfileOpen(false);
          setEditingProfile(null);
        }}
        onSave={handleSaveProfile}
        profile={editingProfile}
      />

      {/* Child's full closet */}
      {activeChild && (
        <KidsClosetModal
          child={activeChild}
          onClose={() => setActiveChild(null)}
        />
      )}
    </main>
  );
}
