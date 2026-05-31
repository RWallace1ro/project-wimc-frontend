import React, { useEffect, useCallback } from "react";
import "./Lightbox.css";

/**
 * Reusable fullscreen image lightbox.
 *
 * Props:
 *   images     – array of { src, alt } objects
 *   index      – currently displayed index
 *   onClose    – called when user closes
 *   onChange   – called with new index when user navigates
 */
export default function Lightbox({ images = [], index = 0, onClose, onChange }) {
  const total = images.length;
  const current = images[index] || {};

  const goPrev = useCallback(() => {
    if (total < 2) return;
    onChange?.((index - 1 + total) % total);
  }, [index, total, onChange]);

  const goNext = useCallback(() => {
    if (total < 2) return;
    onChange?.((index + 1) % total);
  }, [index, total, onChange]);

  // Keyboard: Esc → close, ← → → navigate
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape")     onClose?.();
      if (e.key === "ArrowLeft")  goPrev();
      if (e.key === "ArrowRight") goNext();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, goPrev, goNext]);

  // Prevent body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  if (!current.src) return null;

  return (
    <div
      className="lb__overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Image fullscreen view"
      onClick={onClose}
    >
      {/* Close */}
      <button
        className="lb__close"
        onClick={onClose}
        aria-label="Close fullscreen"
      >
        ✕
      </button>

      {/* Counter */}
      {total > 1 && (
        <div className="lb__counter">{index + 1} / {total}</div>
      )}

      {/* Prev */}
      {total > 1 && (
        <button
          className="lb__nav lb__nav--prev"
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          aria-label="Previous image"
        >
          ‹
        </button>
      )}

      {/* Image */}
      <div className="lb__img-wrap" onClick={(e) => e.stopPropagation()}>
        <img
          className="lb__img"
          src={current.src}
          alt={current.alt || ""}
          draggable={false}
        />
        {current.alt && (
          <div className="lb__caption">{current.alt}</div>
        )}
      </div>

      {/* Next */}
      {total > 1 && (
        <button
          className="lb__nav lb__nav--next"
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          aria-label="Next image"
        >
          ›
        </button>
      )}
    </div>
  );
}
