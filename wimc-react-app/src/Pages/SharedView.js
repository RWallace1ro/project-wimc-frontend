import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { decodeShareSrc, getCollabDoc, toggleCollabItem } from "../utils/shareUtils";
import { auth } from "../firebase";
import "./SharedView.css";

const GROUP_ICONS = { baby: "👶", toddler: "🧒", kids: "🧑", teen: "🧑‍🎓" };
const AGE_LABELS  = { baby: "Baby", toddler: "Toddler", kids: "Kids", teen: "Teen" };

// ── Sub-view: Wish List ───────────────────────────────────────────────────────
function WishListView({ data }) {
  const items = data?.items || [];
  if (!items.length) return <p className="sv-empty">No items in this wish list.</p>;
  return (
    <div className="sv-wish-list">
      {items.map((item, i) => (
        <div key={item.id || i} className="sv-wish-item">
          {item.image
            ? <img src={item.image} alt={item.name || "Item"} className="sv-wish-item__img" />
            : <div className="sv-wish-item__img" style={{ background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🛍️</div>
          }
          <div className="sv-wish-item__info">
            <p className="sv-wish-item__name">{item.name || "Unnamed item"}</p>
            {item.description && <p className="sv-wish-item__desc">{item.description}</p>}
            {item.siteName && <span className="sv-wish-item__site">{item.siteName}</span>}
          </div>
          {item.url && (
            <a href={item.url} target="_blank" rel="noreferrer" className="sv-wish-item__link">View →</a>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Sub-view: Donate Bin ──────────────────────────────────────────────────────
function DonateBinView({ data, collabId, canEdit, checkedItems, onToggle }) {
  const pending = data?.pending || [];
  const donated = data?.donated || [];
  return (
    <div>
      {pending.length > 0 && (
        <>
          <p className="sv-section-title">Pending Donation ({pending.length})</p>
          <div className="sv-grid">
            {pending.map((item, i) => {
              const key = `pending_${i}`;
              const done = !!checkedItems?.[key];
              return (
                <div key={i} className={`sv-thumb ${done ? "sv-thumb--done" : ""}`}>
                  {item.imageUrl && <img src={item.imageUrl} alt={item.name} />}
                  <div className="sv-thumb__name">{item.name || "Item"}</div>
                  {canEdit && (
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={(e) => onToggle(key, e.target.checked)}
                      style={{ position: "absolute", top: 4, left: 4, accentColor: "#7c3aed" }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
      {donated.length > 0 && (
        <>
          {pending.length > 0 && <div className="sv-divider" />}
          <p className="sv-section-title">Already Donated ({donated.length})</p>
          <div className="sv-grid">
            {donated.map((item, i) => (
              <div key={i} className="sv-thumb sv-thumb--done">
                {item.imageUrl && <img src={item.imageUrl} alt={item.name} />}
                <div className="sv-thumb__name">{item.name || "Item"}</div>
              </div>
            ))}
          </div>
        </>
      )}
      {!pending.length && !donated.length && <p>No items in the donate bin.</p>}
    </div>
  );
}

// ── Sub-view: Shopping List ───────────────────────────────────────────────────
function ShoppingListView({ data, canEdit, checkedItems, onToggle }) {
  const items = data?.items || [];
  if (!items.length) return <p>No items in this shopping list.</p>;
  return (
    <div className="sv-checklist">
      {items.map((item, i) => {
        const key = item.id || `item_${i}`;
        const done = !!checkedItems?.[key];
        return (
          <div key={key} className="sv-check-item">
            {canEdit
              ? <input type="checkbox" checked={done} onChange={(e) => onToggle(key, e.target.checked)} />
              : <span style={{ fontSize: 16 }}>{done ? "✅" : "⬜"}</span>
            }
            <span className={`sv-check-item__name ${done ? "sv-check-item__name--done" : ""}`}>
              {item.name || "Item"}
            </span>
            {(item.qty || item.quantity) && (
              <span className="sv-check-item__qty">×{item.qty || item.quantity}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Sub-view: Travel Pack ─────────────────────────────────────────────────────
function TravelPackView({ data, canEdit, checkedItems, onToggle }) {
  const days = data?.days || {};
  const dayKeys = Object.keys(days).sort((a, b) => Number(a) - Number(b));
  if (!dayKeys.length) return <p>No packing list available.</p>;
  return (
    <div>
      {dayKeys.map((day) => {
        const items = days[day] || [];
        return (
          <div key={day} className="sv-day">
            <p className="sv-day__label">Day {Number(day) + 1}</p>
            <div className="sv-checklist">
              {items.map((item, i) => {
                const key = `day${day}_${i}`;
                const done = !!checkedItems?.[key];
                const name = item.name || item.label || `Item ${i + 1}`;
                return (
                  <div key={key} className="sv-check-item">
                    {canEdit
                      ? <input type="checkbox" checked={done} onChange={(e) => onToggle(key, e.target.checked)} />
                      : <span style={{ fontSize: 16 }}>{done ? "✅" : "⬜"}</span>
                    }
                    <span className={`sv-check-item__name ${done ? "sv-check-item__name--done" : ""}`}>{name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Sub-view: Outfit Planner ──────────────────────────────────────────────────
function OutfitPlanView({ data }) {
  const days = data?.days || {};
  const dayKeys = Object.keys(days);
  if (!dayKeys.length) return <p>No outfit plan available.</p>;
  return (
    <div>
      {dayKeys.map((day) => {
        const items = days[day] || [];
        return (
          <div key={day} className="sv-day">
            <p className="sv-day__label">{day}</p>
            <div className="sv-grid">
              {items.map((item, i) => (
                <div key={i} className="sv-thumb">
                  {(item.mediaThumb || item.mediaUrl)
                    ? <img src={item.mediaThumb || item.mediaUrl} alt={item.name || "Item"} />
                    : <div style={{ aspectRatio: "3/4", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>👗</div>
                  }
                  {item.name && <div className="sv-thumb__name">{item.name}</div>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Sub-view: Kids Profile ────────────────────────────────────────────────────
function KidsProfileView({ data }) {
  const child = data?.child || data || {};
  return (
    <div style={{ textAlign: "center" }}>
      {child.photoUrl
        ? <img src={child.photoUrl} alt={child.name} className="sv-kids-avatar" />
        : <span className="sv-kids-icon">{GROUP_ICONS[child.ageGroup] || "👶"}</span>
      }
      <p style={{ fontSize: 20, fontWeight: 800, margin: "0 0 4px" }}>{child.name || "Child"}</p>
      <span style={{ fontSize: 13, background: "#ede9fe", color: "#6d28d9", padding: "2px 12px", borderRadius: 999, fontWeight: 600 }}>
        {AGE_LABELS[child.ageGroup] || child.ageGroup} · {child.age || "—"}
      </span>
      <div className="sv-sizes-grid" style={{ marginTop: 16 }}>
        <div className="sv-size-block">
          <p className="sv-size-label">👕 Clothing</p>
          <div className="sv-size-row">
            <span className="sv-size-val">US: {child.clothingSizeUS || "—"}</span>
            <span className="sv-size-val">EU: {child.clothingSizeEU || "—"}</span>
          </div>
        </div>
        <div className="sv-size-block">
          <p className="sv-size-label">👟 Shoes</p>
          <div className="sv-size-row">
            <span className="sv-size-val">US: {child.shoeSizeUS || "—"}</span>
            <span className="sv-size-val">EU: {child.shoeSizeEU || "—"}</span>
          </div>
        </div>
      </div>
      {(child.favoriteColors || child.favoriteStyles) && (
        <div className="sv-fav-tags" style={{ justifyContent: "center" }}>
          {child.favoriteColors && <span className="sv-fav-tag">🎨 {child.favoriteColors}</span>}
          {child.favoriteStyles && <span className="sv-fav-tag">✨ {child.favoriteStyles}</span>}
        </div>
      )}
      {child.notes && <p className="sv-notes">{child.notes}</p>}
    </div>
  );
}

// ── Titles & icons per type ───────────────────────────────────────────────────
const TYPE_META = {
  wishlist:     { emoji: "🛍️", label: "Wish List" },
  donatebin:    { emoji: "♻️", label: "Donate Bin" },
  shoppinglist: { emoji: "🛒", label: "Shopping List" },
  travelpack:   { emoji: "🧳", label: "Travel Pack" },
  outfit:       { emoji: "👗", label: "Outfit Plan" },
  kidsprofile:  { emoji: "👶", label: "Kids' Profile" },
  kidsCloset:   { emoji: "👶", label: "Kids' Profile" },
};

// ── Main SharedView ───────────────────────────────────────────────────────────
export default function SharedView() {
  const [searchParams] = useSearchParams();
  const [status, setStatus]     = useState("loading");
  const [payload, setPayload]   = useState(null);
  const [collabId, setCollabId] = useState(null);
  const [canEdit, setCanEdit]   = useState(false);
  const [checkedItems, setCheckedItems] = useState({});
  const [ownerName, setOwnerName]       = useState("");

  const type    = searchParams.get("type") || "";
  const srcEnc  = searchParams.get("src");
  const collabQ = searchParams.get("collab");

  useEffect(() => {
    async function load() {
      // ── Collab (Firestore) ──────────────────────────────────────
      // Public: anyone with the link can view (and, if the share opted into
      // anyoneCanEdit, tick checkboxes) — no login required, so non-app users
      // can engage with the shared content.
      if (collabQ) {
        const d = await getCollabDoc(collabQ);
        if (!d) { setStatus("error"); return; }
        const uid = auth.currentUser?.uid;
        setPayload(d.data);
        setOwnerName(d.ownerName || "");
        setCheckedItems(d.checkedItems || {});
        setCollabId(collabQ);
        setCanEdit(
          d.anyoneCanEdit === true ||
          (!!uid && (d.editAllowedUids || []).includes(uid))
        );
        setStatus("ok");
        return;
      }
      // ── View-only (Cloudinary JSON via encoded URL) ─────────────
      if (srcEnc) {
        const url = decodeShareSrc(srcEnc);
        if (!url) { setStatus("error"); return; }
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error("fetch failed");
          const json = await res.json();
          setPayload(json);
          setOwnerName(json?.meta?.ownerName || "");
          setStatus("ok");
        } catch { setStatus("error"); }
        return;
      }
      setStatus("error");
    }
    load();
  }, [srcEnc, collabQ]);

  const handleToggle = useCallback(async (key, value) => {
    if (!collabId) return;
    setCheckedItems((prev) => ({ ...prev, [key]: value }));
    await toggleCollabItem(collabId, key, value);
  }, [collabId]);

  const meta = TYPE_META[type] || { emoji: "📋", label: "Shared Content" };

  // ── States ────────────────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="sv">
        <div className="sv__loading">
          <p style={{ fontSize: 18, color: "#475569" }}>Loading shared content…</p>
        </div>
      </div>
    );
  }
  if (status === "needs-login") {
    return (
      <div className="sv">
        <div className="sv__login-prompt">
          <h2>🔐 Login Required</h2>
          <p>This shared content requires a WIMC account to view. Log in to continue.</p>
          <a href={process.env.PUBLIC_URL || "/"} className="sv__login-btn">Log In to WIMC</a>
        </div>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="sv">
        <div className="sv__error">
          <h2>⚠️ Content Unavailable</h2>
          <p>This link has expired or is no longer available.</p>
        </div>
      </div>
    );
  }

  // ── Render content ────────────────────────────────────────────────────────
  const renderContent = () => {
    const props = { data: payload, collabId, canEdit, checkedItems, onToggle: handleToggle };
    switch (type) {
      case "wishlist":     return <WishListView {...props} />;
      case "donatebin":    return <DonateBinView {...props} />;
      case "shoppinglist": return <ShoppingListView {...props} />;
      case "travelpack":   return <TravelPackView {...props} />;
      case "outfit":       return <OutfitPlanView {...props} />;
      case "kidsprofile":
      case "kidsCloset":   return <KidsProfileView {...props} />;
      default:
        return <pre style={{ fontSize: 12, overflowX: "auto" }}>{JSON.stringify(payload, null, 2)}</pre>;
    }
  };

  return (
    <div className="sv">
      <header className="sv__header">
        <span className="sv__logo">👗 WIMC</span>
        <span className="sv__badge">Shared with you</span>
      </header>

      <div className="sv__card">
        <div className="sv__card-head">
          <h1 className="sv__card-title">{meta.emoji} {meta.label}</h1>
          <p className="sv__card-meta">
            {ownerName ? `Shared by ${ownerName}` : "Shared via WIMC"}
            {canEdit && " · You can edit this"}
          </p>
        </div>

        {canEdit && (
          <div className="sv__edit-banner">
            ✏️ You have edit access — check items off and your changes are saved automatically.
          </div>
        )}

        <div className="sv__card-body">
          {renderContent()}
        </div>
      </div>

      <footer className="sv__footer">
        <a href={process.env.PUBLIC_URL || "/"} className="sv__cta">Get WIMC — Organize your wardrobe 👗</a>
        <p className="sv__cta-sub">Free wardrobe management for everyone</p>
      </footer>
    </div>
  );
}
