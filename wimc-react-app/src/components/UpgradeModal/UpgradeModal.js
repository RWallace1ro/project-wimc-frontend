import React from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import "./UpgradeModal.css";

// Same reasoning as Pricing.js's NATIVE_PLATFORM check — Apple treats naming
// a specific paid tier in the native app's UI as an implicit offer to sell
// it, which requires a registered Apple In-App Purchase product. Genericize
// the wording on native so no tier name/price is ever shown there.
const NATIVE_PLATFORM = Capacitor.isNativePlatform();

/**
 * UpgradeModal — shown when a Free (or Pro) user taps a higher-tier feature.
 * Rendered once by TierProvider; opened via the tier gate helpers.
 */
export default function UpgradeModal({ open, feature, requiredTier, onClose }) {
  const navigate = useNavigate();
  if (!open) return null;

  const tierName = requiredTier === "pro_ai" ? "Pro + AI" : "Pro";
  const displayName = NATIVE_PLATFORM ? "a paid plan" : `WIMC ${tierName}`;

  return (
    <div
      className="upgrade-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="upgrade-modal" role="dialog" aria-label="Upgrade required">
        <button className="upgrade-modal__close" onClick={onClose} aria-label="Close">×</button>
        <div className="upgrade-modal__icon">✨</div>
        <h2 className="upgrade-modal__title">
          {NATIVE_PLATFORM
            ? (feature ? `${feature} requires a paid plan` : "Unlock with a paid plan")
            : (feature ? `${feature} is a ${tierName} feature` : `Unlock with ${tierName}`)}
        </h2>
        <p className="upgrade-modal__text">
          Upgrade to <strong>{displayName}</strong> to unlock this and more.
          Cancel anytime.
        </p>
        <div className="upgrade-modal__actions">
          <button
            className="upgrade-modal__btn upgrade-modal__btn--primary"
            onClick={() => { onClose(); navigate("/pricing"); }}
          >
            See Plans
          </button>
          <button className="upgrade-modal__btn" onClick={onClose}>
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
