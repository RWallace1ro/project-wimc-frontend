import React, { useState, useEffect } from "react";
import "./Avatar.css";

function getInitials(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0][0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

// Optimize Cloudinary-hosted avatars only — a plain-string .replace() is a
// no-op on Google profile photo URLs (no "/upload/" segment), so it's safe
// to apply unconditionally regardless of where the avatar came from.
function toThumb(url) {
  return url ? url.replace("/upload/", "/upload/f_auto,q_auto,w_200,c_limit/") : url;
}

// Shared avatar display: shows the user's uploaded photo when one exists;
// otherwise (or if the photo fails to load) falls back to a circle with
// their initials, instead of a hardcoded stock placeholder photo.
export default function Avatar({ url, name, className = "", style }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [url]);

  if (url && !failed) {
    return (
      <img
        src={toThumb(url)}
        alt="User avatar"
        className={`avatar-img ${className}`}
        style={style}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div className={`avatar-initials ${className}`} style={style} aria-label="User avatar">
      {getInitials(name)}
    </div>
  );
}
