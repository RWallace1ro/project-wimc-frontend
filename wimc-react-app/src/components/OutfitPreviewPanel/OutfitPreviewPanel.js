import { syncSetItem } from '../../utils/syncStore';
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchImagesForSection,
  fetchVideosByTag,
  fetchVideosForSection,
  fetchImagesByTag,
  uploadRawJSON,
  videoPoster,
} from "../../utils/CloudinaryAPI";
import { getSubSections } from "../../utils/closetSubsections";
import "./OutfitPreviewPanel.css";
import { appShareUrl, createCollabDoc, shareAppLink, smsShareUrl, decodeShareSrc } from "../../utils/shareUtils";
import Lightbox from "../Lightbox/Lightbox";
import ClosetSearch from "../ClosetSearch/ClosetSearch";
import { onImgError } from "../../utils/imgFallback";

// Unisex closet: one fixed 8-option list, same for everyone.
const SECTION_OPTIONS_UNISEX = [
  { value: "dresses-skirts",     label: "Dresses/Skirts" },
  { value: "dress-shirts-suits", label: "Dress Shirts/Suits" },
  { value: "shoes-sneakers",     label: "Shoes/Sneakers" },
  { value: "pants-jeans",        label: "Pants/Jeans" },
  { value: "tops",               label: "Tops" },
  { value: "bags-accessories",   label: "Bags/Accessories" },
  { value: "jackets-coats",      label: "Jackets/Coats" },
  { value: "blazers",            label: "Blazers" },
];

const DEFAULT_SECTION_FALLBACK = "Uncategorized";
const GRID_COLS_FLOATING = 3;
const GRID_COLS_COMPACT = 2;
const DOOR_MS = 3000;
const SHARE_VERSION = 1;

// LocalStorage keys — built dynamically so each child has their own preview state
function buildLS(tagPrefix) {
  const suffix = tagPrefix ? `_${tagPrefix}` : "";
  return {
    STATE_V2: `wimc_preview_state_v2${suffix}`,
    LEGACY_ITEMS_V1: `wimc_preview_items${suffix}`,
  };
}

// ---------- helpers ----------
function ensureHttps(u) {
  if (!u) return u;
  return u.startsWith("//") ? "https:" + u : u;
}
function isVideoUrl(u = "") {
  return /\.(mp4|mov|webm|mkv|m4v)(\?.*)?$/i.test(u || "");
}
function filenameToName(url = "") {
  try {
    const last = url.split("/").pop() || "";
    const base = last.split(".")[0];
    return decodeURIComponent(base).replace(/[_-]+/g, " ").trim();
  } catch {
    return "";
  }
}
function safeVideoPoster(url) {
  try {
    const u = new URL(url);
    if (u.pathname.includes("/video/upload/")) {
      return url
        .replace("/video/upload/", "/video/upload/pg_1/")
        .replace(/\.(mp4|mov|webm|mkv|m4v)(\?.*)?$/i, ".jpg");
    }
  } catch {}
  return "";
}
function normalizeMedia(x, sectionHint) {
  if (!x) return null;
  const to = (url) =>
    url?.replace("/upload/", "/upload/f_auto,q_auto,w_600,c_limit/");
  if (typeof x === "string") {
    const url = ensureHttps(x);
    const isV = isVideoUrl(url);
    return {
      mediaType: isV ? "video" : "image",
      mediaUrl: url,
      mediaPoster: isV ? videoPoster(url) || safeVideoPoster(url) : "",
      mediaThumb: !isV ? to(url) : "",
      name: filenameToName(url),
      section: sectionHint || DEFAULT_SECTION_FALLBACK,
    };
  }
  const url = ensureHttps(x.mediaUrl || x.url || x.imageUrl || "");
  const isV = isVideoUrl(url);
  return {
    mediaType: x.mediaType || (isV ? "video" : "image"),
    mediaUrl: url,
    mediaPoster:
      x.mediaPoster ||
      x.poster ||
      (isV ? videoPoster(url) || safeVideoPoster(url) : ""),
    mediaThumb: x.mediaThumb || x.thumb || (!isV ? to(url) : ""),
    name: x.name || filenameToName(url),
    section: x.section || sectionHint || DEFAULT_SECTION_FALLBACK,
  };
}
function uid() {
  return (
    Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e9).toString(36)
  );
}

// --- SVG Icons (compact, inline) ---
const IconSave = (props) => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path
      d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-4-4z"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M17 3v6H7V3"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <rect
      x="7"
      y="13"
      width="10"
      height="6"
      rx="1"
      stroke="currentColor"
      fill="none"
      strokeWidth="2"
    />
  </svg>
);

const IconPrint = (props) => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path
      d="M6 9V3h12v6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <rect
      x="6"
      y="13"
      width="12"
      height="8"
      rx="1"
      stroke="currentColor"
      fill="none"
      strokeWidth="2"
    />
    <rect x="6" y="3" width="12" height="4" rx="1" fill="currentColor" />
    <path
      d="M6 17h12M4 9h16a2 2 0 0 1 2 2v2H2v-2a2 2 0 0 1 2-2z"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);

export default function OutfitPreviewPanel({ onSelectionChange, tagPrefix = "", incomingItems = null, sectionOptions = null }) {
  // sectionOptions, when provided (e.g. Pet Closet), overrides the default
  // unisex list so panels show custom labels while keeping standard tags.
  const SECTION_OPTIONS = sectionOptions || SECTION_OPTIONS_UNISEX;
  // Child-specific LS keys — prevents main closet and kids closets sharing preview state
  const LS = buildLS(tagPrefix);
  // layout & doors
  const [isOpen, setIsOpen] = useState(false);
  const [opening, setOpening] = useState(false);
  const [doorsArmed, setDoorsArmed] = useState(false);
  const [isFloating, setIsFloating] = useState(false);

  // data
  const [selected, setSelected] = useState([]);
  const [section, setSection] = useState(SECTION_OPTIONS[0].value);

  // Sub-section within the current section card (e.g. Skirts under
  // Dresses/Skirts). null = "All" — every sub-section merged together.
  const [subSection, setSubSection] = useState(null);
  const effectiveSection = tagPrefix ? `${tagPrefix}-${section}` : section;
  const subSections = getSubSections(effectiveSection);
  useEffect(() => { setSubSection(null); }, [section]);
  const [choices, setChoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // meta
  const [note, setNote] = useState("");

  // DnD grid
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const gridRef = useRef(null);

  // share/import (current outfit)
  const [sharing, setSharing] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const [shareError, setShareError] = useState("");
  const [shareSmsHref, setShareSmsHref] = useState("");
  const [loadUrl, setLoadUrl] = useState("");
  const [loadingImport, setLoadingImport] = useState(false);
  const [importError, setImportError] = useState("");
  const shareRowRef = useRef(null);

  // favorites (drawer)
  const [favorites, setFavorites] = useState([]);
  const [favsOpen, setFavsOpen] = useState(false);

  // saved looks (drawer)
  const [looks, setLooks] = useState([]);
  const [newLookName, setNewLookName] = useState("");
  const [looksOpen, setLooksOpen] = useState(false);
  const [looksStatus, setLooksStatus] = useState(""); // "saved" flash

  // per-item name visibility (hidden by default)
  const [nameVisibleKeys, setNameVisibleKeys] = useState(() => new Set());

  // Apply items from search results (parent-routed, legacy)
  useEffect(() => {
    if (!incomingItems?.items?.length) return;
    addMany(incomingItems.items, "merge");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingItems]);

  // In-panel closet search
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // lightbox
  const [lbImages, setLbImages] = useState([]);
  const [lbIndex, setLbIndex] = useState(0);
  const openLightbox = (images, idx) => { setLbImages(images); setLbIndex(idx); };
  const closeLightbox = () => setLbImages([]);

  // clear-all toast
  const [clearToast, setClearToast] = useState(false);
  const clearToastTimerRef = useRef(null);

  // history
  const undoStackRef = useRef([]); // [{selected, note}]
  const redoStackRef = useRef([]);
  const historyLockRef = useRef(false);
  const HISTORY_MAX = 50;

  const pushHistory = useCallback((snap) => {
    const stack = undoStackRef.current;
    stack.push({
      selected: (snap.selected || []).map((it) => ({ ...it })),
      note: snap.note || "",
    });
    if (stack.length > HISTORY_MAX) stack.shift();
    redoStackRef.current = [];
  }, []);

  const commitHistory = useCallback(
    (nextSel = selected, nextNote = note) => {
      if (historyLockRef.current) return;
      pushHistory({ selected: nextSel, note: nextNote });
    },
    [selected, note, pushHistory],
  );

  const doUndo = useCallback(() => {
    const undoStack = undoStackRef.current;
    if (undoStack.length <= 1) return;
    const current = undoStack.pop();
    redoStackRef.current.push(current);
    const prev = undoStack[undoStack.length - 1];
    historyLockRef.current = true;
    setSelected(prev.selected.map((it) => normalizeMedia(it)));
    setNote(prev.note);
    historyLockRef.current = false;
  }, []);

  const doRedo = useCallback(() => {
    const redoStack = redoStackRef.current;
    if (redoStack.length === 0) return;
    const next = redoStack.pop();
    undoStackRef.current.push(next);
    historyLockRef.current = true;
    setSelected(next.selected.map((it) => normalizeMedia(it)));
    setNote(next.note);
    historyLockRef.current = false;
  }, []);

  // live sync (optional)
  const chanRef = useRef(null);
  const instanceIdRef = useRef(uid());

  // LS hydrate/persist (Planner-style)
  const hydratedRef = useRef(false);

  // This panel stays mounted across gender/kid/pet switches (only `tagPrefix`
  // changes), but the hydrate effect below only ever ran once — so toggling
  // gender left the OTHER closet's selection sitting in the grid, and then
  // started writing it into the new closet's storage key. Force a re-hydrate
  // whenever the closet identity changes.
  useEffect(() => {
    hydratedRef.current = false;
  }, [tagPrefix]);

  // ----- HYDRATE -----
  useEffect(() => {
    if (hydratedRef.current) return;

    // Reset to empty first — otherwise, if the newly-switched-to closet has
    // no saved selection of its own, whatever was in memory from the
    // previous closet would keep showing instead of an empty grid.
    setSelected([]);
    setNote("");
    setFavorites([]);
    setLooks([]);

    try {
      const raw = localStorage.getItem(LS.STATE_V2);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && data.version === 2) {
          setSelected(
            (data.selected || []).map((s) => normalizeMedia(s)).filter(Boolean),
          );
          setNote(data.note || "");
          setFavorites(
            (data.favorites || [])
              .map((f) => normalizeMedia(f))
              .filter(Boolean),
          );
          setLooks(
            Array.isArray(data.looks)
              ? data.looks.map((l) => ({
                  ...l,
                  items: (l.items || [])
                    .map((it) => normalizeMedia(it))
                    .filter(Boolean),
                }))
              : [],
          );
        }
      } else {
        // legacy migration
        const legacy = localStorage.getItem(LS.LEGACY_ITEMS_V1);
        if (legacy) {
          const saved = JSON.parse(legacy || "[]");
          const norm = (saved || [])
            .map((s) => normalizeMedia(s))
            .filter(Boolean);
          setSelected(norm);
          const v2 = {
            version: 2,
            selected: norm,
            note: "",
            favorites: [],
            looks: [],
          };
          try {
            syncSetItem(LS.STATE_V2, JSON.stringify(v2));
          } catch {}
        }
      }
    } catch {
      // ignore bad data
    } finally {
      hydratedRef.current = true;
      // baseline history after hydration
      pushHistory({ selected: [], note: "" });
    }
  }, [pushHistory, tagPrefix]);

  // ----- PERSIST + notify parent -----
  useEffect(() => {
    if (!hydratedRef.current) return;
    const payload = { version: 2, selected, note, favorites, looks };
    try {
      syncSetItem(LS.STATE_V2, JSON.stringify(payload));
    } catch {}
    onSelectionChange?.(selected);

    // broadcast
    if (!historyLockRef.current) {
      try {
        chanRef.current?.postMessage({
          type: "preview:update",
          from: instanceIdRef.current,
          selected,
          note,
          ts: Date.now(),
        });
      } catch {}
    }
  }, [selected, note, favorites, looks, onSelectionChange]);

  // ----- BroadcastChannel wiring -----
  useEffect(() => {
    let chan;
    try {
      chan = new BroadcastChannel("wimc-sync");
      chanRef.current = chan;
      chan.onmessage = (ev) => {
        const msg = ev?.data || {};
        if (msg.from && msg.from === instanceIdRef.current) return;

        if (msg.type === "planner:update" || msg.type === "travel:update") {
          if (Array.isArray(msg.selected)) {
            const norm = msg.selected
              .map((it) => normalizeMedia(it))
              .filter(Boolean);
            historyLockRef.current = true;
            setSelected(norm);
            setNote(msg.note || "");
            historyLockRef.current = false;
            commitHistory(norm, msg.note || "");
          }
        }
        if (msg.type === "preview:request") {
          try {
            chanRef.current?.postMessage({
              type: "preview:update",
              from: instanceIdRef.current,
              selected,
              note,
              ts: Date.now(),
            });
          } catch {}
        }
      };
      chan.postMessage({
        type: "preview:hello",
        from: instanceIdRef.current,
        ts: Date.now(),
      });
      chan.postMessage({
        type: "preview:request",
        from: instanceIdRef.current,
        ts: Date.now(),
      });
    } catch {}
    return () => {
      try {
        chan?.close();
      } catch {}
    };
  }, [commitHistory, note, selected]);

  // keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && isFloating) closePanel();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) doRedo();
        else doUndo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        doRedo();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFloating, doUndo, doRedo]);

  // choices pool (when open)
  useEffect(() => {
    let ignore = false;
    async function run() {
      if (!isOpen || !section) return;
      setLoading(true);
      setError("");
      try {
        // A specific sub-section fetches just that tag; "All" merges every
        // sub-section together (fetchImagesForSection/fetchVideosForSection).
        const [imgs, vids] = subSection
          ? await Promise.all([fetchImagesByTag(subSection), fetchVideosByTag(subSection)])
          : await Promise.all([fetchImagesForSection(effectiveSection), fetchVideosForSection(effectiveSection)]);
        const norm = [
          ...(imgs || []).map((u) => normalizeMedia(u, section)),
          ...(vids || []).map((u) =>
            normalizeMedia(
              { mediaType: "video", mediaUrl: u, mediaPoster: videoPoster(u) },
              section,
            ),
          ),
        ].filter(Boolean);
        if (!ignore) setChoices(norm);
      } catch {
        if (!ignore) {
          setError("Couldn’t load this section. Try another one.");
          setChoices([]);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    run();
    return () => {
      ignore = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, section, subSection, tagPrefix]);

  // share row auto-scroll
  useEffect(() => {
    if (shareRowRef.current && (shareStatus || shareError)) {
      shareRowRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [shareStatus, shareError]);

  // actions
  const existsIn = useCallback((arr, item) => {
    const key = item?.mediaUrl || item?.imageUrl || item?.name;
    return arr?.some((p) => (p.mediaUrl || p.imageUrl || p.name) === key);
  }, []);

  const addItem = useCallback(
    (item) => {
      const norm = normalizeMedia(item);
      if (!norm) return;
      setSelected((prev) => {
        if (existsIn(prev, norm)) return prev;
        const next = [...prev, norm];
        commitHistory(next, note);
        return next;
      });
    },
    [commitHistory, existsIn, note],
  );

  const removeItem = useCallback(
    (i) =>
      setSelected((prev) => {
        const next = prev.filter((_, idx) => idx !== i);
        commitHistory(next, note);
        return next;
      }),
    [commitHistory, note],
  );

  const clearAll = useCallback(
    () =>
      setSelected((prev) => {
        if (prev.length === 0) return prev;
        const next = [];
        commitHistory(next, note);
        return next;
      }),
    [commitHistory, note],
  );

  const addMany = useCallback(
    (items = [], mode = "merge") => {
      const incoming = items.map((it) => normalizeMedia(it)).filter(Boolean);
      setSelected((prev) => {
        const base = mode === "replace" ? [] : prev.slice();
        const seen = new Set(
          base.map((p) => p.mediaUrl || p.imageUrl || p.name),
        );
        const merged = [...base];
        for (const it of incoming) {
          const k = it.mediaUrl || it.imageUrl || it.name;
          if (!seen.has(k)) {
            seen.add(k);
            merged.push(it);
          }
        }
        commitHistory(merged, note);
        return merged;
      });
    },
    [commitHistory, note],
  );

  // doors — isOpen flips true immediately (so the header toggle switches to
  // "✕" right away, matching Outfit of the Day/Travel Pack); "opening" only
  // controls the brief door-slide overlay in the body while it plays.
  const startOpen = useCallback(() => {
    setIsFloating(true);
    setIsOpen(true);
    setOpening(true);
    setDoorsArmed(false);
    requestAnimationFrame(() => setDoorsArmed(true));
    setTimeout(() => {
      setOpening(false);
      setDoorsArmed(false);
    }, DOOR_MS);
  }, []);
  const closePanel = useCallback(() => {
    setIsOpen(false);
    setOpening(false);
    setDoorsArmed(false);
    setIsFloating(false);
  }, []);

  // DnD handlers
  const handleDragStart = (i) => (e) => {
    setDragIndex(i);
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", String(i));
    } catch {}
  };
  const handleDragOver = (i) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== i) setDragOverIndex(i);
  };
  const handleDragLeave = () => setDragOverIndex(null);
  const handleDrop = (i) => (e) => {
    e.preventDefault();
    setDragOverIndex(null);
    if (dragIndex === null || dragIndex === i) return;
    setSelected((prev) => {
      const next = prev.slice();
      const [moved] = next.splice(dragIndex, 1);
      next.splice(i, 0, moved);
      commitHistory(next, note);
      return next;
    });
  };
  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const gridCols = isFloating ? GRID_COLS_FLOATING : GRID_COLS_COMPACT;
  const gridStyle = { "--opp-cols": gridCols };

  const onTileKeyDown = (i) => (e) => {
    const cols = isFloating ? GRID_COLS_FLOATING : GRID_COLS_COMPACT;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key))
      e.preventDefault();
    const moveItem = (from, to) => {
      if (to < 0 || to >= selected.length) return;
      setSelected((prev) => {
        const arr = prev.slice();
        const [m] = arr.splice(from, 1);
        arr.splice(to, 0, m);
        commitHistory(arr, note);
        return arr;
      });
      setTimeout(() => {
        const el = gridRef.current?.querySelector(`[data-idx="${to}"]`);
        el?.focus();
      }, 0);
    };
    if (e.key === "ArrowLeft") moveItem(i, i - 1);
    if (e.key === "ArrowRight") moveItem(i, i + 1);
    if (e.key === "ArrowUp") moveItem(i, i - cols);
    if (e.key === "ArrowDown") moveItem(i, i + cols);
    if (e.key === "Delete" || e.key === "Backspace") removeItem(i);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
      navigator.clipboard?.writeText(selected[i]?.mediaUrl || "");
    }
  };

  // favorites
  const toggleFavorite = (item) => {
    const norm = normalizeMedia(item);
    const key = norm.mediaUrl || norm.imageUrl || norm.name;
    setFavorites((prev) => {
      const idx = prev.findIndex(
        (p) => (p.mediaUrl || p.imageUrl || p.name) === key,
      );
      if (idx >= 0) {
        const next = prev.slice();
        next.splice(idx, 1);
        return next;
      }
      return [...prev, norm];
    });
  };

  // name visibility
  const keyOf = (it) => it.mediaUrl || it.imageUrl || it.name || "";
  const toggleNameFor = (it) => {
    const k = keyOf(it);
    setNameVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  // Saved looks helpers
  const saveCurrentAsLook = () => {
    if (!selected.length) return;
    const name =
      (newLookName || "").trim() ||
      `Look ${String(looks.length + 1).padStart(2, "0")}`;
    const now = new Date().toISOString();
    const look = {
      id: uid(),
      name,
      items: selected.map((it) => ({ ...it })),
      note,
      createdAt: now,
      updatedAt: now,
    };
    setLooks((prev) => [...prev, look]);
    setNewLookName("");
    setLooksOpen(true);
    setLooksStatus("saved");
    setTimeout(() => setLooksStatus(""), 1200);
  };
  const loadLook = (lookId, mode = "replace") => {
    const look = looks.find((l) => l.id === lookId);
    if (!look) return;
    addMany(look.items, mode);
    if (mode === "replace") setNote(look.note || "");
  };
  const renameLook = (lookId, newName) => {
    setLooks((prev) =>
      prev.map((l) =>
        l.id === lookId
          ? { ...l, name: newName, updatedAt: new Date().toISOString() }
          : l,
      ),
    );
  };
  const deleteLook = (lookId) => {
    setLooks((prev) => prev.filter((l) => l.id !== lookId));
  };
  const removeItemFromLook = (lookId, itemIdx) => {
    setLooks((prev) =>
      prev.map((l) =>
        l.id === lookId
          ? { ...l, items: (l.items || []).filter((_, i) => i !== itemIdx), updatedAt: new Date().toISOString() }
          : l,
      ),
    );
  };

  // share/export payloads
  const buildSharePayload = () => ({
    kind: "wimc.outfit",
    version: SHARE_VERSION,
    createdAt: new Date().toISOString(),
    note,
    itemCount: selected.length,
    items: selected.map((it) => ({
      mediaType: it.mediaType,
      mediaUrl: it.mediaUrl,
      mediaThumb: it.mediaThumb || "",
      mediaPoster: it.mediaPoster || "",
      name: it.name || "",
      section: it.section || DEFAULT_SECTION_FALLBACK,
    })),
    meta: { source: "WIMC Outfit Preview" },
  });

  const buildFavoritesPayload = (favoritesList) => ({
    kind: "wimc.favorites",
    version: SHARE_VERSION,
    createdAt: new Date().toISOString(),
    itemCount: favoritesList.length,
    items: favoritesList.map((it) => ({
      mediaType: it.mediaType,
      mediaUrl: it.mediaUrl,
      mediaThumb: it.mediaThumb || "",
      mediaPoster: it.mediaPoster || "",
      name: it.name || "",
      section: it.section || DEFAULT_SECTION_FALLBACK,
    })),
    meta: { source: "WIMC Favorites" },
  });

  const buildLooksPayload = (looksList) => ({
    kind: "wimc.savedLooks",
    version: SHARE_VERSION,
    createdAt: new Date().toISOString(),
    count: looksList.length,
    looks: looksList.map((l) => ({
      id: l.id,
      name: l.name,
      note: l.note || "",
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
      items: (l.items || []).map((it) => ({
        mediaType: it.mediaType,
        mediaUrl: it.mediaUrl,
        mediaThumb: it.mediaThumb || "",
        mediaPoster: it.mediaPoster || "",
        name: it.name || "",
        section: it.section || DEFAULT_SECTION_FALLBACK,
      })),
    })),
    meta: { source: "WIMC Saved Looks" },
  });

  // ── Share current outfit ────────────────────────────────────────────────
  async function handleShare(withEdit = false) {
    setSharing(true);
    setShareError("");
    setShareStatus("");
    setShareSmsHref("");
    const payload = buildSharePayload();
    try {
      let url;
      if (withEdit) {
        url = await createCollabDoc("outfit", payload);
      } else {
        const res = await uploadRawJSON(payload, "wimc/outfits");
        const cloudUrl =
          res?.secure_url || res?.url || res?.data?.secure_url || res?.data?.url;
        if (!cloudUrl) throw new Error("Upload failed");
        url = appShareUrl(cloudUrl, "outfit");
      }
      const result = await shareAppLink({
        title: "My Outfit 👗",
        text: "Check out my outfit on WIMC!",
        url,
      });
      if (result === "clipboard" || result === "unsupported") {
        setShareSmsHref(smsShareUrl(url, "Check out my outfit on WIMC!"));
        setTimeout(() => setShareSmsHref(""), 5000);
      }
      setShareStatus(
        result === "aborted" ? "" : result === "clipboard" ? "📋 Link copied!" : "✅ Shared!"
      );
      setTimeout(() => setShareStatus(""), 5000);
    } catch {
      setShareError("Share failed. Please try again.");
    } finally {
      setSharing(false);
    }
  }
  // ── Share Favorites ───────────────────────────────────────────────────────
  async function shareFavorites() {
    try {
      const payload = buildFavoritesPayload(favorites);
      const res = await uploadRawJSON(payload, "wimc/favorites");
      const cloudUrl = res?.secure_url || res?.url || res?.data?.secure_url || res?.data?.url;
      if (!cloudUrl) throw new Error("no url");
      const url = appShareUrl(cloudUrl, "outfit");
      await shareAppLink({ title: "My WIMC Favorites 💜", text: "My favorite outfits on WIMC!", url });
    } catch {
      setShareError("Favorites share failed.");
    }
  }
  // ── Share Saved Looks ─────────────────────────────────────────────────────
  async function shareLooks() {
    try {
      const payload = buildLooksPayload(looks);
      const res = await uploadRawJSON(payload, "wimc/saved-looks");
      const cloudUrl = res?.secure_url || res?.url || res?.data?.secure_url || res?.data?.url;
      if (!cloudUrl) throw new Error("no url");
      const url = appShareUrl(cloudUrl, "outfit");
      await shareAppLink({ title: "My Saved Looks 👗", text: "Check out my saved looks on WIMC!", url });
    } catch {
      setShareError("Looks share failed.");
    }
  }
  // Print helpers (compact)
  function buildPrintableHtml(sel, noteStr) {
    const now = new Date().toLocaleString();
    const groups = sel.reduce((acc, it) => {
      const key = it.section || DEFAULT_SECTION_FALLBACK;
      (acc[key] ||= []).push(it);
      return acc;
    }, {});
    const sectionsHtml = Object.entries(groups)
      .map(
        ([
          sec,
          items,
        ]) => `<section style="page-break-inside:avoid;margin:0 0 16px">
      <h2 style="font:600 16px system-ui;margin:0 0 6px">${sec}</h2>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
        ${items
          .map((it) => {
            const src =
              it.mediaType === "video"
                ? it.mediaPoster || ""
                : it.mediaThumb || it.mediaUrl;
            const alt = it.name || "item";
            return `<figure style="margin:0;padding:6px;border:1px solid #eee;border-radius:8px;background:#fff">
            <img src="${src}" alt="${alt}" style="width:100%;height:160px;object-fit:contain;display:block"/>
            <figcaption style="font:12px system-ui;color:#444;text-align:center;margin-top:6px">${alt}</figcaption>
          </figure>`;
          })
          .join("")}
      </div>
    </section>`,
      )
      .join("");
    return `<!doctype html><html><head><meta charset="utf-8"><title>Outfit – WIMC</title></head>
    <body style="margin:0;font:13px system-ui">
      <div style="padding:20px">
        <h1 style="margin:0 0 6px;font:700 20px system-ui">Outfit</h1>
        <div style="color:#555;margin-bottom:10px">Created: ${now} • Items: ${
          sel.length
        }</div>
        ${
          noteStr
            ? `<div style="white-space:pre-wrap;background:#fafafa;border:1px solid #eee;border-radius:8px;padding:10px;margin:6px 0 12px">${(
                noteStr || ""
              ).replaceAll("<", "&lt;")}</div>`
            : ""
        }
        ${sectionsHtml}
      </div>
      <script>window.addEventListener('load',()=>setTimeout(()=>print(),50));</script>
    </body></html>`;
  }
  function handlePrintCard() {
    if (!selected?.length) return;
    const html = buildPrintableHtml(selected, note);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank", "noopener");
    if (!w) {
      alert("Pop-up blocked. Allow pop-ups and try again.");
      URL.revokeObjectURL(url);
      return;
    }
    w.addEventListener("load", () => URL.revokeObjectURL(url));
  }

  // A plain product/photo link (jpg, png, tif, etc.) — add it directly as a
  // single item via an <img> tag rather than fetch()-ing it, since many
  // third-party image CDNs (retailer product photos, etc.) block cross-origin
  // fetch with CORS even though the browser can display the image just fine.
  const IMAGE_URL_RE = /\.(jpe?g|png|gif|webp|avif|tiff?|bmp|svg)(\?|#|$)/i;

  // ----- NEW: Import from URL (fixes no-undef) -----
  const importFromUrl = useCallback(
    async (mode /* 'replace' | 'merge' */) => {
      if (!loadUrl) return;
      setLoadingImport(true);
      setImportError("");
      try {
        if (IMAGE_URL_RE.test(loadUrl)) {
          addMany([loadUrl], mode === "replace" ? "replace" : "merge");
          setLoadUrl("");
          return;
        }
        // Users naturally paste the link WIMC's own "Share" gives them — an
        // app page (/shared?src=<encoded raw url>), not the raw JSON file
        // itself. Fetching that page directly 404s. Unwrap it when present.
        let fetchUrl = loadUrl;
        try {
          const asUrl = new URL(fetchUrl);
          const src = asUrl.searchParams.get("src");
          if (src) {
            const decoded = decodeShareSrc(src);
            if (decoded) fetchUrl = decoded;
          }
        } catch {
          /* not a valid absolute URL — fall through and let fetch() report why */
        }
        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data?.items || !Array.isArray(data.items)) {
          throw new Error("Malformed outfit JSON.");
        }
        addMany(data.items, mode === "replace" ? "replace" : "merge");
        setLoadUrl("");
      } catch (e) {
        setImportError(
          "Couldn’t load that link. Paste either a photo URL or a WIMC shared-outfit link.",
        );
      } finally {
        setLoadingImport(false);
      }
    },
    [loadUrl, addMany],
  );

  // img fallback
  const onImgError = (e, it) => {
    const el = e.currentTarget;
    if (it.mediaUrl && el.src !== it.mediaUrl) el.src = it.mediaUrl;
  };


  return (
    <>
      {lbImages.length > 0 && (
        <Lightbox images={lbImages} index={lbIndex} onClose={closeLightbox} onChange={setLbIndex} />
      )}
      <ClosetSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        target="preview"
        tagPrefix={tagPrefix}
        sectionOptions={sectionOptions}
        onApplyItems={(items) => addMany(items, "merge")}
      />
      {isFloating && <div className="opp-backdrop" onClick={closePanel} />}

      {/* Favorites Drawer */}
      {favsOpen && (
        <div
          className="opp-favs__backdrop"
          onClick={() => setFavsOpen(false)}
        >
          <aside
            className="opp-favs"
            role="dialog"
            aria-modal="true"
            aria-label="Favorites"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="opp-favs__head">
              <h4>Favorites</h4>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="opp__mini"
                  onClick={() => setFavorites([])}
                  disabled={!favorites.length}
                >
                  Clear
                </button>
                <button
                  className="opp__mini"
                  onClick={shareFavorites}
                  disabled={!favorites.length}
                  title="Share Favorites"
                >
                  Share
                </button>
                <button
                  className="opp__mini"
                  onClick={() => setFavsOpen(false)}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </header>
            {favorites.length === 0 ? (
              <div className="opp__empty" style={{ padding: 12 }}>
                No favorites yet
              </div>
            ) : (
              <div className="opp-favs__grid">
                {favorites.map((f, i) => {
                  const favImgs = favorites
                    .filter((x) => x.mediaUrl || x.mediaThumb)
                    .map((x) => ({ src: x.mediaThumb || x.mediaUrl, alt: x.name || "" }));
                  const imgIdx = favorites.indexOf(f);
                  return (
                    <span key={(f.mediaUrl || "fav") + i} className="opp-favs__wrap">
                      <img
                        className="opp-favs__img"
                        src={f.mediaType === "video" ? f.mediaPoster || "" : f.mediaThumb || f.mediaUrl}
                        alt={f.name || "favorite"}
                        title="Click to enlarge"
                        onClick={() => openLightbox(favImgs, Math.max(0, imgIdx))}
                        onError={onImgError}
                      />
                      <button
                        className="opp-favs__add"
                        onClick={() => addItem(f)}
                        title="Add to preview"
                        aria-label="Add to preview"
                      >
                        ➕
                      </button>
                      <button
                        className="opp-favs__del"
                        onClick={() => toggleFavorite(f)}
                        title="Remove from favorites"
                        aria-label="Remove from favorites"
                      >
                        🗑️
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Saved Looks Drawer */}
      {looksOpen && (
        <div
          className="opp-saved__backdrop"
          onClick={() => setLooksOpen(false)}
          aria-label="Close Saved Looks"
        >
          <aside
            className="opp-saved"
            role="dialog"
            aria-modal="true"
            aria-label="Saved Looks"
            onClick={(e) => e.stopPropagation()}
          >
            <header
              className="opp-saved__head"
            >
              <h4 className="opp-saved__title">Saved Looks</h4>
              <div
                className="opp-saved__actions"
                style={{ display: "flex", gap: 8 }}
              >
                <input
                  className="opp__input"
                  type="text"
                  placeholder="New look name…"
                  value={newLookName}
                  onChange={(e) => setNewLookName(e.target.value)}
                  style={{ minWidth: 160 }}
                />
                <button
                  className="opp__btn"
                  onClick={saveCurrentAsLook}
                  disabled={selected.length === 0}
                  title="Save current selection as a look"
                >
                  Save Current
                </button>
                {looksStatus === "saved" && (
                  <span className="opp__badge">Saved!</span>
                )}
                <button
                  className="opp__btn"
                  onClick={shareLooks}
                  disabled={!looks.length}
                  title="Share all Saved Looks"
                >
                  Share
                </button>
                <button
                  className="opp__btn"
                  onClick={() => setLooksOpen(false)}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </header>

            <div className="opp-saved__content">
              {looks.length === 0 ? (
                <div className="opp__empty" style={{ padding: 12 }}>
                  No saved looks yet
                </div>
              ) : (
                <div className="opp__looks-list">
                  {looks.map((l) => (
                    <div key={l.id} className="opp__look">
                      <div className="opp__look-head">
                        <input
                          className="opp__look-name"
                          value={l.name}
                          onChange={(e) => renameLook(l.id, e.target.value)}
                          title="Rename look"
                        />
                        <div className="opp__look-actions">
                          <button
                            className="opp__mini"
                            onClick={() => loadLook(l.id, "replace")}
                            title="Replace current selection with this look"
                          >
                            Load
                          </button>
                          <button
                            className="opp__mini"
                            onClick={() => loadLook(l.id, "merge")}
                            title="Merge this look into current selection"
                          >
                            Merge
                          </button>
                          <button
                            className="opp__mini opp__danger"
                            onClick={() => deleteLook(l.id)}
                            title="Delete look"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="opp__look-strip">
                        {(l.items || []).slice(0, 10).map((it, i) => {
                          const lookImgs = (l.items || [])
                            .filter((x) => x.mediaUrl || x.mediaThumb)
                            .map((x) => ({ src: x.mediaThumb || x.mediaUrl, alt: x.name || "" }));
                          const imgIdx = (l.items || []).indexOf(it);
                          return (
                          <span key={(it.mediaUrl || "thumb") + i} className="opp__look-thumb-wrap">
                            <img
                              className="opp__look-thumb"
                              src={
                                it.mediaType === "video"
                                  ? it.mediaPoster || ""
                                  : it.mediaThumb || it.mediaUrl
                              }
                              alt={it.name || "item"}
                              style={{ cursor: "zoom-in" }}
                              onClick={() => openLightbox(lookImgs, Math.max(0, imgIdx))}
                              onError={(e) => {
                                if (
                                  it.mediaUrl &&
                                  e.currentTarget.src !== it.mediaUrl &&
                                  !e.currentTarget.dataset.retried
                                ) {
                                  e.currentTarget.dataset.retried = "true";
                                  e.currentTarget.src = it.mediaUrl;
                                } else {
                                  onImgError(e);
                                }
                              }}
                              title={it.name || "Click to enlarge"}
                            />
                            <button
                              className="opp__look-thumb-del"
                              onClick={(e) => { e.stopPropagation(); removeItemFromLook(l.id, i); }}
                              title="Remove from look"
                              aria-label="Remove from look"
                            >
                              🗑️
                            </button>
                          </span>
                          );
                        })}
                        {(l.items || []).length > 10 && (
                          <span className="opp__look-more">
                            +{(l.items || []).length - 10}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      <section
        className={
          "outfit-preview-panel" +
          (isFloating ? " opp--floating" : "") +
          (!isOpen ? " opp--collapsed" : "")
        }
        aria-label="Outfit Preview"
      >
        <header className="opp__header">
          <h3 className="opp__title">👗 Outfit Preview</h3>
          <div className="opp__header-actions">
            <button
              className="opp__toggle"
              onClick={() => (isOpen ? closePanel() : startOpen())}
              aria-label={isOpen ? "Close" : "Open"}
            >
              {isOpen ? "✕" : "Open"}
            </button>
          </div>
        </header>

        {!isOpen ? (
          <div className="opp__collapsed-row">
            Pick outfit pieces • {selected.length} item{selected.length !== 1 ? "s" : ""} selected
          </div>
        ) : opening ? (
          <div
            className={"opp__doors" + (doorsArmed ? " opp__doors--open" : "")}
          >
            <div className="opp__door opp__door--left" />
            <div className="opp__door opp__door--right" />
          </div>
        ) : (
          <>
            {/* ── Section strip — horizontal scroll, always below header ── */}
            <div className="opp__section-strip">
              {SECTION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={"opp__section-pill" + (section === opt.value ? " is-active" : "")}
                  onClick={() => setSection(opt.value)}
                  type="button"
                >
                  {opt.label}
                </button>
              ))}
              <button
                className="opp__section-pill"
                type="button"
                onClick={() => setFavsOpen(true)}
              >
                ★ Favorites
              </button>
              <button
                className="opp__section-pill"
                type="button"
                onClick={() => setLooksOpen(true)}
              >
                💾 Saved Looks
              </button>
            </div>

            {/* ── Sub-section pills — narrow the current card down ── */}
            {subSections && (
              <div className="opp__section-strip opp__section-strip--sub">
                <button
                  className={"opp__section-pill opp__section-pill--sub" + (!subSection ? " is-active" : "")}
                  type="button"
                  onClick={() => setSubSection(null)}
                >
                  All
                </button>
                {subSections.map((s) => (
                  <button
                    key={s.tag}
                    className={"opp__section-pill opp__section-pill--sub" + (subSection === s.tag ? " is-active" : "")}
                    type="button"
                    onClick={() => setSubSection(s.tag)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}

          <div className="opp__body">
            <div className="opp__right">
              <div className="opp__toolbar">
                {/* Import/Merge from URL */}
                <div className="opp__import">
                  <input
                    className="opp__input"
                    type="url"
                    placeholder="Load from link…"
                    value={loadUrl}
                    onChange={(e) => setLoadUrl(e.target.value)}
                  />
                  <div className="opp__import-actions">
                    <button
                      className="opp__btn"
                      disabled={!loadUrl || loadingImport}
                      onClick={() => importFromUrl("replace")}
                      title="Replace current selection"
                    >
                      {loadingImport ? "Loading…" : "Load"}
                    </button>
                    <button
                      className="opp__btn"
                      disabled={!loadUrl || loadingImport}
                      onClick={() => importFromUrl("merge")}
                      title="Merge with current selection"
                    >
                      Merge
                    </button>
                  </div>
                  {importError && <div className="opp__error">{importError}</div>}
                </div>
                <button
                  className="opp__btn opp__btn--search"
                  onClick={() => setIsSearchOpen(true)}
                  title="Search your closet and add items"
                >
                  🔍 Search Closet
                </button>
                <button
                  className="opp__btn"
                  onClick={doUndo}
                  title="Undo (Ctrl/Cmd+Z)"
                >
                  Undo
                </button>
                <button
                  className="opp__btn"
                  onClick={doRedo}
                  title="Redo (Ctrl/Cmd+Y or Shift+Ctrl/Cmd+Z)"
                >
                  Redo
                </button>

                <button
                  className="opp__btn"
                  onClick={() => {
                    clearAll();
                    if (clearToastTimerRef.current)
                      clearTimeout(clearToastTimerRef.current);
                    setClearToast(true);
                    clearToastTimerRef.current = setTimeout(
                      () => setClearToast(false),
                      5000
                    );
                  }}
                  disabled={selected.length === 0}
                >
                  Clear All
                </button>

                {/* NEW: compact Save Current (SVG) */}
                <button
                  className="opp__btn"
                  onClick={saveCurrentAsLook}
                  disabled={selected.length === 0}
                  title="Save Current to Saved Looks"
                  aria-label="Save Current"
                  style={{
                    padding: "4px 8px",
                    height: 28,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <IconSave />
                  <span style={{ fontSize: 12 }}>Save</span>
                </button>

                {/* NEW: compact Print (SVG) */}
                <button
                  className="opp__btn"
                  onClick={handlePrintCard}
                  disabled={selected.length === 0}
                  title="Print Outfit"
                  aria-label="Print Outfit"
                  style={{
                    padding: "4px 8px",
                    height: 28,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <IconPrint />
                  <span style={{ fontSize: 12 }}>Print</span>
                </button>

                {/* Share bar — share buttons left, note right */}
                <div className="opp__share-bar">
                  <div className="opp__share-btns">
                    <button
                      className="opp__btn"
                      onClick={() => handleShare(false)}
                      disabled={selected.length === 0 || sharing}
                      title="Share outfit (view only)"
                    >
                      {sharing ? "Sharing…" : "Share Outfit (View Only)"}
                    </button>
                    <button
                      className="opp__btn opp__btn--edit"
                      onClick={() => handleShare(true)}
                      disabled={selected.length === 0 || sharing}
                      title="Share outfit with edit access (for WIMC users)"
                    >
                      ✏️ Share + Edit
                    </button>
                  </div>
                  <input
                    type="text"
                    className="opp__share-note"
                    placeholder="Add a note for the recipient, when sharing (optional)…"
                    value={note}
                    onChange={(e) => {
                      setNote(e.target.value);
                      commitHistory(selected, e.target.value);
                    }}
                  />
                </div>
              </div>

              {(shareStatus || shareError || shareSmsHref) && (
                <div
                  ref={shareRowRef}
                  className="opp__share"
                  aria-live="polite"
                >
                  {shareStatus && <span className="opp__share-status">{shareStatus}</span>}
                  {shareSmsHref && (
                    <a href={shareSmsHref} className="opp__btn" style={{ textDecoration: "none" }}>
                      📱 Text
                    </a>
                  )}
                  {shareError && <span className="opp__error">{shareError}</span>}
                </div>
              )}

              {/* Clear-all undo toast */}
              {clearToast && (
                <div className="opp__clear-toast" role="alert">
                  <span>Canvas cleared.</span>
                  <button
                    className="opp__btn"
                    onClick={() => {
                      doUndo();
                      setClearToast(false);
                    }}
                  >
                    Undo
                  </button>
                  <button
                    className="opp__btn opp__clear-toast__dismiss"
                    onClick={() => setClearToast(false)}
                    aria-label="Dismiss"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Canvas */}
              <div className="opp__canvas">
                {selected.length === 0 ? (
                  <div className="opp__hint">
                    No items yet — choose from below.
                  </div>
                ) : (
                  <>
                    <div
                      className="opp__selected-grid"
                      ref={gridRef}
                      style={gridStyle}
                      role="list"
                      aria-label="Selected items"
                    >
                      {selected.map((it, i) => {
                        const key = keyOf(it);
                        const nameShown = nameVisibleKeys.has(key);
                        return (
                          <figure
                            key={`${it.mediaUrl}-${i}`}
                            data-idx={i}
                            className={
                              "opp__thumb" +
                              (dragOverIndex === i ? " is-drag-over" : "") +
                              (dragIndex === i ? " is-dragging" : "")
                            }
                            tabIndex={0}
                            onKeyDown={onTileKeyDown(i)}
                            draggable
                            onDragStart={handleDragStart(i)}
                            onDragOver={handleDragOver(i)}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop(i)}
                            onDragEnd={handleDragEnd}
                            aria-grabbed={dragIndex === i}
                            role="listitem"
                          >
                            {it.mediaType === "video" ? (
                              <video
                                className="opp__thumb-vid"
                                controls
                                preload="metadata"
                                poster={it.mediaPoster || ""}
                              >
                                <source src={it.mediaUrl} />
                              </video>
                            ) : (
                              <img
                                className="opp__thumb-img opp__thumb-img--zoomable"
                                src={it.mediaThumb || it.mediaUrl}
                                onError={(e) => onImgError(e, it)}
                                alt={it.name || "Selected"}
                                title="Click to enlarge"
                                onClick={() => {
                                  const imgs = selected
                                    .filter((x) => x.mediaType !== "video")
                                    .map((x) => ({ src: x.mediaThumb || x.mediaUrl, alt: x.name || "" }));
                                  const imgIdx = selected
                                    .filter((x) => x.mediaType !== "video")
                                    .indexOf(it);
                                  openLightbox(imgs, Math.max(0, imgIdx));
                                }}
                              />
                            )}

                            {/* remove (top-right) */}
                            <button
                              className="opp__remove"
                              onClick={() => removeItem(i)}
                              aria-label="Remove"
                              type="button"
                            >
                              🗑️
                            </button>

                            {/* favorite (bottom-right) */}
                            <button
                              type="button"
                              className={
                                "opp__fav-btn" +
                                (existsIn(favorites, it) ? " is-faved" : "")
                              }
                              title={
                                existsIn(favorites, it)
                                  ? "Unfavorite"
                                  : "Add to favorites"
                              }
                              onClick={() => toggleFavorite(it)}
                            >
                              ★
                            </button>

                            {/* name toggle (bottom-left) */}
                            <button
                              type="button"
                              className="opp__name-toggle"
                              title={nameShown ? "Hide name" : "Show name"}
                              onClick={() => toggleNameFor(it)}
                            >
                              i
                            </button>

                            {/* name badge (clamped) */}
                            {nameShown && (
                              <div
                                className="opp__name-badge"
                                title={it.name || ""}
                              >
                                {it.name || " "}
                              </div>
                            )}

                            {/* drag handle */}
                            <span
                              className="opp__drag-handle"
                              title="Drag to reorder"
                            >
                              ⋮⋮
                            </span>
                          </figure>
                        );
                      })}
                    </div>

                  </>
                )}
              </div>

              {/* Picker */}
              <div className="opp__picker">
                <h4 className="opp__picker-title">
                  {SECTION_OPTIONS.find((o) => o.value === section)?.label}
                </h4>
                {loading ? (
                  <div className="opp__loading">Loading…</div>
                ) : error ? (
                  <div className="opp__error">{error}</div>
                ) : choices.length === 0 ? (
                  <div className="opp__empty">No items found.</div>
                ) : (
                  <div className="opp__choices">
                    {choices.map((it, i) => (
                      <div
                        key={`${it.mediaUrl}-${i}`}
                        className="opp__choice"
                        onClick={() => addItem(it)}
                        title="Add to preview"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            addItem(it);
                          }
                        }}
                      >
                        {it.mediaType === "video" ? (
                          <div className="opp__choice-vidwrap">
                            <img
                              className="opp__choice-img"
                              src={it.mediaPoster || ""}
                              alt="video poster"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                            <span className="opp__pill">Video</span>
                          </div>
                        ) : (
                          <img
                            className="opp__choice-img"
                            src={it.mediaThumb || it.mediaUrl}
                            alt="item"
                            onError={(e) => (e.currentTarget.src = it.mediaUrl)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          </>
        )}
      </section>
    </>
  );
}
