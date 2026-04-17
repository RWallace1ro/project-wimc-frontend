import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { videoPoster } from "../../utils/CloudinaryAPI";
import "./VideoBin.css";

function normalize(v) {
  if (!v) return null;
  if (typeof v === "string") return { url: v, poster: videoPoster(v) };
  if (typeof v === "object") {
    return {
      url: v.mediaUrl || v.url || "",
      poster:
        v.mediaPoster || v.poster || videoPoster(v.mediaUrl || v.url || ""),
    };
  }
  return null;
}

function VideoGrid({ list, onPlay, onEnded }) {
  // Keep refs to pause other videos when one starts
  const refs = useRef([]);

  useEffect(() => {
    refs.current = refs.current.slice(0, list.length);
  }, [list.length]);

  const handlePlay = (idx) => {
    // pause all others
    refs.current.forEach((el, i) => {
      if (i !== idx && el && !el.paused) el.pause();
    });
    onPlay?.(idx);
  };

  return (
    <div className="video-bin__grid">
      {list.map((v, i) => (
        <figure className="video-bin__card" key={`${v.url}-${i}`}>
          <video
            ref={(el) => (refs.current[i] = el)}
            className="video-bin__video"
            preload="metadata"
            controls
            poster={v.poster || ""}
            onPlay={() => handlePlay(i)}
            onEnded={() => onEnded?.(i)}
          >
            <source src={v.url} />
          </video>
        </figure>
      ))}
    </div>
  );
}

export default function VideoBin({ videos = [] }) {
  const list = useMemo(() => videos.map(normalize).filter(Boolean), [videos]);

  // Layout state
  const [isFloating, setIsFloating] = useState(false); // overlay via portal
  const [isMinimized, setIsMinimized] = useState(false); // compact bar while floating
  const [activeIndex, setActiveIndex] = useState(null); // which video triggered floating

  // When a video starts, float & expand
  const handlePlay = (idx) => {
    setActiveIndex(idx);
    setIsFloating(true);
    setIsMinimized(false);
  };

  // When the active video ends, undock & reset
  const handleEnded = (idx) => {
    if (idx === activeIndex) {
      setIsFloating(false);
      setIsMinimized(false);
      setActiveIndex(null);
    }
  };

  // Keyboard: Escape undocks when floating
  useEffect(() => {
    if (!isFloating) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setIsFloating(false);
        setIsMinimized(false);
        setActiveIndex(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFloating]);

  // Docked (in the page flow). When floating, render a tiny placeholder so height stays tidy.
  const dockedClass =
    "video-bin" + (isFloating ? " video-bin--placeholder" : "");

  const docked = (
    <section className={dockedClass} aria-label="Videos">
      <header className="video-bin__header">
        <h3 className="video-bin__title">Videos</h3>
        {!isFloating && (
          <button
            className="video-bin__btn"
            onClick={() => setIsFloating(true)}
          >
            Float
          </button>
        )}
      </header>

      {list.length === 0 ? (
        <p className="video-bin__empty">No videos in this section yet.</p>
      ) : (
        // In docked mode, normal grid; playing will promote to floating overlay
        <VideoGrid list={list} onPlay={handlePlay} onEnded={handleEnded} />
      )}
    </section>
  );

  // Backdrop (only when floating & expanded)
  const backdrop =
    isFloating && !isMinimized
      ? createPortal(
          <div
            className="video-backdrop"
            aria-hidden="true"
            onClick={() => {
              setIsFloating(false);
              setIsMinimized(false);
              setActiveIndex(null);
            }}
          />,
          document.body,
        )
      : null;

  // Floating overlay rendered via portal — won’t push Donate/Wishlist or cards
  const floating = isFloating
    ? createPortal(
        <section
          className={
            "video-float" + (isMinimized ? " video-float--minimized" : "")
          }
          role="dialog"
          aria-label="Video player"
        >
          <header className="video-float__header">
            <h3 className="video-float__title">Videos</h3>
            <div className="video-float__controls">
              <button
                className="video-bin__btn"
                onClick={() => setIsMinimized((v) => !v)}
              >
                {isMinimized ? "Expand" : "Minimize"}
              </button>
              {!isMinimized && (
                <button
                  className="video-bin__btn"
                  onClick={() => {
                    setIsFloating(false);
                    setIsMinimized(false);
                    setActiveIndex(null);
                  }}
                >
                  Undock
                </button>
              )}
            </div>
          </header>

          {!isMinimized ? (
            <VideoGrid list={list} onPlay={handlePlay} onEnded={handleEnded} />
          ) : (
            <div className="video-float__minibar">
              <span>Floating…</span>
            </div>
          )}
        </section>,
        document.body,
      )
    : null;

  return (
    <>
      {docked}
      {backdrop}
      {floating}
    </>
  );
}
