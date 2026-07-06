import React, { useEffect, useState } from "react";
import {
  listMyShares,
  getLastCommentAt,
  getShareViewedAt,
  markShareViewed,
} from "../../utils/shareUtils";
import "./MySharesPanel.css";

const TYPE_META = {
  wishlist:     { emoji: "🛍️", label: "Wish List" },
  donatebin:    { emoji: "♻️", label: "Donate Bin" },
  shoppinglist: { emoji: "🛒", label: "Shopping List" },
  travelpack:   { emoji: "🧳", label: "Travel Pack" },
  outfit:       { emoji: "👗", label: "Outfit Plan" },
  kidsprofile:  { emoji: "👶", label: "Kids' Profile" },
  kidsCloset:   { emoji: "👶", label: "Kids' Profile" },
};

function appBase() {
  const { origin } = window.location;
  const pub = process.env.PUBLIC_URL || "";
  return `${origin}${pub}`.replace(/\/+$/, "");
}

export default function MySharesPanel({ isOpen, onClose, uid, onSharesLoaded }) {
  const [shares, setShares] = useState(null); // null = loading
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !uid) return;
    let cancelled = false;
    setShares(null);
    setError("");
    listMyShares(uid).then((list) => {
      if (cancelled) return;
      setShares(list);
      onSharesLoaded?.(list);
    }).catch(() => {
      if (!cancelled) setError("Couldn't load your shares. Please try again.");
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, uid]);

  if (!isOpen) return null;

  const isUnread = (s) => {
    const lastComment = getLastCommentAt(s);
    if (!lastComment) return false;
    const viewedAt = getShareViewedAt(s.id);
    return !viewedAt || lastComment > viewedAt;
  };

  const commentCount = (s) => Object.values(s.comments || {}).filter(Boolean).length;

  return (
    <div className="msp-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="msp-modal" role="dialog" aria-label="My Shared Links">
        <header className="msp-header">
          <h2 className="msp-title">🔗 My Shares</h2>
          <button className="msp-close" onClick={onClose} aria-label="Close">×</button>
        </header>
        <p className="msp-sub">
          Links you've sent, and any notes recipients left. Shares are kept for 30 days.
        </p>

        <div className="msp-body">
          {shares === null && !error && <p className="msp-loading">Loading…</p>}
          {error && <p className="msp-error">{error}</p>}
          {shares && shares.length === 0 && (
            <p className="msp-empty">You haven't shared anything yet.</p>
          )}
          {shares && shares.length > 0 && (
            <ul className="msp-list">
              {shares.map((s) => {
                const meta = TYPE_META[s.type] || { emoji: "📋", label: "Shared Content" };
                const unread = isUnread(s);
                const count = commentCount(s);
                const url = `${appBase()}/shared?collab=${s.id}&type=${encodeURIComponent(s.type)}`;
                return (
                  <li key={s.id} className={`msp-item${unread ? " msp-item--unread" : ""}`}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="msp-item__link"
                      onClick={() => markShareViewed(s.id)}
                    >
                      <span className="msp-item__emoji">{meta.emoji}</span>
                      <span className="msp-item__body">
                        <span className="msp-item__label">
                          {meta.label}
                          {unread && <span className="msp-item__dot" title="New comment" />}
                        </span>
                        <span className="msp-item__meta">
                          {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : ""}
                          {count > 0 && ` · 💬 ${count} note${count !== 1 ? "s" : ""}`}
                        </span>
                      </span>
                      <span className="msp-item__arrow">→</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
