import React, { useEffect, useState, useMemo, useCallback } from "react";
import { fetchImagesForSection } from "../../utils/CloudinaryAPI";
import { shareItemImage } from "../../utils/shareUtils";
import { onImgError } from "../../utils/imgFallback";
import "./ClosetSectionCard.css";

const COLOR_PREFIX = "color:";
function cardBgStyle(bg) {
  if (!bg) return {};
  if (bg.startsWith(COLOR_PREFIX)) {
    return { backgroundColor: bg.replace(COLOR_PREFIX, "") };
  }
  return { backgroundImage: `url(${bg})`, backgroundSize: "cover", backgroundPosition: "center" };
}

function ClosetSectionCard({
  imageUrl: propImageUrl,
  sectionName,
  tag,
  placeholderUrl,
  onClick,
  onAdd,
  onTryOn,
  onCustomizeBg,
  sectionBackground, // ✅ passed directly from parent — guarantees re-render
  latestUploadUrl, // most recent item uploaded into this card this session
}) {
  const [media, setMedia] = useState(null);
  const [sharing, setSharing] = useState(false);

  const isVideoUrl = (u) => !!u && /\.(mp4|mov|webm|mkv|m4v)(\?.*)?$/i.test(u);
  // so_0 (first frame), not so_3 — a fixed 3s offset 404s for shorter videos.
  const toPoster = (u) =>
    u ? u.replace("/upload/", "/upload/so_0,du_0/") + ".jpg" : "";
  const toThumb = (u) =>
    u ? u.replace("/upload/", "/upload/f_auto,q_auto,w_600,c_limit/") : "";

  const normalizedFromProp = useMemo(() => {
    if (!propImageUrl) return null;
    if (typeof propImageUrl === "object") {
      const it = propImageUrl;
      const type =
        it.mediaType || (isVideoUrl(it.mediaUrl) ? "video" : "image");
      const url = it.mediaUrl || it.imageUrl || "";
      return {
        type,
        url,
        thumb: it.mediaThumb || (!isVideoUrl(url) ? toThumb(url) : ""),
        poster: it.mediaPoster || (isVideoUrl(url) ? toPoster(url) : ""),
      };
    }
    if (typeof propImageUrl === "string") {
      const type = isVideoUrl(propImageUrl) ? "video" : "image";
      return {
        type,
        url: propImageUrl,
        thumb: !isVideoUrl(propImageUrl) ? toThumb(propImageUrl) : "",
        poster: isVideoUrl(propImageUrl) ? toPoster(propImageUrl) : "",
      };
    }
    return null;
  }, [propImageUrl]);

  useEffect(() => {
    let ignore = false;
    async function fetchImageForSection() {
      if (propImageUrl || !tag) return;
      try {
        // Subsection-aware — so the default (unpinned) card cover can surface
        // an item that was sorted into a sub-section, not just the base tag.
        const images = await fetchImagesForSection(tag);
        const first = images?.[0] ?? null;
        if (ignore) return;
        if (first) {
          setMedia({
            type: isVideoUrl(first) ? "video" : "image",
            url: first,
            thumb: !isVideoUrl(first) ? toThumb(first) : "",
            poster: isVideoUrl(first) ? toPoster(first) : "",
          });
        } else {
          setMedia(null);
        }
      } catch {
        setMedia(null);
      }
    }
    fetchImageForSection();
    return () => {
      ignore = true;
    };
  }, [propImageUrl, tag]);

  // Derived directly from the latestUploadUrl prop on every render (not routed
  // through state via an effect) — the mount-time fetchImageForSection() call
  // below is async and can resolve well after a fresh upload (Cloudinary's
  // tag-list index lags), which would otherwise clobber a state-based update
  // with stale/empty results. Deriving it live means it can never be
  // overwritten by that race, no matter how many uploads land in a row.
  const latestMedia = useMemo(() => {
    if (!latestUploadUrl) return null;
    return {
      type: "image",
      url: latestUploadUrl,
      thumb: toThumb(latestUploadUrl),
      poster: "",
    };
  }, [latestUploadUrl]);

  const display = normalizedFromProp || latestMedia || media;

  const handleShareImage = async (e) => {
    e.stopPropagation();
    if (!display?.url || sharing) return;
    setSharing(true);
    await shareItemImage(display.url, {
      title: `${sectionName} — WIMC`,
      text: `Check out this item from my ${sectionName} closet! 👗`,
    });
    setSharing(false);
  };

  const renderMedia = () => {
    if (!display?.url) {
      return (
        <img
          src={placeholderUrl}
          alt={sectionName}
          className="closet-section-card__image"
        />
      );
    }
    if (display.type === "video") {
      return (
        <video
          className="closet-section-card__video"
          controls
          preload="metadata"
          poster={display.poster || ""}
          width="260"
        >
          <source src={display.url} />
        </video>
      );
    }
    // Always use a plain <img> with the full delivery URL — AdvancedImage
    // expects a public_id, not a full URL, and would produce a broken src.
    return (
      <img
        src={display.thumb || display.url}
        alt={sectionName}
        className="closet-section-card__image"
        loading="lazy"
        onError={onImgError}
      />
    );
  };

  return (
    <section
      className="closet-section-card"
      onClick={onClick}
      style={cardBgStyle(sectionBackground)}
    >
      <figure className="closet-section-card__image-container">
        {renderMedia()}
      </figure>
      <header className="closet-section-card__footer">
        <h3 className="closet-section-card__title">{sectionName}</h3>
        <div className="closet-section-card__actions">
          {onAdd && (
            <button
              type="button"
              className="closet-section-card__add-btn"
              onClick={(e) => {
                e.stopPropagation();
                onAdd();
              }}
              aria-label={`Add item to ${sectionName}`}
              title={`Add item to ${sectionName}`}
            >
              +
            </button>
          )}
          {onTryOn && (
            <button
              type="button"
              className="closet-section-card__tryon-btn"
              onClick={(e) => {
                e.stopPropagation();
                onTryOn();
              }}
              aria-label={`Try on ${sectionName}`}
              title={`Try on ${sectionName}`}
            >
              🎬
            </button>
          )}
          {onCustomizeBg && (
            <button
              type="button"
              className="closet-section-card__bg-btn"
              onClick={(e) => {
                e.stopPropagation();
                onCustomizeBg();
              }}
              aria-label={`Customize background for ${sectionName}`}
              title="Customize background"
            >
              🎨
            </button>
          )}
          {display?.url && display.type !== "video" && (
            <button
              type="button"
              className="closet-section-card__share-btn"
              onClick={handleShareImage}
              aria-label={`Share ${sectionName} image`}
              title="Share image"
              disabled={sharing}
            >
              {sharing ? "…" : "↗"}
            </button>
          )}
        </div>
      </header>
    </section>
  );
}

export default ClosetSectionCard;
