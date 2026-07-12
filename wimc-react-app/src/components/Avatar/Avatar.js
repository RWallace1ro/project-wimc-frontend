import React, { useState, useEffect } from "react";
import "./Avatar.css";

function getInitials(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0][0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
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
        src={url}
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
