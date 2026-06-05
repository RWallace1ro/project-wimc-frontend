import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CATEGORIES,
  CONSENT_REOPEN_EVENT,
  getPreferences,
  savePreferences,
  ALL_PREFS,
  DEFAULT_PREFS,
} from "../../utils/consent";
import { applyAnalytics } from "../../utils/analytics";
import "./CookiePreferences.css";

/**
 * CookiePreferences — modal letting users toggle each cookie category and save.
 * Opened via the "Customize" banner button or the footer "Cookie Settings"
 * link (both dispatch CONSENT_REOPEN_EVENT).
 */
function CookiePreferences() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);

  useEffect(() => {
    const reopen = () => {
      setPrefs(getPreferences() || DEFAULT_PREFS);
      setOpen(true);
    };
    window.addEventListener(CONSENT_REOPEN_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_REOPEN_EVENT, reopen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const toggle = (id) =>
    setPrefs((p) => ({ ...p, [id]: !p[id] }));

  const commit = (next) => {
    applyAnalytics(savePreferences(next));
    setOpen(false);
  };

  return (
    <div
      className="cookie-prefs__overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="cookie-prefs" role="dialog" aria-modal="true" aria-label="Cookie preferences">
        <div className="cookie-prefs__header">
          <h2 className="cookie-prefs__title">Cookie preferences</h2>
          <button
            type="button"
            className="cookie-prefs__close"
            aria-label="Close"
            onClick={() => setOpen(false)}
          >
            ×
          </button>
        </div>

        <p className="cookie-prefs__intro">
          Choose which optional cookies WIMC may use. You can change this anytime
          from “Cookie Settings” in the footer. See our{" "}
          <Link to="/privacy-policy" className="cookie-prefs__link" onClick={() => setOpen(false)}>
            Privacy Policy
          </Link>
          .
        </p>

        <ul className="cookie-prefs__list">
          {CATEGORIES.map((cat) => (
            <li key={cat.id} className="cookie-prefs__row">
              <div className="cookie-prefs__row-text">
                <span className="cookie-prefs__row-label">{cat.label}</span>
                <span className="cookie-prefs__row-desc">{cat.desc}</span>
              </div>
              <label className={`cookie-switch${cat.locked ? " cookie-switch--locked" : ""}`}>
                <input
                  type="checkbox"
                  checked={cat.locked ? true : !!prefs[cat.id]}
                  disabled={cat.locked}
                  onChange={() => !cat.locked && toggle(cat.id)}
                  aria-label={cat.label}
                />
                <span className="cookie-switch__slider" />
              </label>
            </li>
          ))}
        </ul>

        <div className="cookie-prefs__footer">
          <button
            type="button"
            className="cookie-prefs__btn cookie-prefs__btn--ghost"
            onClick={() => commit(DEFAULT_PREFS)}
          >
            Reject all
          </button>
          <button
            type="button"
            className="cookie-prefs__btn cookie-prefs__btn--ghost"
            onClick={() => commit(prefs)}
          >
            Save choices
          </button>
          <button
            type="button"
            className="cookie-prefs__btn cookie-prefs__btn--primary"
            onClick={() => commit(ALL_PREFS)}
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}

export default CookiePreferences;
