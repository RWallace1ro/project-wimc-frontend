import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { fetchVideosByTag, videoPoster, deleteVideo, uploadRawJSON } from "../../utils/CloudinaryAPI";
import { appShareUrl, shareAppLink } from "../../utils/shareUtils";
import {
  loadVideoMeta,
  saveVideoMeta,
  loadVideoTrash,
  saveVideoTrash,
  trashVideo,
  removeFromVideoTrash,
  daysUntilPurge,
  isPastPurgeWindow,
  VIDEO_TRASH_DAYS,
} from "../../utils/videoMeta";
import "./VideoBin.css";

const SECTIONS = [
  "dresses-skirts",
  "shoes-sneakers",
  "pants-jeans",
  "tops",
  "bags-accessories",
  "jackets-coats",
];

const SECTION_LABELS = {
  "dresses-skirts": "Dresses/Skirts",
  "shoes-sneakers": "Shoes/Sneakers",
  "pants-jeans": "Pants/Jeans",
  tops: "Tops",
  "bags-accessories": "Bags/Accessories",
  "jackets-coats": "Jackets/Coats",
};

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

export default function VideoBin({ videos: propVideos = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState("grid");
  const [allVideos, setAllVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [playingUrl, setPlayingUrl] = useState(null);
  const playerVideoRef = useRef(null);
  const [editingUrl, setEditingUrl] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [meta, setMeta] = useState(loadVideoMeta);
  const [shareStatus, setShareStatus] = useState({}); // { [url]: "copying"|"copied"|"error" }
  const [dlStatus, setDlStatus] = useState({}); // { [url]: "downloading"|"done"|"error" }
  const [deletingUrl, setDeletingUrl] = useState(null);
  // Video URLs whose poster-frame image failed to load — falls back to the
  // ▶ placeholder instead of the browser's broken-image icon. videoPoster()
  // always returns a non-empty string, so `v.poster` alone can't detect this.
  const [posterFailed, setPosterFailed] = useState(() => new Set());
  const markPosterFailed = (url) =>
    setPosterFailed((prev) => (prev.has(url) ? prev : new Set(prev).add(url)));

  // Deleted-videos trash (30-day grace period, undo, restore, purge-now)
  const [trash, setTrash] = useState(loadVideoTrash);
  const [trashOpen, setTrashOpen] = useState(false);
  const [undoVideo, setUndoVideo] = useState(null); // most-recently-trashed video
  const undoTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(undoTimerRef.current), []);

  // Videos currently in the 30-day trash — hidden from the main list. Derived
  // from `trash` (not tracked separately) so it's correct even for items
  // trashed in an earlier session, not just ones deleted just now.
  const trashedUrls = useMemo(() => new Set(trash.map((t) => t.url)), [trash]);

  const mergedVideos = useMemo(() => {
    const seen = new Set();
    const out = [];
    const add = (url, section) => {
      if (!url || seen.has(url) || trashedUrls.has(url)) return;
      seen.add(url);
      const m = meta[url] || {};
      out.push({
        url,
        // Prefer the closet item the user tried on (if this video was
        // recorded via Try-On Studio) over an auto-extracted video frame.
        poster: m.refImage || videoPoster(url),
        section: section || "uncategorized",
        title: m.title || "",
        addedAt: m.addedAt || new Date().toISOString(),
      });
    };
    propVideos.forEach((v) => {
      const url = typeof v === "string" ? v : v?.mediaUrl || v?.url || "";
      add(url, v?.section || "");
    });
    allVideos.forEach((v) => add(v.url, v.section));
    return out;
  }, [propVideos, allVideos, meta, trashedUrls]);

  useEffect(() => {
    if (!isOpen) return;
    // VideoBin stays mounted persistently in the sidebar, so `meta` (loaded
    // once at initial mount) goes stale the moment Try-On Studio — a totally
    // separate component — writes a refImage for a newly saved video. Refresh
    // it every time the modal opens so a fresh tried-on-item thumbnail shows.
    setMeta(loadVideoMeta());

    // Refresh trash + opportunistically purge anything past the 30-day grace
    // window. There's no server-side cron for this (per-user synced storage,
    // not a global collection like sharedContent) — checked client-side each
    // time the bin opens instead. Best-effort; never blocks the UI.
    const currentTrash = loadVideoTrash();
    setTrash(currentTrash);
    const expired = currentTrash.filter((t) => isPastPurgeWindow(t.deletedAt));
    if (expired.length) {
      Promise.allSettled(expired.map((t) => deleteVideo(t.url))).then(() => {
        const remaining = loadVideoTrash().filter(
          (t) => !expired.some((e) => e.url === t.url)
        );
        saveVideoTrash(remaining);
        setTrash(remaining);
      });
    }

    setLoading(true);
    Promise.all(
      SECTIONS.map((sec) =>
        fetchVideosByTag(sec)
          .then((urls) => (urls || []).map((url) => ({ url, section: sec })))
          .catch(() => []),
      ),
    )
      .then((results) => setAllVideos(results.flat()))
      .finally(() => setLoading(false));
  }, [isOpen]);

  useEffect(() => {
    saveVideoMeta(meta);
  }, [meta]);

  useEffect(() => {
    if (!mergedVideos.length) return;
    setMeta((prev) => {
      const next = { ...prev };
      let changed = false;
      mergedVideos.forEach(({ url }) => {
        if (!next[url]?.addedAt) {
          next[url] = {
            ...(next[url] || {}),
            addedAt: new Date().toISOString(),
          };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [mergedVideos]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (playingUrl) setPlayingUrl(null);
        else if (isOpen) setIsOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, playingUrl]);

  // Safari blocks autoPlay on unmuted video — call .play() programmatically
  // so the user gesture on the thumbnail button is honoured across all browsers.
  useEffect(() => {
    if (!playingUrl || !playerVideoRef.current) return;
    playerVideoRef.current.play().catch(() => {
      // Play blocked (e.g. Safari strict autoplay policy) — video shows with
      // controls so the user can tap the native play button.
    });
  }, [playingUrl]);

  // ── Title editing ─────────────────────────────────────────────────────────
  const startEdit = (url, currentTitle) => {
    setEditingUrl(url);
    setEditValue(currentTitle || "");
  };
  const commitEdit = useCallback(
    (url) => {
      setMeta((prev) => ({
        ...prev,
        [url]: { ...(prev[url] || {}), title: editValue.trim() },
      }));
      setEditingUrl(null);
      setEditValue("");
    },
    [editValue],
  );

  // ── Share a video ───────────────────────────────────────────────────────
  // Previously shared the raw Cloudinary .mp4 URL directly. Messaging apps
  // (iMessage, WhatsApp, SMS, etc.) generate their own link preview by
  // scraping the URL for Open Graph tags — a bare video file has none, so
  // they render a static thumbnail with no indication it's a playable video
  // (what looked like "just a still picture, no play button"). Sharing a
  // real WIMC page instead (same pattern as every other share feature) gives
  // recipients an actual <video> player with controls.
  const handleShare = async (v) => {
    setShareStatus((prev) => ({ ...prev, [v.url]: "copying" }));
    try {
      const payload = {
        kind: "wimc.video",
        version: 1,
        createdAt: new Date().toISOString(),
        url: v.url,
        poster: v.poster || "",
        title: v.title || "",
      };
      const res = await uploadRawJSON(payload, "wimc/video-shares");
      const cloudUrl = res?.secure_url || res?.url;
      if (!cloudUrl) throw new Error("Upload failed");
      const shareUrl = appShareUrl(cloudUrl, "video");

      const result = await shareAppLink({
        title: v.title || "My WIMC Video",
        text: "Check out this video from my closet!",
        url: shareUrl,
      });
      if (result === "shared" || result === "clipboard") {
        setShareStatus((prev) => ({ ...prev, [v.url]: "copied" }));
      } else if (result !== "aborted") {
        setShareStatus((prev) => ({ ...prev, [v.url]: "error" }));
      }
    } catch {
      setShareStatus((prev) => ({ ...prev, [v.url]: "error" }));
    }
    setTimeout(
      () => setShareStatus((prev) => ({ ...prev, [v.url]: null })),
      2000,
    );
  };

  // ── Download a video ──────────────────────────────────────────────────────
  const handleDownload = async (v) => {
    setDlStatus((prev) => ({ ...prev, [v.url]: "downloading" }));
    try {
      const res = await fetch(v.url, { mode: "cors" });
      if (!res.ok) throw new Error("Fetch failed");
      const blob = await res.blob();
      const burl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ext = v.url.split(".").pop().split("?")[0] || "mp4";
      a.href = burl;
      a.download = `${(v.title || "wimc-video").replace(/\s+/g, "-")}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(burl);
      setDlStatus((prev) => ({ ...prev, [v.url]: "done" }));
    } catch {
      // CORS fallback — open in new tab so user can save manually
      window.open(v.url, "_blank", "noopener");
      setDlStatus((prev) => ({ ...prev, [v.url]: "done" }));
    }
    setTimeout(() => setDlStatus((prev) => ({ ...prev, [v.url]: null })), 2500);
  };

  // ── Delete a video (soft-delete → 30-day trash, undoable) ──────────────────
  // No confirm dialog — the whole point of the trash + undo is that a single
  // delete click is no longer destructive; Cloudinary isn't touched until the
  // user permanently deletes it from the trash, or the 30-day window elapses.
  const handleDelete = (v) => {
    // Don't remove it from allVideos — mergedVideos already hides anything in
    // trashedUrls. Removing it here too meant Restore/Undo had nothing left
    // to show until the video list was refetched (i.e. closing and reopening
    // the bin), since allVideos only refreshes when the modal opens.
    const next = trashVideo({ url: v.url, poster: v.poster, section: v.section, title: v.title });
    setTrash(next);
    if (playingUrl === v.url) setPlayingUrl(null);

    clearTimeout(undoTimerRef.current);
    setUndoVideo(v);
    undoTimerRef.current = setTimeout(() => setUndoVideo(null), 6000);
  };

  const handleUndoDelete = () => {
    if (!undoVideo) return;
    clearTimeout(undoTimerRef.current);
    setTrash(removeFromVideoTrash(undoVideo.url));
    setUndoVideo(null);
  };

  // Restore a video from the trash drawer back to the main list.
  const handleRestore = (entry) => {
    setTrash(removeFromVideoTrash(entry.url));
    if (undoVideo?.url === entry.url) setUndoVideo(null);
  };

  // Permanently delete a trashed video right now, bypassing the 30-day wait.
  const handlePermanentDelete = async (entry) => {
    if (!window.confirm("Permanently delete this video? This cannot be undone.")) return;
    setDeletingUrl(entry.url);
    try {
      await deleteVideo(entry.url);
    } catch (err) {
      console.error("Permanent video delete failed:", err);
    } finally {
      setTrash(removeFromVideoTrash(entry.url));
      // Unlike a soft-delete (trash), the video is genuinely gone from
      // Cloudinary now — remove the stale entry from allVideos too, or it
      // reappears in the merged list (trashedUrls no longer hides it) until
      // the bin is reopened and the video list is refetched.
      setAllVideos((prev) => prev.filter((x) => x.url !== entry.url));
      setMeta((prev) => {
        if (!prev[entry.url]) return prev;
        const next = { ...prev };
        delete next[entry.url];
        return next;
      });
      setDeletingUrl(null);
    }
  };

  const playingVideo = useMemo(
    () => mergedVideos.find((v) => v.url === playingUrl),
    [mergedVideos, playingUrl],
  );

  // ── Action buttons shared between grid + list ─────────────────────────────
  const VideoActions = ({ v }) => (
    <div className="vb-actions">
      <button
        className="vb-action-btn vb-action-btn--play"
        onClick={() => setPlayingUrl(v.url)}
        title="Play"
      >
        ▶ Play
      </button>
      <button
        className="vb-action-btn vb-action-btn--share"
        onClick={() => handleShare(v)}
        title="Share video link"
      >
        {shareStatus[v.url] === "copying"
          ? "…"
          : shareStatus[v.url] === "copied"
            ? "✅"
            : shareStatus[v.url] === "error"
              ? "❌"
              : "🔗 Share"}
      </button>
      <button
        className="vb-action-btn vb-action-btn--download"
        onClick={() => handleDownload(v)}
        title="Download video"
        disabled={dlStatus[v.url] === "downloading"}
      >
        {dlStatus[v.url] === "downloading"
          ? "…"
          : dlStatus[v.url] === "done"
            ? "✅"
            : "⬇ Save"}
      </button>
      <button
        className="vb-action-btn vb-action-btn--delete"
        onClick={() => handleDelete(v)}
        title="Delete video"
        disabled={deletingUrl === v.url}
      >
        {deletingUrl === v.url ? "…" : "🗑️ Delete"}
      </button>
    </div>
  );

  // ── Grid card ─────────────────────────────────────────────────────────────
  const GridCard = ({ v }) => (
    <div className="vb-card">
      <button
        className="vb-card__thumb-btn"
        onClick={() => setPlayingUrl(v.url)}
      >
        {v.poster && !posterFailed.has(v.url) ? (
          <img
            className="vb-card__thumb"
            src={v.poster}
            alt={v.title || "video"}
            onError={() => markPosterFailed(v.url)}
          />
        ) : (
          <div className="vb-card__thumb vb-card__thumb--blank">▶</div>
        )}
        <div className="vb-card__play">▶</div>
      </button>
      <div className="vb-card__info">
        <div className="vb-card__title-row">
          {editingUrl === v.url ? (
            <input
              className="vb-card__title-input"
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => commitEdit(v.url)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit(v.url);
              }}
            />
          ) : (
            <span className="vb-card__title">{v.title || "Untitled"}</span>
          )}
          <button
            className="vb-card__edit-btn"
            title="Rename"
            onClick={() => startEdit(v.url, v.title)}
          >
            ✏️
          </button>
        </div>
        <div className="vb-card__meta">
          <span className="vb-card__section">
            {SECTION_LABELS[v.section] || v.section}
          </span>
          <span className="vb-card__date">{fmtDate(v.addedAt)}</span>
        </div>
        <VideoActions v={v} />
      </div>
    </div>
  );

  // ── List row ──────────────────────────────────────────────────────────────
  const ListRow = ({ v }) => (
    <div className="vb-row">
      <button
        className="vb-row__thumb-btn"
        onClick={() => setPlayingUrl(v.url)}
      >
        {v.poster && !posterFailed.has(v.url) ? (
          <img
            className="vb-row__thumb"
            src={v.poster}
            alt={v.title || "video"}
            onError={() => markPosterFailed(v.url)}
          />
        ) : (
          <div className="vb-row__thumb vb-row__thumb--blank">▶</div>
        )}
      </button>
      <div className="vb-row__info">
        <div className="vb-row__title-row">
          {editingUrl === v.url ? (
            <input
              className="vb-card__title-input"
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => commitEdit(v.url)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit(v.url);
              }}
            />
          ) : (
            <span className="vb-row__title">{v.title || "Untitled"}</span>
          )}
          <button
            className="vb-card__edit-btn"
            title="Rename"
            onClick={() => startEdit(v.url, v.title)}
          >
            ✏️
          </button>
        </div>
        <div className="vb-card__meta">
          <span className="vb-card__section">
            {SECTION_LABELS[v.section] || v.section}
          </span>
          <span className="vb-card__date">{fmtDate(v.addedAt)}</span>
        </div>
        <VideoActions v={v} />
      </div>
    </div>
  );

  return (
    <>
      {/* Docked stub */}
      <section className="video-bin" aria-label="Videos">
        <header className="video-bin__header">
          <h3 className="video-bin__title">
            Videos{" "}
            {mergedVideos.length > 0 && (
              <span className="vb-count">{mergedVideos.length}</span>
            )}
          </h3>
          <button className="video-bin__btn" onClick={() => setIsOpen(true)}>
            Open
          </button>
        </header>
        <p className="video-bin__empty">
          {mergedVideos.length === 0
            ? "No videos yet. Record a try-on or upload a video."
            : `${mergedVideos.length} video${mergedVideos.length !== 1 ? "s" : ""} saved.`}
        </p>
      </section>

      {/* Main modal */}
      {isOpen &&
        createPortal(
          <>
            <div className="vb-overlay" onClick={() => setIsOpen(false)} />
            <div className="vb-modal" role="dialog" aria-label="Video Bin">
              <header className="vb-modal__head">
                <h2 className="vb-modal__title">🎬 Video Bin</h2>
                <div className="vb-modal__controls">
                  <div className="vb-toggle">
                    <button
                      className={`vb-toggle__btn ${viewMode === "grid" ? "is-active" : ""}`}
                      onClick={() => setViewMode("grid")}
                      title="Grid view"
                    >
                      ⊞
                    </button>
                    <button
                      className={`vb-toggle__btn ${viewMode === "list" ? "is-active" : ""}`}
                      onClick={() => setViewMode("list")}
                      title="List view"
                    >
                      ☰
                    </button>
                  </div>
                  <button
                    className={`vb-trash-btn${trashOpen ? " is-active" : ""}`}
                    onClick={() => setTrashOpen((v) => !v)}
                    title="Deleted videos (kept 30 days)"
                  >
                    🗑️{trash.length > 0 && ` (${trash.length})`}
                  </button>
                  <button
                    className="vb-modal__close"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
              </header>

              {trashOpen && (
                <div className="vb-trash">
                  <div className="vb-trash__head">
                    <h3 className="vb-trash__title">
                      🗑️ Deleted Videos ({trash.length})
                    </h3>
                    <button className="vb-trash__close" onClick={() => setTrashOpen(false)}>✕</button>
                  </div>
                  <p className="vb-trash__sub">
                    Kept for {VIDEO_TRASH_DAYS} days, then permanently removed. Restore any of these, or delete one for good right now.
                  </p>
                  {trash.length === 0 ? (
                    <p className="vb-trash__empty">Nothing in the trash.</p>
                  ) : (
                    <div className="vb-trash__list">
                      {trash.map((t) => {
                        const days = daysUntilPurge(t.deletedAt);
                        return (
                          <div key={t.url} className="vb-trash__item">
                            {t.poster ? (
                              <img src={t.poster} alt={t.title || "video"} className="vb-trash__thumb" onError={(e) => { e.target.style.display = "none"; }} />
                            ) : (
                              <div className="vb-trash__thumb vb-trash__thumb--blank">▶</div>
                            )}
                            <div className="vb-trash__info">
                              <span className="vb-trash__name">{t.title || "Untitled"}</span>
                              <span className="vb-trash__days">
                                {days > 0 ? `${days} day${days !== 1 ? "s" : ""} left` : "Purging soon…"}
                              </span>
                            </div>
                            <div className="vb-trash__actions">
                              <button className="vb-trash__restore" onClick={() => handleRestore(t)}>↩️ Restore</button>
                              <button
                                className="vb-trash__delete"
                                onClick={() => handlePermanentDelete(t)}
                                disabled={deletingUrl === t.url}
                              >
                                {deletingUrl === t.url ? "…" : "🗑️ Delete Permanently"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="vb-modal__body">
                {loading && <p className="vb-loading">Loading videos…</p>}
                {!loading && mergedVideos.length === 0 && (
                  <div className="vb-empty">
                    <p>No videos yet.</p>
                    <p>
                      Record a try-on using the 🎬 Try On button, or upload a
                      video when adding a clothing item.
                    </p>
                  </div>
                )}
                {!loading &&
                  mergedVideos.length > 0 &&
                  (viewMode === "grid" ? (
                    <div className="vb-grid">
                      {mergedVideos.map((v) => (
                        <GridCard key={v.url} v={v} />
                      ))}
                    </div>
                  ) : (
                    <div className="vb-list">
                      {mergedVideos.map((v) => (
                        <ListRow key={v.url} v={v} />
                      ))}
                    </div>
                  ))}
              </div>
            </div>

            {/* Full-screen player */}
            {playingUrl && (
              <>
                <div
                  className="vb-player-overlay"
                  onClick={() => setPlayingUrl(null)}
                />
                <div className="vb-player">
                  <div className="vb-player__toolbar">
                    <button
                      className="vb-player__close"
                      onClick={() => setPlayingUrl(null)}
                      aria-label="Close player"
                    >
                      ×
                    </button>
                    <div className="vb-player__toolbar-actions">
                      <button
                        className="vb-player__action"
                        onClick={() => handleShare(playingVideo)}
                        title="Share"
                      >
                        {shareStatus[playingUrl] === "copied"
                          ? "✅ Copied!"
                          : "🔗 Share"}
                      </button>
                      <button
                        className="vb-player__action"
                        onClick={() => handleDownload(playingVideo)}
                        title="Download"
                      >
                        {dlStatus[playingUrl] === "downloading"
                          ? "Downloading…"
                          : dlStatus[playingUrl] === "done"
                            ? "✅ Saved!"
                            : "⬇ Download"}
                      </button>
                      <button
                        className="vb-player__action vb-player__action--delete"
                        onClick={() => handleDelete(playingVideo)}
                        title="Delete video"
                        disabled={deletingUrl === playingUrl}
                      >
                        {deletingUrl === playingUrl ? "…" : "🗑️ Delete"}
                      </button>
                    </div>
                  </div>
                  <video
                    ref={playerVideoRef}
                    className="vb-player__video"
                    src={playingUrl}
                    controls
                    playsInline
                    poster={playingVideo?.poster || ""}
                  />
                  <div className="vb-player__info">
                    <span className="vb-player__title">
                      {playingVideo?.title || "Untitled"}
                    </span>
                    <span className="vb-player__date">
                      {fmtDate(playingVideo?.addedAt)}
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Undo toast — shown for a few seconds right after a delete */}
            {undoVideo && (
              <div className="vb-undo-toast">
                <span>Video moved to trash.</span>
                <button className="vb-undo-toast__btn" onClick={handleUndoDelete}>↩️ Undo</button>
              </div>
            )}
          </>,
          document.body,
        )}
    </>
  );
}
