import React from "react";
import { uploadRawJSON } from "../utils/cloudinary";
import { baseUrl } from "./utils/constants";

export default function OutfitBuilder({ items = [], onShared }) {
  const [selected, setSelected] = React.useState([]);
  const [status, setStatus] = React.useState("idle");
  const [shareUrl, setShareUrl] = React.useState("");

  function toggle(item) {
    setSelected((cur) => {
      const exists = cur.find((x) => x.id === item.id);
      return exists ? cur.filter((x) => x.id !== item.id) : [...cur, item];
    });
  }

  async function handleShare() {
    if (!selected.length) return;
    setStatus("uploading");

    try {
      const outfit = {
        v: 1,
        createdAt: new Date().toISOString(),
        items: selected.map((it) => ({
          name: it.name,
          designer: it.designer,
          size: it.size,
          category: it.category,
          mediaType: it.mediaType,
          mediaUrl: it.mediaUrl,
          mediaThumb: it.mediaThumb || "",
          mediaPoster: it.mediaPoster || "",
        })),
      };

      const res = await uploadRawJSON(outfit); // -> { secure_url }
      const publicSrc = res.secure_url;
      // Public route: /outfit?src=<encoded-secure-url>
      const link = `${baseUrl}/outfit?src=${encodeURIComponent(publicSrc)}`;
      setShareUrl(link);
      onShared?.(link);
      setStatus("done");

      // Web Share API fallback
      if (navigator.share) {
        try {
          await navigator.share({
            title: "My WIMC Outfit",
            text: "Check out my outfit!",
            url: link,
          });
        } catch {
          /* user cancelled share - ignore */
        }
      } else {
        await navigator.clipboard.writeText(link);
        alert("Share link copied to clipboard!");
      }
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  }

  return (
    <section className="outfit-builder">
      <h2 className="outfit-builder__title">Build & Share Outfit</h2>

      <div className="outfit-builder__grid">
        {items.map((item) => {
          const isSelected = !!selected.find((x) => x.id === item.id);
          return (
            <button
              key={item.id}
              className={`outfit-builder__card ${
                isSelected ? "outfit-builder__card_selected" : ""
              }`}
              onClick={() => toggle(item)}
            >
              {item.mediaType === "video" ? (
                <video
                  className="outfit-builder__video"
                  poster={item.mediaPoster}
                  width="180"
                >
                  <source src={item.mediaUrl} />
                </video>
              ) : (
                <img
                  className="outfit-builder__image"
                  src={item.mediaThumb || item.mediaUrl}
                  alt={item.name}
                  width="180"
                />
              )}
              <div className="outfit-builder__label">{item.name}</div>
            </button>
          );
        })}
      </div>

      <div className="outfit-builder__actions">
        <button
          className="button button_primary"
          disabled={!selected.length || status === "uploading"}
          onClick={handleShare}
        >
          {status === "uploading" ? "Creating Link..." : "Share Outfit"}
        </button>
        {shareUrl && (
          <div className="outfit-builder__share">
            <input
              className="outfit-builder__share-input"
              readOnly
              value={shareUrl}
              onFocus={(e) => e.target.select()}
            />
            <a
              className="outfit-builder__share-btn"
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                shareUrl,
              )}`}
              target="_blank"
              rel="noreferrer"
            >
              Facebook
            </a>
            <a
              className="outfit-builder__share-btn"
              href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(
                shareUrl,
              )}&text=${encodeURIComponent("My WIMC outfit")}`}
              target="_blank"
              rel="noreferrer"
            >
              X
            </a>
            <a
              className="outfit-builder__share-btn"
              href={`mailto:?subject=${encodeURIComponent(
                "My WIMC outfit",
              )}&body=${encodeURIComponent(shareUrl)}`}
            >
              Email
            </a>
          </div>
        )}
        {status === "error" && (
          <p className="outfit-builder__error">
            Could not create share link. Try again.
          </p>
        )}
      </div>
    </section>
  );
}
