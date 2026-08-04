import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { fetchImagesForSection } from "../../utils/CloudinaryAPI";
import "./ClosetCarousel.css";

const SECTIONS = [
  "dresses-skirts",
  "dress-shirts-suits",
  "shoes-sneakers",
  "pants-jeans",
  "tops",
  "bags-accessories",
  "jackets-coats",
  "blazers",
];

const CONTROLS_IDLE_MS = 3000;

function toThumb(url) {
  return url?.replace("/upload/", "/upload/f_auto,q_auto,e_improve,w_500,c_limit/") || url;
}

// Fisher-Yates — a fresh order every time the carousel opens.
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Same continuously-scrolling marquee style as the home-screen door-open
// reveal (ClosetDoorCarousel) — several photos visible side by side,
// endlessly drifting left — rather than one image at a time. Reads as an
// actual ambient display (think a screensaver or "fireplace on the TV")
// instead of a slideshow you have to click through.
export default function ClosetCarousel({ isOpen, onClose }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);

  const idleRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    Promise.all(SECTIONS.map((s) => fetchImagesForSection(s).catch(() => [])))
      .then((lists) => {
        if (cancelled) return;
        setImages(shuffle(lists.flat().filter(Boolean)));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (isOpen && playing && !muted) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isOpen, playing, muted]);

  const wakeControls = useCallback(() => {
    setControlsVisible(true);
    clearTimeout(idleRef.current);
    idleRef.current = setTimeout(() => setControlsVisible(false), CONTROLS_IDLE_MS);
  }, []);
  useEffect(() => {
    if (!isOpen) return;
    wakeControls();
    return () => clearTimeout(idleRef.current);
  }, [isOpen, wakeControls]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === " ") { e.preventDefault(); setPlaying((p) => !p); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Duplicated so the marquee loop has no visible seam (same trick as
  // ClosetDoorCarousel).
  const loop = images.length ? [...images, ...images] : [];

  return createPortal(
    <div
      className={`cc-overlay${controlsVisible ? "" : " cc-overlay--idle"}`}
      onMouseMove={wakeControls}
      onTouchStart={wakeControls}
      onClick={wakeControls}
      role="dialog"
      aria-label="Closet slideshow"
    >
      {loading && <p className="cc-status">Loading your closet…</p>}
      {!loading && !images.length && (
        <p className="cc-status">
          No photos yet — add a few items to your closet to use the slideshow.
        </p>
      )}
      {!loading && images.length > 0 && (
        <div className="cc-marquee">
          <div className={`cc-marquee__track${playing ? "" : " cc-marquee__track--paused"}`}>
            {loop.map((url, i) => (
              <div className="cc-marquee__item" key={i}>
                <img
                  src={toThumb(url)}
                  alt=""
                  onLoad={(e) => e.currentTarget.classList.add("is-loaded")}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <audio ref={audioRef} src="/carousel-audio/ambient-loop.mp3" loop />

      <div className="cc-controls">
        <button className="cc-btn cc-btn--close" onClick={onClose} aria-label="Close slideshow">
          ✕
        </button>
        {images.length > 0 && (
          <>
            <div className="cc-bottom-bar">
              <button className="cc-btn" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"}>
                {playing ? "⏸" : "▶"}
              </button>
              <button className="cc-btn" onClick={() => setMuted((m) => !m)} aria-label={muted ? "Unmute music" : "Mute music"}>
                {muted ? "🔇" : "🔊"}
              </button>
            </div>
            {!muted && (
              <span className="cc-credit">
                🎵 "Ambient" by raspberrymusic — CC BY 3.0, via Wikimedia Commons
              </span>
            )}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
