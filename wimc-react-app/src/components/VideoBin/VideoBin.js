import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { fetchVideosByTag, videoPoster } from "../../utils/CloudinaryAPI";
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

const LS_META_KEY = "wimc_video_meta"; // { [url]: { title, addedAt } }

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

function loadMeta() {
  try {
    return JSON.parse(localStorage.getItem(LS_META_KEY) || "{}");
  } catch {
    return {};
  }
}
function saveMeta(meta) {
  try {
    localStorage.setItem(LS_META_KEY, JSON.stringify(meta));
  } catch {}
}

function normalize(url, section) {
  if (!url) return null;
  const poster = videoPoster(url);
  const meta = loadMeta();
  const stored = meta[url] || {};
  return {
    url,
    poster,
    section,
    title: stored.title || "",
    addedAt: stored.addedAt || new Date().toISOString(),
  };
}

export default function VideoBin({ videos: propVideos = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
  const [allVideos, setAllVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [playingUrl, setPlayingUrl] = useState(null); // full-screen player
  const [editingUrl, setEditingUrl] = useState(null); // which video title is being edited
  const [editValue, setEditValue] = useState("");
  const [meta, setMeta] = useState(loadMeta);

  // Merge prop videos (from try-on / current section) with tag-fetched videos
  const mergedVideos = useMemo(() => {
    const seen = new Set();
    const out = [];
    const add = (url, section) => {
      if (!url || seen.has(url)) return;
      seen.add(url);
      const m = meta[url] || {};
      out.push({
        url,
        poster: videoPoster(url),
        section: section || "uncategorized",
        title: m.title || "",
        addedAt: m.addedAt || new Date().toISOString(),
      });
    };
    // prop videos first (most recent try-ons)
    propVideos.forEach((v) => {
      const url = typeof v === "string" ? v : v?.mediaUrl || v?.url || "";
      add(url, v?.section || "");
    });
    // fetched videos
    allVideos.forEach((v) => add(v.url, v.section));
    return out;
  }, [propVideos, allVideos, meta]);

  // Fetch all sections when modal opens
  useEffect(() => {
    if (!isOpen) return;
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

  // Persist meta (titles + timestamps) whenever it changes
  useEffect(() => {
    saveMeta(meta);
  }, [meta]);

  // Ensure addedAt exists for any video that doesn't have it
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

  // Escape closes player or modal
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

  // Title editing
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

  const playingVideo = useMemo(
    () => mergedVideos.find((v) => v.url === playingUrl),
    [mergedVideos, playingUrl],
  );

  // ── Card (grid) ───────────────────────────────────────────────────────────
  const GridCard = ({ v }) => (
    <div className="vb-card">
      <button
        className="vb-card__thumb-btn"
        onClick={() => setPlayingUrl(v.url)}
      >
        {v.poster ? (
          <img
            className="vb-card__thumb"
            src={v.poster}
            alt={v.title || "video"}
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
            title="Rename video"
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
      </div>
    </div>
  );

  // ── Row (list) ────────────────────────────────────────────────────────────
  const ListRow = ({ v }) => (
    <div className="vb-row">
      <button
        className="vb-row__thumb-btn"
        onClick={() => setPlayingUrl(v.url)}
      >
        {v.poster ? (
          <img
            className="vb-row__thumb"
            src={v.poster}
            alt={v.title || "video"}
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
            title="Rename video"
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
      </div>
      <button className="vb-row__play-btn" onClick={() => setPlayingUrl(v.url)}>
        ▶ Play
      </button>
    </div>
  );

  return (
    <>
      {/* ── Docked stub ── */}
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

      {/* ── Main modal ── */}
      {isOpen &&
        createPortal(
          <>
            <div className="vb-overlay" onClick={() => setIsOpen(false)} />
            <div className="vb-modal" role="dialog" aria-label="Video Bin">
              <header className="vb-modal__head">
                <h2 className="vb-modal__title">🎬 Video Bin</h2>
                <div className="vb-modal__controls">
                  {/* Grid / List toggle */}
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
                    className="vb-modal__close"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
              </header>

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

            {/* ── Full-screen video player ── */}
            {playingUrl && (
              <>
                <div
                  className="vb-player-overlay"
                  onClick={() => setPlayingUrl(null)}
                />
                <div className="vb-player">
                  <button
                    className="vb-player__close"
                    onClick={() => setPlayingUrl(null)}
                    aria-label="Close player"
                  >
                    ×
                  </button>
                  <video
                    className="vb-player__video"
                    src={playingUrl}
                    controls
                    autoPlay
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
          </>,
          document.body,
        )}
    </>
  );
}
