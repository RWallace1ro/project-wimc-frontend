import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  fetchImagesByTag,
  fetchVideosByTag,
  videoPoster,
  deleteImage,
  deleteVideo,
  transferItem,
} from "../../utils/CloudinaryAPI";
import { useBackground } from "../../context/BackgroundContext";
import { syncSetItem } from "../../utils/syncStore";
import { getSubSections, donatePrefixForTag } from "../../utils/closetSubsections";
import "./ClosetSectionModal.css";

// Moving an item re-uploads it under a new Cloudinary public_id (new URL) and
// deletes the old asset — Cloudinary can't rename in place. Anything that
// captured the old URL (e.g. a pending/donated Donate Bin entry) would then
// silently point at a dead asset. Patch those references so a later "Confirm
// removed from closet" in Donate Bin still targets the item's real, current copy.
function patchDonateBinUrl(sourceTag, oldUrl, newUrl) {
  const prefix = donatePrefixForTag(sourceTag);
  for (const base of ["donateItems", "donatedItems"]) {
    const key = prefix ? `wimc_${base}_${prefix}` : base;
    try {
      const list = JSON.parse(localStorage.getItem(key) || "[]");
      if (!Array.isArray(list) || list.length === 0) continue;
      let changed = false;
      const updated = list.map((it) => {
        if (it?.imageUrl === oldUrl || it?.url === oldUrl) {
          changed = true;
          return { ...it, ...(it.imageUrl !== undefined ? { imageUrl: newUrl } : {}), ...(it.url !== undefined ? { url: newUrl } : {}) };
        }
        return it;
      });
      if (changed) syncSetItem(key, JSON.stringify(updated));
    } catch {}
  }
}

function getPinnedKey(tag)  { return `wimc_card_image_${tag}`; }
function getOrderKey(tag)   { return `wimc_image_order_${tag}`; }

function applyStoredOrder(fetchedUrls, tag) {
  try {
    const stored = JSON.parse(localStorage.getItem(getOrderKey(tag)) || "null");
    if (!Array.isArray(stored) || stored.length === 0) return fetchedUrls;
    const set = new Set(fetchedUrls);
    const ordered = stored.filter((u) => set.has(u));
    const rest = fetchedUrls.filter((u) => !ordered.includes(u));
    return [...ordered, ...rest];
  } catch { return fetchedUrls; }
}

function saveOrder(tag, urls) {
  try { syncSetItem(getOrderKey(tag), JSON.stringify(urls)); } catch {}
}

const LABEL_TO_TAG = {
  "Dresses/Skirts":          "dresses-skirts",
  "Dress Shirts/Suits":      "dress-shirts-suits",
  "Button-Ups/Dress Clothes":"dress-shirts-suits",
  "Shoes/Sneakers":          "shoes-sneakers",
  "Pants/Jeans":             "pants-jeans",
  Tops:                      "tops",
  "Bags/Accessories":        "bags-accessories",
  "Jackets/Coats":           "jackets-coats",
};

function ClosetSectionModal({
  isOpen,
  sectionName,
  tag: tagProp,
  onClose,
  onAddItem,
  /** Array of { label, tag } for all sections in this closet (used for the Move feature) */
  allSections = [],
  /** Called with a section tag when the user picks a different section from within the modal */
  onSwitchSection,
  /** {tag, url, mediaType, ts} — most recent upload; injected into the cache so
   *  new items show immediately (Cloudinary's tag-list CDN cache lags ~1 min). */
  recentUpload = null,
  /** "male" | "female" — picks the correct sub-section set (esp. for kids,
   *  whose tags don't encode gender). */
  gender = "female",
}) {
  // ── Per-tag item cache ────────────────────────────────────────────────────
  // Keyed by section tag so switching sections never wipes fetched data and
  // so transfers can update both source and destination immediately without
  // waiting for Cloudinary's (stale) CDN tag-list cache to refresh.
  const [itemsByTag,   setItemsByTag]   = useState({}); // { [tag]: [url, ...] }
  const [videosByTag,  setVideosByTag]  = useState({}); // { [tag]: [url, ...] }
  const [loadingTags,  setLoadingTags]  = useState(new Set());
  const [error,        setError]        = useState(null);
  const [tab,          setTab]          = useState("images");
  const [deleting,     setDeleting]     = useState(null);
  const [moving,       setMoving]       = useState(null);
  const [moveMenuFor,  setMoveMenuFor]  = useState(null);
  const [lightboxIdx,  setLightboxIdx]  = useState(null); // null = closed
  const [pinnedUrl,    setPinnedUrl]    = useState(null); // pinned card image
  const [pinFlash,     setPinFlash]     = useState(null); // url that just got pinned

  const { getBackground } = useBackground();

  const sectionBg = sectionName
    ? getBackground(LABEL_TO_TAG[sectionName] || null)
    : null;

  const sectionTag = useMemo(() => {
    if (tagProp) return tagProp;
    if (!sectionName) return "";
    const s = String(sectionName);
    return s.includes(" ")
      ? s.replace(/\s+/g, "-").toLowerCase()
      : s.toLowerCase();
  }, [sectionName, tagProp]);

  // ── Sub-sections ──────────────────────────────────────────────────────────
  // Every card is split into fixed full-view sub-collections (e.g. Dresses /
  // Skirts). The FIRST sub-section keeps the card's original tag so existing
  // items appear there; the rest get their own tags. Per-closet scoping
  // (male-/kid-/pet- prefixes) is handled inside getSubSections.
  const subSections = useMemo(() => getSubSections(sectionTag, gender), [sectionTag, gender]);
  const [subTag, setSubTag] = useState(null);
  useEffect(() => { setSubTag(null); }, [sectionTag, isOpen]);

  // Keep latest recentUpload available to the fetch effect without re-running it
  const recentUploadRef = useRef(recentUpload);
  useEffect(() => { recentUploadRef.current = recentUpload; }, [recentUpload]);

  // Inject freshly uploaded items into the per-tag cache so they appear
  // without waiting for Cloudinary's stale CDN tag list (or a page refresh).
  useEffect(() => {
    if (!recentUpload?.url || !recentUpload?.tag) return;
    const { tag: upTag, url, mediaType } = recentUpload;
    if (mediaType === "video") {
      setVideosByTag((prev) => {
        const cur = prev[upTag];
        if (cur === undefined || cur.includes(url)) return prev; // not cached yet / dup
        return { ...prev, [upTag]: [...cur, url] };
      });
    } else {
      setItemsByTag((prev) => {
        const cur = prev[upTag];
        if (cur === undefined || cur.includes(url)) return prev; // not cached yet / dup
        return { ...prev, [upTag]: [url, ...cur] };
      });
    }
  }, [recentUpload]);

  // Effective tag all data operations key off (fetch, add, delete, move, pin)
  const tag = subTag || sectionTag;

  // Move targets: sibling sub-sections first (when in Bags/Accessories),
  // then the other closet sections.
  const moveTargets = useMemo(() => {
    const subs = (subSections || [])
      .filter((s) => s.tag !== tag)
      .map((s) => ({ label: s.plain, tag: s.tag }));
    const sections = allSections.filter(
      (s) => s.tag !== tag && s.tag !== sectionTag
    );
    return [...subs, ...sections];
  }, [subSections, allSections, tag, sectionTag]);

  // Derived views for the current section
  const items  = itemsByTag[tag]  || [];
  const videos = videosByTag[tag] || [];

  // ── Fetch current section (only if not yet cached) ─────────────────────
  useEffect(() => {
    if (!isOpen || !sectionName || !tag) return;
    // Skip if we already have data for this tag (prevents stale-CDN re-fetches
    // after transfers and avoids the duplicate-item bug on section switch).
    if (itemsByTag[tag] !== undefined) return;

    let cancelled = false;
    const load = async () => {
      setLoadingTags((prev) => new Set(prev).add(tag));
      setError(null);
      try {
        const [fetchedImages, fetchedVideos] = await Promise.all([
          fetchImagesByTag(tag),
          fetchVideosByTag(tag),
        ]);
        if (!cancelled) {
          let ordered = applyStoredOrder(fetchedImages || [], tag);
          let vids = fetchedVideos || [];
          // Merge a just-uploaded item the stale CDN list may not include yet
          const ru = recentUploadRef.current;
          if (ru?.tag === tag && ru?.url) {
            if (ru.mediaType === "video" && !vids.includes(ru.url)) {
              vids = [...vids, ru.url];
            } else if (ru.mediaType !== "video" && !ordered.includes(ru.url)) {
              ordered = [ru.url, ...ordered];
            }
          }
          setItemsByTag((prev) => ({ ...prev, [tag]: ordered }));
          setVideosByTag((prev) => ({ ...prev, [tag]: vids }));
          // The pinned card-cover image is always keyed by the CARD's own base
          // tag (sectionTag), never a sub-section tag — so pinning an item
          // while viewing any sub-section still updates the one card cover.
          const pinned = localStorage.getItem(getPinnedKey(sectionTag));
          setPinnedUrl(pinned || null);
        }
      } catch {
        if (!cancelled) setError("Failed to load items. Please try again.");
      } finally {
        if (!cancelled) {
          setLoadingTags((prev) => {
            const next = new Set(prev);
            next.delete(tag);
            return next;
          });
        }
      }
    };
    load();
    return () => { cancelled = true; };
  // itemsByTag intentionally excluded — we only want to trigger on tag/isOpen
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tag]);

  // ── Delete helpers ───────────────────────────────────────────────────────
  const handleDeleteImage = async (url) => {
    if (!window.confirm("Delete this image? This cannot be undone.")) return;
    setDeleting(url);
    try {
      await deleteImage(url);
      setItemsByTag((prev) => ({
        ...prev,
        [tag]: (prev[tag] || []).filter((u) => u !== url),
      }));
    } catch (err) {
      console.error("Image delete failed:", err);
      alert(`Failed to delete image: ${err.message}`);
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteVideo = async (url) => {
    if (!window.confirm("Delete this video? This cannot be undone.")) return;
    setDeleting(url);
    try {
      await deleteVideo(url);
      setVideosByTag((prev) => ({
        ...prev,
        [tag]: (prev[tag] || []).filter((u) => u !== url),
      }));
    } catch (err) {
      console.error("Video delete failed:", err);
      alert(`Failed to delete video: ${err.message}`);
    } finally {
      setDeleting(null);
    }
  };

  // ── Pin image as card cover ──────────────────────────────────────────────
  // Always writes under the card's base tag (sectionTag), not the currently
  // viewed sub-section — otherwise a pin made from e.g. "Skirts" would be
  // invisible to the card, which only ever reads the base-tag key.
  const handlePinImage = (url) => {
    syncSetItem(getPinnedKey(sectionTag), url);
    setPinnedUrl(url);
    setPinFlash(url);
    setTimeout(() => setPinFlash(null), 2000);
  };

  // ── Move image to top of order ───────────────────────────────────────────
  const handleMoveToTop = (url) => {
    setItemsByTag((prev) => {
      const current = prev[tag] || [];
      const next = [url, ...current.filter((u) => u !== url)];
      saveOrder(tag, next);
      return { ...prev, [tag]: next };
    });
  };

  // ── Move / transfer ──────────────────────────────────────────────────────
  const handleMoveItem = async (url, destTag, resourceType = "image") => {
    const destLabel =
      moveTargets.find((s) => s.tag === destTag)?.label ||
      allSections.find((s) => s.tag === destTag)?.label ||
      destTag;
    if (
      !window.confirm(
        `Move this item to "${destLabel}"? It will be removed from the current section.`
      )
    )
      return;

    setMoveMenuFor(null);
    setMoving(url);
    try {
      // transferItem returns the new delivery URL of the copy in the destination.
      const newUrl = await transferItem(url, destTag, resourceType);

      // Keep any pending/donated Donate Bin record for this item pointed at
      // its new (real) asset instead of the now-deleted original.
      if (resourceType === "image") patchDonateBinUrl(tag, url, newUrl);

      // ── Immediate optimistic updates (no Cloudinary CDN re-fetch needed) ──

      if (resourceType === "video") {
        // Remove from source
        setVideosByTag((prev) => ({
          ...prev,
          [tag]: (prev[tag] || []).filter((u) => u !== url),
        }));
        // Add to destination cache (create empty array if not yet loaded)
        setVideosByTag((prev) => ({
          ...prev,
          [destTag]: [...(prev[destTag] || []), newUrl],
        }));
      } else {
        // Remove from source
        setItemsByTag((prev) => ({
          ...prev,
          [tag]: (prev[tag] || []).filter((u) => u !== url),
        }));
        // Add to destination cache (create empty array if not yet loaded)
        setItemsByTag((prev) => ({
          ...prev,
          [destTag]: [...(prev[destTag] || []), newUrl],
        }));
      }
    } catch (err) {
      console.error("Move failed:", err);
      alert(`Failed to move item: ${err.message}`);
    } finally {
      setMoving(null);
    }
  };

  // ── Lightbox keyboard navigation ─────────────────────────────────────────
  const lightboxClose = useCallback(() => setLightboxIdx(null), []);
  const lightboxPrev  = useCallback(() =>
    setLightboxIdx((i) => (i > 0 ? i - 1 : items.length - 1)), [items.length]);
  const lightboxNext  = useCallback(() =>
    setLightboxIdx((i) => (i < items.length - 1 ? i + 1 : 0)), [items.length]);

  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKey = (e) => {
      if (e.key === "Escape")     lightboxClose();
      if (e.key === "ArrowLeft")  lightboxPrev();
      if (e.key === "ArrowRight") lightboxNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIdx, lightboxClose, lightboxPrev, lightboxNext]);

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains("closet-section-modal__overlay")) onClose();
  };

  const loading = loadingTags.has(tag);

  if (!isOpen) return null;

  return (
    <section
      className="closet-section-modal__overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-labelledby="closet-section-modal-title"
      aria-hidden={!isOpen}
    >
      <div
        className="closet-section-modal"
        onClick={(e) => { e.stopPropagation(); setMoveMenuFor(null); }}
        style={
          sectionBg
            ? {
                backgroundImage: `url(${sectionBg})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {}
        }
      >
        <header className="closet-section-modal__header">
          <button
            className="closet-section-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            &#10006;
          </button>
          <h2
            id="closet-section-modal-title"
            className="closet-section-modal__title"
          >
            {sectionName}
          </h2>
          {onAddItem && (
            <button
              type="button"
              className="closet-section-modal__add"
              onClick={() => onAddItem(tag)}
              title={`Add item to ${sectionName}`}
              aria-label={`Add item to ${sectionName}`}
            >
              + Add
            </button>
          )}
        </header>

        {/* Section switcher — lets users navigate between sections without closing */}
        {allSections.length > 1 && onSwitchSection && (
          <nav className="closet-section-modal__section-nav" aria-label="Switch section">
            {allSections.map((s) => (
              <button
                key={s.tag}
                className={`closet-section-modal__section-pill${s.tag === tag ? " is-active" : ""}`}
                onClick={() => s.tag !== tag && onSwitchSection(s.tag)}
                aria-current={s.tag === tag ? "true" : undefined}
              >
                {s.label}
              </button>
            ))}
          </nav>
        )}

        {/* Sub-sections — each occupies the full card view */}
        {subSections && (
          <nav className="csm-subnav" aria-label="Sub-section">
            {subSections.map((s) => (
              <button
                key={s.tag}
                className={`csm-subnav__pill${s.tag === tag ? " is-active" : ""}`}
                onClick={() => setSubTag(s.tag === sectionTag ? null : s.tag)}
                aria-current={s.tag === tag ? "true" : undefined}
              >
                {s.label}
              </button>
            ))}
          </nav>
        )}

        {/* Tabs */}
        <nav
          className="closet-section-modal__tabs"
          role="tablist"
          aria-label="Media"
        >
          <button
            role="tab"
            aria-selected={tab === "images"}
            className={`tab ${tab === "images" ? "is-active" : ""}`}
            onClick={() => setTab("images")}
          >
            Images
          </button>
          <button
            role="tab"
            aria-selected={tab === "videos"}
            className={`tab ${tab === "videos" ? "is-active" : ""}`}
            onClick={() => setTab("videos")}
          >
            Videos
          </button>
        </nav>

        {loading && <div className="preloader">Loading items...</div>}
        {!loading && error && (
          <p className="closet-section-modal__error">{error}</p>
        )}
        {!loading && !error && items.length === 0 && tab === "images" && (
          <p className="closet-section-modal__no-items">
            No images in this section yet.
          </p>
        )}
        {!loading && !error && videos.length === 0 && tab === "videos" && (
          <p className="closet-section-modal__no-items">
            No videos in this section yet.
          </p>
        )}

        {!loading && !error && tab === "images" && items.length > 0 && (
          <main className="closet-section-modal__levels">
            <section className="closet-section-modal__level closet-section-modal__level--dark">
              <div className="closet-section-modal__grid">
                {items.map((url, i) => {
                  const destOptions = moveTargets;
                  const isBusy = deleting === url || moving === url;
                  return (
                    <figure
                      key={`img-${i}`}
                      className="closet-section-modal__item"
                    >
                      <img
                        src={url}
                        alt={`image-${i}`}
                        className="closet-section-modal__item-image csm-zoomable"
                        loading="lazy"
                        onClick={(e) => { e.stopPropagation(); setLightboxIdx(i); }}
                        title="Click to enlarge"
                      />
                      {/* Pin as card image — bottom-left */}
                      <button
                        className={`csm-pin-btn${pinnedUrl === url ? " is-pinned" : ""}`}
                        onClick={(e) => { e.stopPropagation(); handlePinImage(url); }}
                        title={pinnedUrl === url ? "Card image (pinned)" : "Set as card image"}
                        aria-label="Set as card image"
                      >
                        {pinFlash === url ? "✅" : pinnedUrl === url ? "📌" : "📌"}
                      </button>

                      {/* Move to top — bottom-right */}
                      <button
                        className="csm-top-btn"
                        onClick={(e) => { e.stopPropagation(); handleMoveToTop(url); }}
                        title="Move to top"
                        aria-label="Move to top"
                      >
                        ⬆
                      </button>

                      {/* Delete button — top-right */}
                      <button
                        className="csm-delete-btn"
                        onClick={(e) => { e.stopPropagation(); handleDeleteImage(url); }}
                        disabled={isBusy}
                        title="Delete image"
                        aria-label="Delete image"
                      >
                        {deleting === url ? "…" : "🗑️"}
                      </button>
                      {/* Move button — top-left (only shown when other sections exist) */}
                      {destOptions.length > 0 && (
                        <>
                          <button
                            className="csm-move-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMoveMenuFor(moveMenuFor === url ? null : url);
                            }}
                            disabled={isBusy}
                            title="Move to another section"
                            aria-label="Move to another section"
                          >
                            {moving === url ? "…" : "↗"}
                          </button>
                          {moveMenuFor === url && (
                            <div
                              className="csm-move-menu"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <p className="csm-move-menu__title">Move to…</p>
                              {destOptions.map((s) => (
                                <button
                                  key={s.tag}
                                  className="csm-move-option"
                                  onClick={() => handleMoveItem(url, s.tag, "image")}
                                >
                                  {s.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </figure>
                  );
                })}
              </div>
            </section>
          </main>
        )}

        {!loading && !error && tab === "videos" && videos.length > 0 && (
          <main className="closet-section-modal__levels">
            <section className="closet-section-modal__level closet-section-modal__level--dark">
              <div className="closet-section-modal__grid">
                {videos.map((vurl, i) => {
                  const destOptions = moveTargets;
                  const isBusy = deleting === vurl || moving === vurl;
                  return (
                    <figure
                      key={`vid-${i}`}
                      className="closet-section-modal__item"
                    >
                      <video
                        className="closet-section-modal__item-video"
                        controls
                        preload="metadata"
                        poster={videoPoster(vurl)}
                      >
                        <source src={vurl} />
                      </video>
                      {/* Delete button — top-right */}
                      <button
                        className="csm-delete-btn"
                        onClick={(e) => { e.stopPropagation(); handleDeleteVideo(vurl); }}
                        disabled={isBusy}
                        title="Delete video"
                        aria-label="Delete video"
                      >
                        {deleting === vurl ? "…" : "🗑️"}
                      </button>
                      {/* Move button — top-left */}
                      {destOptions.length > 0 && (
                        <>
                          <button
                            className="csm-move-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMoveMenuFor(moveMenuFor === vurl ? null : vurl);
                            }}
                            disabled={isBusy}
                            title="Move to another section"
                            aria-label="Move to another section"
                          >
                            {moving === vurl ? "…" : "↗"}
                          </button>
                          {moveMenuFor === vurl && (
                            <div
                              className="csm-move-menu"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <p className="csm-move-menu__title">Move to…</p>
                              {destOptions.map((s) => (
                                <button
                                  key={s.tag}
                                  className="csm-move-option"
                                  onClick={() => handleMoveItem(vurl, s.tag, "video")}
                                >
                                  {s.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </figure>
                  );
                })}
              </div>
            </section>
          </main>
        )}
      </div>

      {/* ── Fullscreen Lightbox ── */}
      {lightboxIdx !== null && items[lightboxIdx] && (
        <div
          className="csm-lightbox"
          onClick={lightboxClose}
          role="dialog"
          aria-label="Fullscreen image viewer"
        >
          {/* Close */}
          <button
            className="csm-lightbox__close"
            onClick={lightboxClose}
            aria-label="Close fullscreen view"
          >
            ✕
          </button>

          {/* Counter */}
          <span className="csm-lightbox__counter">
            {lightboxIdx + 1} / {items.length}
          </span>

          {/* Prev */}
          {items.length > 1 && (
            <button
              className="csm-lightbox__nav csm-lightbox__nav--prev"
              onClick={(e) => { e.stopPropagation(); lightboxPrev(); }}
              aria-label="Previous image"
            >
              ‹
            </button>
          )}

          {/* Image */}
          <img
            src={items[lightboxIdx]}
            alt={`fullscreen-${lightboxIdx}`}
            className="csm-lightbox__img"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next */}
          {items.length > 1 && (
            <button
              className="csm-lightbox__nav csm-lightbox__nav--next"
              onClick={(e) => { e.stopPropagation(); lightboxNext(); }}
              aria-label="Next image"
            >
              ›
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export default ClosetSectionModal;
