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
const BASE_SCROLL_SECONDS = 60; // duration at 1x speed
const SPEED_OPTIONS = [0.5, 1, 1.5, 2];
// A well-populated closet across all 8 sections can easily be 50-100+
// photos — loading and decoding all of them at once (then AGAIN duplicated
// for the seamless loop) is enough to exhaust a phone browser's memory and
// crash the tab (confirmed: reproduced only on phone, never on a laptop,
// with Chrome's own out-of-memory/crash-recovery message appearing).
// Capping the pool keeps memory bounded regardless of closet size.
const MAX_IMAGES = 24;
// How long each on-screen set stays up before the next batch rotates in.
// Short on purpose — a long-running display (e.g. cast to a TV) should
// keep feeling fresh rather than looping the same 24 photos indefinitely.
const ROTATION_MS = 25000;

function toThumb(url) {
  // w_500 (fine for one section-detail thumbnail elsewhere in the app) is
  // too large multiplied across dozens of simultaneous decodes here —
  // w_300 is still sharp at the marquee's on-screen card size.
  return url?.replace("/upload/", "/upload/f_auto,q_auto,e_improve,w_300,c_limit/") || url;
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
  // The FULL shuffled closet (not capped) plus a cursor into it — every
  // rotation advances the cursor by MAX_IMAGES and wraps around, so every
  // photo gets a turn before anything repeats, instead of a small pool
  // looping the same set the whole time.
  const poolRef = useRef([]);
  const cursorRef = useRef(0);
  const rotationRef = useRef(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(0.6);
  const [speed, setSpeed] = useState(1);
  const [showVolume, setShowVolume] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  // Local-only for now — an object URL, not uploaded anywhere, so it lasts
  // for this viewing session on this device only (picking a new file, or
  // reloading the page, clears it back to the default track).
  const [customTrackUrl, setCustomTrackUrl] = useState(null);
  const [customTrackName, setCustomTrackName] = useState("");

  const idleRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioRef = useRef(null);

  // Pulls the next MAX_IMAGES starting at cursorRef, wrapping around the
  // pool. Re-shuffles once a full pass completes, so the next lap isn't in
  // the exact same order as the last.
  const rotateIn = useCallback(() => {
    const pool = poolRef.current;
    if (!pool.length) return;
    const start = cursorRef.current;
    const next = [];
    for (let i = 0; i < Math.min(MAX_IMAGES, pool.length); i++) {
      next.push(pool[(start + i) % pool.length]);
    }
    cursorRef.current = (start + MAX_IMAGES) % pool.length;
    if (cursorRef.current < MAX_IMAGES && pool.length > MAX_IMAGES) {
      // Completed a full pass — reshuffle for next time around.
      poolRef.current = shuffle(pool);
    }
    setImages(next);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    Promise.all(SECTIONS.map((s) => fetchImagesForSection(s).catch(() => [])))
      .then((lists) => {
        if (cancelled) return;
        poolRef.current = shuffle(lists.flat().filter(Boolean));
        cursorRef.current = 0;
        rotateIn();
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, rotateIn]);

  // Rotate in a fresh batch on a timer while open. Paused along with
  // everything else when the user hits Pause, so a paused screen doesn't
  // suddenly swap photos out from under them.
  useEffect(() => {
    if (!isOpen || !playing) return;
    rotationRef.current = setInterval(rotateIn, ROTATION_MS);
    return () => clearInterval(rotationRef.current);
  }, [isOpen, playing, rotateIn]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (isOpen && playing && !muted) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isOpen, playing, muted]);

  // Keep the <audio> element's actual volume in sync with the slider.
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Revoke the previous object URL whenever it's replaced or the component
  // unmounts, so picking several tracks in a row doesn't leak memory.
  useEffect(() => {
    return () => { if (customTrackUrl) URL.revokeObjectURL(customTrackUrl); };
  }, [customTrackUrl]);

  // Swapping <audio>'s src via React re-render doesn't reliably reload the
  // element in every browser on its own — force it, then resume playback
  // under the same play/volume rules as everywhere else.
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.load();
    audioRef.current.volume = volume;
    if (isOpen && playing && !muted) audioRef.current.play().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customTrackUrl]);

  const handleCustomTrackFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (customTrackUrl) URL.revokeObjectURL(customTrackUrl);
    setCustomTrackUrl(URL.createObjectURL(file));
    setCustomTrackName(file.name);
    setMuted(false);
  };

  const clearCustomTrack = () => {
    if (customTrackUrl) URL.revokeObjectURL(customTrackUrl);
    setCustomTrackUrl(null);
    setCustomTrackName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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
          <div
            className={`cc-marquee__track${playing ? "" : " cc-marquee__track--paused"}`}
            style={{ animationDuration: `${BASE_SCROLL_SECONDS / speed}s` }}
          >
            {loop.map((url, i) => (
              <div className="cc-marquee__item" key={i}>
                <img
                  src={toThumb(url)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  onLoad={(e) => e.currentTarget.classList.add("is-loaded")}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PUBLIC_URL, not a bare "/" path — the app is hosted under a
          subpath (…/project-wimc-frontend/), so an absolute "/carousel-…"
          URL resolved to the wrong origin and the file 404'd silently
          (audioRef.current.play() swallows the rejection). Same fix the
          tour narration audio already uses. */}
      <audio
        ref={audioRef}
        src={customTrackUrl || `${process.env.PUBLIC_URL}/carousel-audio/ambient-loop.mp3`}
        loop
      />

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

              <div className="cc-speed">
                {SPEED_OPTIONS.map((s) => (
                  <button
                    key={s}
                    className={`cc-speed__btn${speed === s ? " is-active" : ""}`}
                    onClick={() => setSpeed(s)}
                    aria-label={`${s}x speed`}
                  >
                    {s}×
                  </button>
                ))}
              </div>

              <div className="cc-volume-wrap">
                {showVolume && (
                  <input
                    className="cc-volume-slider"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={muted ? 0 : volume}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setVolume(v);
                      setMuted(v === 0);
                    }}
                    aria-label="Music volume"
                  />
                )}
                <button
                  className="cc-btn"
                  onClick={() => setShowVolume((v) => !v)}
                  aria-label={muted ? "Unmute music" : "Mute music"}
                >
                  {muted || volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                style={{ display: "none" }}
                onChange={handleCustomTrackFile}
              />
              <button
                className="cc-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Use your own music"
                aria-label="Use your own music"
              >
                🎵
              </button>
              {customTrackUrl && (
                <button className="cc-btn" onClick={clearCustomTrack} title="Remove your music, use default" aria-label="Remove your music">
                  ↩
                </button>
              )}
            </div>
            {!muted && (
              <span className="cc-credit">
                {customTrackUrl
                  ? `🎵 Playing: ${customTrackName}`
                  : '🎵 "Ambient" by raspberrymusic — CC BY 3.0, via Wikimedia Commons'}
              </span>
            )}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
