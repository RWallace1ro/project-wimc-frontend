import React, { useEffect, useState, useMemo } from "react";
import { fetchImagesByTag } from "../../utils/CloudinaryAPI";
import { AdvancedImage } from "@cloudinary/react";
import { CloudinaryImage } from "@cloudinary/url-gen";
import "./ClosetSectionCard.css";

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
}) {
  const [media, setMedia] = useState(null);

  const isVideoUrl = (u) => !!u && /\.(mp4|mov|webm|mkv|m4v)(\?.*)?$/i.test(u);
  const toPoster = (u) =>
    u ? u.replace("/upload/", "/upload/so_3,du_0/") + ".jpg" : "";
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
        const images = await fetchImagesByTag(tag);
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

  const display = normalizedFromProp || media;
  const isCloudinary = display?.url?.includes("res.cloudinary.com");

  const renderMedia = () => {
    // ✅ If a custom background is set, don't render the clothing image on top
    if (sectionBackground) return null;

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
    if (isCloudinary) {
      try {
        return (
          <AdvancedImage
            cldImg={
              new CloudinaryImage(display.thumb || display.url, {
                cloudName: "djoh2vfhd",
              })
            }
            className="closet-section-card__image"
            alt={sectionName}
          />
        );
      } catch {}
    }
    return (
      <img
        src={display.thumb || display.url}
        alt={sectionName}
        className="closet-section-card__image"
        loading="lazy"
      />
    );
  };

  return (
    <section
      className="closet-section-card"
      onClick={onClick}
      style={
        sectionBackground
          ? {
              backgroundImage: `url(${sectionBackground})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : {}
      }
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
        </div>
      </header>
    </section>
  );
}

export default ClosetSectionCard;
