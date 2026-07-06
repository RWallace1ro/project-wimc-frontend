import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { decodeShareSrc, getCollabDoc, toggleCollabItem, setCollabComment } from "../utils/shareUtils";
import { auth } from "../firebase";
import Lightbox from "../components/Lightbox/Lightbox";
import "./SharedView.css";

const GROUP_ICONS = { baby: "👶", toddler: "🧒", kids: "🧑", teen: "🧑‍🎓" };
const AGE_LABELS  = { baby: "Baby", toddler: "Toddler", kids: "Kids", teen: "Teen" };

// ── Per-item note/suggestion ───────────────────────────────────────────────────
// Anyone can READ an existing comment; only a recipient with edit access can
// add or change one. This is the "editing" action for share types (like an
// Outfit Plan) that don't have a checkbox model.
function ItemComment({ itemKey, comments, canEdit, onComment }) {
  const existing = comments?.[itemKey]?.text || "";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(existing);

  if (!canEdit && !existing) return null;

  if (editing) {
    return (
      <div className="sv-comment sv-comment--editing" onClick={(e) => e.stopPropagation()}>
        <input
          className="sv-comment__input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a note or suggestion…"
          maxLength={280}
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && (onComment(itemKey, draft), setEditing(false))}
        />
        <button className="sv-comment__save" onClick={() => { onComment(itemKey, draft); setEditing(false); }}>✓</button>
        <button className="sv-comment__cancel" onClick={() => { setDraft(existing); setEditing(false); }}>✕</button>
      </div>
    );
  }
  return (
    <div
      className={`sv-comment${canEdit ? " sv-comment--clickable" : ""}`}
      onClick={(e) => { e.stopPropagation(); if (canEdit) setEditing(true); }}
    >
      {existing
        ? <span className="sv-comment__text">💬 {existing}</span>
        : canEdit && <span className="sv-comment__add">+ Add a note</span>
      }
    </div>
  );
}

// ── Sub-view: Wish List ───────────────────────────────────────────────────────
function WishListView({ data, onImageClick, canEdit, comments, onComment }) {
  const items = data?.items || [];
  if (!items.length) return <p className="sv-empty">No items in this wish list.</p>;
  const images = items.filter((it) => it.image).map((it) => ({ src: it.image, alt: it.name || "Item" }));
  return (
    <div className="sv-wish-list">
      {items.map((item, i) => {
        const key = item.id || `item_${i}`;
        return (
          <div key={key} className="sv-wish-item">
            {item.image
              ? <img
                  src={item.image}
                  alt={item.name || "Item"}
                  className="sv-wish-item__img"
                  style={{ cursor: "pointer" }}
                  onClick={() => onImageClick(images, images.findIndex((im) => im.src === item.image))}
                />
              : <div className="sv-wish-item__img" style={{ background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🛍️</div>
            }
            <div className="sv-wish-item__info">
              <p className="sv-wish-item__name">{item.name || "Unnamed item"}</p>
              {item.description && <p className="sv-wish-item__desc">{item.description}</p>}
              {item.siteName && <span className="sv-wish-item__site">{item.siteName}</span>}
              <ItemComment itemKey={key} comments={comments} canEdit={canEdit} onComment={onComment} />
            </div>
            {item.url && (
              <a href={item.url} target="_blank" rel="noreferrer" className="sv-wish-item__link">View →</a>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Sub-view: Donate Bin ──────────────────────────────────────────────────────
function DonateBinView({ data, collabId, canEdit, checkedItems, onToggle, onImageClick, comments, onComment }) {
  const pending = data?.pending || [];
  const donated = data?.donated || [];
  const allImages = [...pending, ...donated]
    .filter((it) => it.imageUrl)
    .map((it) => ({ src: it.imageUrl, alt: it.name || "Item" }));
  const clickFor = (item) => () =>
    item.imageUrl && onImageClick(allImages, allImages.findIndex((im) => im.src === item.imageUrl));
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
                  {item.imageUrl && <img src={item.imageUrl} alt={item.name} style={{ cursor: "pointer" }} onClick={clickFor(item)} />}
                  <div className="sv-thumb__name">{item.name || "Item"}</div>
                  {canEdit && (
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={(e) => onToggle(key, e.target.checked)}
                      style={{ position: "absolute", top: 4, left: 4, accentColor: "#7c3aed" }}
                    />
                  )}
                  <ItemComment itemKey={key} comments={comments} canEdit={canEdit} onComment={onComment} />
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
            {donated.map((item, i) => {
              const key = `donated_${i}`;
              return (
                <div key={i} className="sv-thumb sv-thumb--done">
                  {item.imageUrl && <img src={item.imageUrl} alt={item.name} style={{ cursor: "pointer" }} onClick={clickFor(item)} />}
                  <div className="sv-thumb__name">{item.name || "Item"}</div>
                  <ItemComment itemKey={key} comments={comments} canEdit={canEdit} onComment={onComment} />
                </div>
              );
            })}
          </div>
        </>
      )}
      {!pending.length && !donated.length && <p>No items in the donate bin.</p>}
    </div>
  );
}

// ── Sub-view: Shopping List ───────────────────────────────────────────────────
function ShoppingListView({ data, canEdit, checkedItems, onToggle, comments, onComment }) {
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
            <ItemComment itemKey={key} comments={comments} canEdit={canEdit} onComment={onComment} />
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
function TravelPackView({ data, canEdit, checkedItems, onToggle, comments, onComment }) {
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
                    <ItemComment itemKey={key} comments={comments} canEdit={canEdit} onComment={onComment} />
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
function OutfitPlanView({ data, onImageClick, canEdit, comments, onComment }) {
  const days = data?.days || {};
  const dayKeys = Object.keys(days);
  if (!dayKeys.length) return <p>No outfit plan available.</p>;
  // One flat list across all days so ‹ › in the lightbox browses the whole
  // week, not just the current day.
  const allImages = dayKeys
    .flatMap((day) => days[day] || [])
    .filter((it) => it.mediaThumb || it.mediaUrl)
    .map((it) => ({ src: it.mediaUrl || it.mediaThumb, alt: it.name || "Item" }));
  return (
    <div>
      {dayKeys.map((day) => {
        const items = days[day] || [];
        return (
          <div key={day} className="sv-day">
            <p className="sv-day__label">{day}</p>
            <div className="sv-grid">
              {items.map((item, i) => {
                const fullUrl = item.mediaUrl || item.mediaThumb;
                const key = `${day}_${i}`;
                return (
                  <div key={i} className="sv-thumb">
                    {(item.mediaThumb || item.mediaUrl)
                      ? <img
                          src={item.mediaThumb || item.mediaUrl}
                          alt={item.name || "Item"}
                          style={{ cursor: "pointer" }}
                          onClick={() => onImageClick(allImages, allImages.findIndex((im) => im.src === fullUrl))}
                        />
                      : <div style={{ aspectRatio: "3/4", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>👗</div>
                    }
                    {item.name && <div className="sv-thumb__name">{item.name}</div>}
                    <ItemComment itemKey={key} comments={comments} canEdit={canEdit} onComment={onComment} />
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

// ── Sub-view: Kids Profile ────────────────────────────────────────────────────
function KidsProfileView({ data, onImageClick }) {
  const child = data?.child || data || {};
  return (
    <div style={{ textAlign: "center" }}>
      {child.photoUrl
        ? <img
            src={child.photoUrl}
            alt={child.name}
            className="sv-kids-avatar"
            style={{ cursor: "pointer" }}
            onClick={() => onImageClick([{ src: child.photoUrl, alt: child.name }], 0)}
          />
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

// Share types that come from a Pro-gated feature (Donate Bin, Travel Pack,
// Outfit of the Day planner, Kids'/Pet Closet). Shown as an upgrade nudge to
// anyone viewing the shared link — matches the app's own ProGate list.
const PRO_TYPES = new Set(["donatebin", "travelpack", "outfit", "kidsprofile", "kidsCloset"]);

// ── Main SharedView ───────────────────────────────────────────────────────────
export default function SharedView() {
  const [searchParams] = useSearchParams();
  const [status, setStatus]     = useState("loading");
  const [payload, setPayload]   = useState(null);
  const [collabId, setCollabId] = useState(null);
  const [canEdit, setCanEdit]   = useState(false);
  const [checkedItems, setCheckedItems] = useState({});
  const [comments, setComments]         = useState({});
  const [ownerName, setOwnerName]       = useState("");
  // Fullscreen image viewer — { images: [{src,alt}], index } | null
  const [lightbox, setLightbox] = useState(null);
  const openLightbox = useCallback((images, index) => {
    if (!images?.length || index < 0) return;
    setLightbox({ images, index });
  }, []);

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
        setComments(d.comments || {});
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

  const handleComment = useCallback(async (key, text) => {
    if (!collabId) return;
    const trimmed = (text || "").trim().slice(0, 280);
    setComments((prev) => ({
      ...prev,
      [key]: trimmed ? { text: trimmed, ts: new Date().toISOString() } : null,
    }));
    await setCollabComment(collabId, key, trimmed);
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
    const props = { data: payload, collabId, canEdit, checkedItems, onToggle: handleToggle, onImageClick: openLightbox, comments, onComment: handleComment };
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
            {type === "outfit" || type === "wishlist"
              ? "✏️ You have edit access — click 💬 on any item to leave a note or suggestion. Your changes are saved automatically."
              : "✏️ You have edit access — check items off and leave notes on any item. Your changes are saved automatically."
            }
          </div>
        )}

        {/* The sender's note — every share type (Donate Bin, Shopping List,
            Travel Pack, Outfit Plan) can attach one, but it lives at the top
            level of the payload, not inside any one sub-view's data shape. */}
        {payload?.note && (
          <div className="sv__note">📝 {payload.note}</div>
        )}

        <div className="sv__card-body">
          {renderContent()}
        </div>
      </div>

      {PRO_TYPES.has(type) && (
        <div className="sv__pro-banner">
          ⭐ This was shared from a <strong>Pro</strong> feature of WIMC.
          <a href={`${process.env.PUBLIC_URL || ""}/pricing`} className="sv__pro-banner__link">
            See plans →
          </a>
        </div>
      )}

      <footer className="sv__footer">
        {/* Goes to Pricing (not straight into the app) — it shows sign-up for
            a visitor without an account, or upgrade options if they're
            already signed in on this browser, whichever applies. */}
        <a href={`${process.env.PUBLIC_URL || ""}/pricing`} className="sv__cta">Get WIMC — Organize your closet 👗</a>
        <p className="sv__cta-sub">Free closet management for everyone</p>
      </footer>

      {lightbox && (
        <Lightbox
          images={lightbox.images}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onChange={(i) => setLightbox((prev) => ({ ...prev, index: i }))}
        />
      )}
    </div>
  );
}
