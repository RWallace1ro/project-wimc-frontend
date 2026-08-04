import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
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

const SLIDE_MS = 6000;
const CONTROLS_IDLE_MS = 3000;

// Deterministic-ish shuffle (Fisher-Yates) — a fresh random order every time
// the carousel opens, not just closet-grid order every time.
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ClosetCarousel({ isOpen, onClose }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);

  const timerRef = useRef(null);
  const idleRef = useRef(null);
  const audioRef = useRef(null);

  // Fetch every photo across all 8 closet sections (including sub-sections,
  // via fetchImagesForSection) once per open, then shuffle into one big loop.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    Promise.all(SECTIONS.map((s) => fetchImagesForSection(s).catch(() => [])))
      .then((lists) => {
        if (cancelled) return;
        const flat = shuffle(lists.flat().filter(Boolean));
        setImages(flat);
        setIndex(0);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen]);

  // Auto-advance
  useEffect(() => {
    clearInterval(timerRef.current);
    if (!isOpen || !playing || images.length < 2) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, SLIDE_MS);
    return () => clearInterval(timerRef.current);
  }, [isOpen, playing, images.length]);

  // Background music — muted by default (autoplay-with-sound is blocked by
  // every browser without a user gesture); the Unmute button is that gesture.
  useEffect(() => {
    if (!audioRef.current) return;
    if (isOpen && playing && !muted) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isOpen, playing, muted]);

  // Auto-hide controls after inactivity — reads like an actual ambient
  // display (a fireplace loop) rather than an app screen with UI chrome
  // sitting on top the whole time.
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
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % Math.max(images.length, 1));
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + images.length) % Math.max(images.length, 1));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose, images.length]);

  const goNext = () => setIndex((i) => (i + 1) % Math.max(images.length, 1));
  const goPrev = () => setIndex((i) => (i - 1 + images.length) % Math.max(images.length, 1));

  const current = images[index];

  const content = useMemo(() => {
    if (loading) {
      return <p className="cc-status">Loading your closet…</p>;
    }
    if (!images.length) {
      return (
        <p className="cc-status">
          No photos yet — add a few items to your closet to use the slideshow.
        </p>
      );
    }
    return (
      <img key={current} src={current} alt="" className="cc-slide" />
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, images.length, current]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className={`cc-overlay${controlsVisible ? "" : " cc-overlay--idle"}`}
      onMouseMove={wakeControls}
      onTouchStart={wakeControls}
      onClick={wakeControls}
      role="dialog"
      aria-label="Closet slideshow"
    >
      {content}

      <audio ref={audioRef} src="/carousel-audio/ambient-loop.mp3" loop />

      <div className="cc-controls">
        <button className="cc-btn cc-btn--close" onClick={onClose} aria-label="Close slideshow">
          ✕
        </button>
        {images.length > 0 && (
          <>
            <span className="cc-counter">{index + 1} / {images.length}</span>
            <div className="cc-bottom-bar">
              <button className="cc-btn" onClick={goPrev} aria-label="Previous">‹</button>
              <button className="cc-btn" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"}>
                {playing ? "⏸" : "▶"}
              </button>
              <button className="cc-btn" onClick={goNext} aria-label="Next">›</button>
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
