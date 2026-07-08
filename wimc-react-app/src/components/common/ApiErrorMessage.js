import React from "react";
import { Link } from "react-router-dom";

// The server sends this exact phrase inside the daily-limit message when the
// user isn't on the top AI tier yet. Turn it into a clickable link to
// Pricing wherever it appears, instead of showing plain unclickable text.
const UPGRADE_PHRASE = "Upgrade your plan for more daily AI requests";

export default function ApiErrorMessage({ message, className }) {
  if (!message) return null;
  const idx = message.indexOf(UPGRADE_PHRASE);
  if (idx === -1) return <p className={className}>{message}</p>;
  const before = message.slice(0, idx);
  const after = message.slice(idx + UPGRADE_PHRASE.length);
  return (
    <p className={className}>
      {before}
      <Link to="/pricing">{UPGRADE_PHRASE}</Link>
      {after}
    </p>
  );
}
