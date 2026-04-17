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

      const url =
        it.mediaUrl ||
        it.imageUrl || // legacy fallback
        "";

      const thumb = it.mediaThumb || (!isVideoUrl(url) ? toThumb(url) : "");
      const poster = it.mediaPoster || (isVideoUrl(url) ? toPoster(url) : "");

      return { type, url, thumb, poster };
    }

    if (typeof propImageUrl === "string") {
      const type = isVideoUrl(propImageUrl) ? "video" : "image";
      const url = propImageUrl;
      const thumb = !isVideoUrl(url) ? toThumb(url) : "";
      const poster = isVideoUrl(url) ? toPoster(url) : "";
      return { type, url, thumb, poster };
    }

    return null;
  }, [propImageUrl]);

  useEffect(() => {
    let ignore = false;
    async function fetchImageForSection() {
      if (propImageUrl || !tag) return;

      try {
        const images = await fetchImagesByTag(tag);
        const first = images && images.length > 0 ? images[0] : null;
        if (ignore) return;

        if (first) {
          const type = isVideoUrl(first) ? "video" : "image";
          setMedia({
            type,
            url: first,
            thumb: !isVideoUrl(first) ? toThumb(first) : "",
            poster: isVideoUrl(first) ? toPoster(first) : "",
          });
        } else {
          setMedia(null);
        }
      } catch (err) {
        console.error(`Error fetching image for tag ${tag}:`, err);
        setMedia(null);
      }
    }
    fetchImageForSection();
    return () => {
      ignore = true;
    };
  }, [propImageUrl, tag]);

  const display = normalizedFromProp || media;

  const isCloudinary =
    display?.url && display.url.includes("res.cloudinary.com");

  const renderMedia = () => {
    if (!display?.url) {
      // nothing available -> placeholder
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

    // image
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
      } catch {
        // Fallback to <img> if constructor complains
        return (
          <img
            src={display.thumb || display.url}
            alt={sectionName}
            className="closet-section-card__image"
            loading="lazy"
          />
        );
      }
    }

    // Non-cloudinary image
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
    // <section className="closet-section-card" onClick={onClick}>
    <section className="closet-section-card" onClick={onClick}>
      <figure className="closet-section-card__image-container">
        {renderMedia()}
      </figure>
      <header>
        <h3 className="closet-section-card__title">{sectionName}</h3>
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
          ></button>
        )}
      </header>
    </section>
  );
}

export default ClosetSectionCard;
