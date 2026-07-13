import { syncSetItem } from '../../utils/syncStore';
import React, { useEffect, useRef, useState } from "react";
import Lightbox from "../Lightbox/Lightbox";
import { uploadRawJSON, uploadImage } from "../../utils/CloudinaryAPI";
import { appShareUrl, createCollabDoc, shareAppLink } from "../../utils/shareUtils";
import { fetchLinkPreview } from "../../utils/linkPreview";
import { extractSections } from "../../utils/outfitBuilder";
import ImageUpload from "../ImageUpload/ImageUpload"; // uses your existing widget
import "./WishList.css";

// Unisex closet: one fixed 8-option list, same for everyone — same
// shape/convention as Donate Bin's getSectionOptions.
function getSectionOptions() {
  return [
    { value: "dresses-skirts", label: "Dresses/Skirts" },
    { value: "dress-shirts-suits", label: "Dress Shirts/Suits" },
    { value: "shoes-sneakers", label: "Shoes/Sneakers" },
    { value: "pants-jeans", label: "Pants/Jeans" },
    { value: "tops", label: "Tops" },
    { value: "bags-accessories", label: "Bags/Accessories" },
    { value: "jackets-coats", label: "Jackets/Coats" },
    { value: "blazers", label: "Blazers" },
  ];
}

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

export default function WishList({ storageKey, tagPrefix = "", sectionOptions = null }) {
  // storageKey lets kids closets keep their own wish lists separate from the
  // parent's main list.  Falls back to the original key for backward-compat.
  const lsItemsKey = storageKey ? `${storageKey}_items`      : "wishListItems";
  const lsListsKey = storageKey ? `${storageKey}_savedLists` : "wimc_saved_wishlists";
  const lsMovedKey = storageKey ? `${storageKey}_movedToCloset` : "wimc_wishlist_moved_to_closet";

  const SECTION_OPTIONS = sectionOptions || getSectionOptions();

  const [wishListItems, setWishListItems] = useState([]);
  const [newItem, setNewItem] = useState({
    url: "",
    name: "",
    description: "",
  });
  const [error, setError] = useState("");
  const [addAttempted, setAddAttempted] = useState(false);

  // Collapsible + modal
  const [collapsed, setCollapsed] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const toggleCollapsed = () => setCollapsed((c) => !c);
  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  // Share (current list)
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState(""); // eslint-disable-line no-unused-vars
  const [shareErr, setShareErr] = useState(""); // eslint-disable-line no-unused-vars
  const [shareIsBlob, setShareIsBlob] = useState(false); // eslint-disable-line no-unused-vars
  const [shareMsg, setShareMsg] = useState("");
  const [smsHref, setSmsHref] = useState(""); // eslint-disable-line no-unused-vars
  const [shareNote, setShareNote] = useState("");
  const shareRowRef = useRef(null);

  // Saved lists drawer
  const [savedLists, setSavedLists] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(lsListsKey) || "[]");
    } catch {
      return [];
    }
  });
  const [listsOpen, setListsOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [listsStatus, setListsStatus] = useState("");
  const [listsShareUrl, setListsShareUrl] = useState("");
  const [listsShareErr, setListsShareErr] = useState("");
  const [listsShareIsBlob, setListsShareIsBlob] = useState(false); // eslint-disable-line no-unused-vars
  const [listsSharing, setListsSharing] = useState(false);

  // Inline preview for URL (OpenGraph/oEmbed via helper)
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewAbortRef = useRef(null);

  // Per-item name visibility toggle
  const [nameVisibleIds, setNameVisibleIds] = useState(() => new Set());

  // Inline item editor
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({ name: "", description: "" });

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditDraft({ name: item.name || "", description: item.description || "" });
  };
  const saveEdit = () => {
    setWishListItems((prev) => {
      const next = prev.map((it) =>
        it.id === editingId ? { ...it, name: editDraft.name, description: editDraft.description } : it
      );
      syncSetItem(lsItemsKey, JSON.stringify(next));
      return next;
    });
    setEditingId(null);
  };
  const cancelEdit = () => setEditingId(null);

  // Lightbox
  const [lbImages, setLbImages] = useState([]);
  const [lbIndex, setLbIndex] = useState(0);
  const openLb = (imgs, idx) => { setLbImages(imgs); setLbIndex(idx); };
  const closeLb = () => setLbImages([]);

  useEffect(() => {
    const savedItems = JSON.parse(localStorage.getItem(lsItemsKey)) || [];
    setWishListItems(savedItems);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced preview on URL input
  useEffect(() => {
    if (!newItem.url) {
      setPreview(null);
      return;
    }
    const ctrl = new AbortController();
    previewAbortRef.current = ctrl;

    const t = setTimeout(async () => {
      try {
        setPreviewLoading(true);
        const data = await fetchLinkPreview(newItem.url);
        if (!ctrl.signal.aborted) setPreview(data);
      } catch {
        if (!ctrl.signal.aborted) setPreview(null);
      } finally {
        if (!ctrl.signal.aborted) setPreviewLoading(false);
      }
    }, 350);

    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newItem.url]);

  const persistLists = (next) => {
    setSavedLists(next);
    try {
      syncSetItem(lsListsKey, JSON.stringify(next));
    } catch {}
  };

  const handleInputChange = (e) =>
    setNewItem({ ...newItem, [e.target.name]: e.target.value });

  const pushItems = (items) => {
    setWishListItems((prev) => {
      const next = [...prev, ...items];
      syncSetItem(lsItemsKey, JSON.stringify(next));
      return next;
    });
  };

  const handleAddItem = () => {
    setAddAttempted(true);
    if (!newItem.url && !newItem.name && !newItem.description) {
      setError(
        "Please fill in at least one field (URL, name, or description).",
      );
      return;
    }
    setError("");

    const id = Date.now().toString();
    const enriched = {
      id,
      url: newItem.url || "",
      name: newItem.name || preview?.title || "",
      description: newItem.description || preview?.description || "",
      image: preview?.image || "",
      siteName: preview?.siteName || "",
    };
    pushItems([enriched]);
    setNewItem({ url: "", name: "", description: "" });
    setPreview(null);
  };

  const handleRemoveItem = (index) => {
    const updated = wishListItems.filter((_, i) => i !== index);
    setWishListItems(updated);
    syncSetItem(lsItemsKey, JSON.stringify(updated));
  };

  // ── Move to Closet ("I got it!") ─────────────────────────────────────────
  // Uploads the item's image into the chosen closet section, then moves the
  // item out of the Wish List into a small "Moved to Closet" history list
  // (mirrors Donate Bin's donated-items pattern) rather than deleting it
  // with no trace.
  const [movedItems, setMovedItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(lsMovedKey) || "[]"); } catch { return []; }
  });
  const [movedOpen, setMovedOpen] = useState(false);
  const persistMoved = (list) => {
    setMovedItems(list);
    try { syncSetItem(lsMovedKey, JSON.stringify(list)); } catch {}
  };
  const deleteMovedItem = (idx) =>
    persistMoved(movedItems.filter((_, i) => i !== idx));

  // movingContext identifies WHICH item is mid-move: { itemId, listId (null
  // for the live wish list) } — lets the same popover/handlers work whether
  // the item lives in the live grid or inside a Saved List.
  const [movingContext, setMovingContext] = useState(null);
  const [moveTargetTag, setMoveTargetTag] = useState("");
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState("");

  const startMove = (item, listId = null) => {
    const guess = extractSections(`${item.name || ""} ${item.description || ""}`)[0];
    setMovingContext({ itemId: item.id, listId });
    setMoveTargetTag(guess?.tag || SECTION_OPTIONS[0].value);
    setMoveError("");
  };
  const cancelMove = () => {
    setMovingContext(null);
    setMoveError("");
  };

  const confirmMove = async (item, onRemove) => {
    const src = item.image || item.url;
    if (!src) return;
    setMoving(true);
    setMoveError("");
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const fullTag = tagPrefix ? `${tagPrefix}-${moveTargetTag}` : moveTargetTag;
      const uploaded = await uploadImage(blob, fullTag);
      if (!uploaded?.secure_url) throw new Error("Upload failed");

      const label = SECTION_OPTIONS.find((o) => o.value === moveTargetTag)?.label || moveTargetTag;
      persistMoved([
        { id: item.id, name: item.name || "", image: uploaded.secure_url, sectionLabel: label, movedAt: new Date().toISOString() },
        ...movedItems,
      ]);
      onRemove();
      setMovingContext(null);
    } catch (e) {
      // Many retailer image CDNs block cross-origin fetch (CORS) even though
      // the browser can display the image fine — a common, expected failure
      // for URL-based wish items, not a bug to "fix" client-side.
      setMoveError(
        "Couldn't fetch that image to move it (the site may block this). Try saving the photo to your device and re-uploading it to the Wish List, then move it from there."
      );
    } finally {
      setMoving(false);
    }
  };

  // Toggle caption/name visibility
  const toggleNameFor = (id) => {
    setNameVisibleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ImageUpload → add uploaded asset to list
  const onUploadSuccess = (info) => {
    const id = (Date.now() + Math.random()).toString(36);
    const item = {
      id,
      url: info.secure_url || info.url || "",
      name: (info.original_filename || "").replace(/[_-]+/g, " "),
      description: "",
      image: info.secure_url || info.url || "",
      siteName: info.resource_type || "Upload",
    };
    pushItems([item]);
  };

  // Save / Drawer actions
  const saveCurrentWishList = () => {
    if (!wishListItems.length) return;
    const now = new Date().toISOString();
    const name =
      (newListName || "").trim() ||
      `Wish List ${String((savedLists?.length || 0) + 1).padStart(2, "0")}`;
    const entry = {
      id: now,
      name,
      createdAt: now,
      updatedAt: now,
      items: wishListItems.map((it) => ({ ...it })),
    };
    const next = [...(savedLists || []), entry];
    persistLists(next);
    setNewListName("");
    setListsOpen(true);
    setListsStatus("saved");
    setTimeout(() => setListsStatus(""), 1200);
  };
  const renameList = (id, name) =>
    persistLists(
      (savedLists || []).map((l) =>
        l.id === id ? { ...l, name, updatedAt: new Date().toISOString() } : l,
      ),
    );
  const deleteList = (id) =>
    persistLists((savedLists || []).filter((l) => l.id !== id));
  const deleteSavedListItem = (listId, itemIdx) =>
    persistLists(
      (savedLists || []).map((l) =>
        l.id === listId
          ? { ...l, items: (l.items || []).filter((_, i) => i !== itemIdx), updatedAt: new Date().toISOString() }
          : l,
      ),
    );
  const toggleReceived = (listId, itemIdx) =>
    persistLists(
      (savedLists || []).map((l) =>
        l.id === listId
          ? {
              ...l,
              items: (l.items || []).map((it, i) =>
                i === itemIdx ? { ...it, received: !it.received } : it,
              ),
            }
          : l,
      ),
    );
  const loadList = (id, mode = "replace") => {
    const l = (savedLists || []).find((x) => x.id === id);
    if (!l) return;
    const incoming = (l.items || []).map((it) => ({
      ...it,
      id: (Date.now() + Math.random()).toString(36),
    }));
    setWishListItems((prev) => {
      if (mode === "replace") {
        syncSetItem(lsItemsKey, JSON.stringify(incoming));
        return incoming;
      }
      const seen = new Set(
        prev.map((p) => (p.url || "") + "::" + (p.name || "")),
      );
      const merged = prev.slice();
      for (const it of incoming) {
        const k = (it.url || "") + "::" + (it.name || "");
        if (!seen.has(k)) {
          seen.add(k);
          merged.push(it);
        }
      }
      syncSetItem(lsItemsKey, JSON.stringify(merged));
      return merged;
    });
  };

  // Share current list
  const buildWishPayload = () => ({
    kind: "wimc.wishList",
    version: 2,
    createdAt: new Date().toISOString(),
    note: shareNote,
    count: wishListItems.length,
    items: wishListItems.map((item) => ({
      id: item.id,
      name: item.name || "",
      description: item.description || "",
      url: item.url || "",
      image: item.image || "",
      siteName: item.siteName || "",
    })),
    meta: { source: "WIMC Wish List" },
  });

  async function handleShareWishList(withEdit = false) {
    setSharing(true);
    setShareErr("");
    setShareMsg("");
    setShareUrl("");
    try {
      let url;
      if (withEdit) {
        url = await createCollabDoc("wishlist", buildWishPayload());
      } else {
        const res = await uploadRawJSON(buildWishPayload(), "wimc/wish-list");
        const cloudUrl = res?.secure_url || res?.url || res?.data?.secure_url || res?.data?.url;
        if (!cloudUrl) throw new Error("Upload failed");
        url = appShareUrl(cloudUrl, "wishlist");
      }
      const result = await shareAppLink({
        title: "My WIMC Wish List 🛍️",
        text: shareNote ? `Check out my wish list on WIMC!\n\n📝 ${shareNote}` : "Check out my wish list on WIMC!",
        url,
      });
      setShareMsg(result === "clipboard" ? "📋 Link copied!" : "✅ Shared!");
      setTimeout(() => setShareMsg(""), 3500);
    } catch {
      setShareMsg("❌ Share failed. Please try again.");
      setTimeout(() => setShareMsg(""), 3000);
    } finally {
      setSharing(false);
    }
  }
  // Share for ENTIRE saved lists
  const buildSavedWishListsPayload = () => ({
    kind: "wimc.savedWishLists",
    version: 1,
    createdAt: new Date().toISOString(),
    count: (savedLists || []).length,
    lists: (savedLists || []).map((l) => ({
      id: l.id,
      name: l.name,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
      items: (l.items || []).map((it) => ({
        id: it.id,
        name: it.name || "",
        description: it.description || "",
        url: it.url || "",
        image: it.image || "",
        siteName: it.siteName || "",
      })),
    })),
    meta: { source: "WIMC Saved Wish Lists" },
  });

  async function shareSavedWishLists() {
    setListsSharing(true);
    setListsShareErr("");
    setListsShareUrl("");
    try {
      const res = await uploadRawJSON(
        buildSavedWishListsPayload(),
        "wimc/saved-wish-lists",
      );
      const cloudUrl =
        res?.secure_url || res?.url || res?.data?.secure_url || res?.data?.url;
      if (!cloudUrl) throw new Error("Upload failed");
      const url = appShareUrl(cloudUrl, "savedwishlists");
      const result = await shareAppLink({
        title: "My WIMC Wish Lists 🛍️",
        text: "Check out my saved wish lists on WIMC!",
        url,
      });
      setListsShareUrl(result === "clipboard" ? "📋 Link copied!" : "✅ Shared!");
      setTimeout(() => setListsShareUrl(""), 3500);
    } catch {
      setListsShareErr("Share failed. Please try again.");
      setTimeout(() => setListsShareErr(""), 3000);
    } finally {
      setListsSharing(false);
    }
  }
  return (
    <>
      {/* Collapsible stub */}
      <section
        className={`wish-list ${collapsed ? "is-collapsed" : ""}`}
        aria-live="polite"
      >
        <header
          className="panel-header"
          role="button"
          tabIndex={0}
          aria-expanded={!collapsed}
          onClick={toggleCollapsed}
          onKeyDown={(e) =>
            (e.key === "Enter" || e.key === " ") && toggleCollapsed()
          }
          title="Toggle Wish List"
        >
          <h3 className="panel-title">🛍️ Wish List</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="wish-list__open-btn"
              onClick={(e) => {
                e.stopPropagation();
                openModal();
              }}
            >
              Open
            </button>
            <span className="panel-caret" aria-hidden="true">
              {collapsed ? "▸" : "▾"}
            </span>
          </div>
        </header>
        <div className="panel-body">
          <p className="wish-list__hint">
            Open to add, save, or share your wish list.
          </p>
        </div>
      </section>

      {lbImages.length > 0 && (
        <Lightbox images={lbImages} index={lbIndex} onClose={closeLb} onChange={setLbIndex} />
      )}

      {/* Floating modal */}
      {isOpen && (
        <>
          <div className="opp-backdrop" onClick={closeModal} />
          <aside
            className="wish-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Wish List"
          >
            <header className="wish-modal__head">
              <h4 className="wish-modal__title">🛍️ Wish List</h4>
              <div className="wish-modal__actions">
                <ImageUpload
                  folder="wimc/wish-list"
                  tag="wishlist"
                  onUploadSuccess={onUploadSuccess}
                />
                <button
                  className="wish-modal__btn"
                  onClick={saveCurrentWishList}
                  title="Save current list"
                  aria-label="Save"
                >
                  <IconSave />
                </button>
                <button
                  className="wish-modal__btn"
                  onClick={() => setListsOpen(true)}
                  title="Open Saved Wish Lists"
                >
                  Saved Lists
                </button>
                <button
                  className="wish-modal__btn"
                  onClick={() => setMovedOpen(true)}
                  title="Items you've moved to your closet"
                >
                  👕 Moved to Closet{movedItems.length ? ` (${movedItems.length})` : ""}
                </button>
              </div>
              <button className="wish-modal__btn wish-modal__close" onClick={closeModal} aria-label="Close">
                ✕
              </button>
            </header>

            {/* Share bar — share buttons left, note right */}
            <div className="wish-modal__share-bar">
              <div className="wish-modal__share-btns">
                <button
                  className="wish-modal__share-btn"
                  onClick={() => handleShareWishList(false)}
                  disabled={sharing}
                  title="Share Wish List (view only)"
                >
                  {sharing ? "Sharing…" : "Share (View Only)"}
                </button>
                <button
                  className="wish-modal__share-btn wish-modal__share-btn--edit"
                  onClick={() => handleShareWishList(true)}
                  disabled={sharing}
                  title="Share Wish List with edit access"
                >
                  ✏️ Share + Edit
                </button>
              </div>
              <input
                type="text"
                className="wish-modal__share-note"
                placeholder="Add a note for the recipient, when sharing (optional)…"
                value={shareNote}
                onChange={(e) => setShareNote(e.target.value)}
              />
            </div>

            {(shareMsg || smsHref) && (
              <div
                ref={shareRowRef}
                className="wish-modal__share"
                aria-live="polite"
              >
                {shareMsg && <span className="wish-modal__ok">{shareMsg}</span>}
                {smsHref && (
                  <a href={smsHref} className="wish-modal__btn" style={{ textDecoration: "none" }}>
                    📱 Text
                  </a>
                )}
              </div>
            )}

            {/* Screenshot tip */}
            <div className="wish-modal__tip">
              💡 <strong>Tip:</strong> If an item fails to upload from a retailer's website, take a screenshot of the item and upload it as a file instead.
            </div>

            <div className="wish-modal__body">
              {/* Canvas */}
              <div className={`wish-canvas${wishListItems.length === 0 ? " wish-canvas--empty" : ""}`}>
                {wishListItems.length === 0 ? (
                  <div className="wish-canvas__hint">
                    No items yet — paste a link, upload, or add from the left.
                  </div>
                ) : (
                  <div className="wish-grid">
                    {wishListItems.map((item, index) => {
                      const nameShown = nameVisibleIds.has(item.id);
                      const isImg = (item.image || item.url || "").match(
                        /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i,
                      );
                      const src = item.image || (isImg ? item.url : "");
                      const canvasImgs = wishListItems
                        .filter(it => it.image || (it.url || "").match(/\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i))
                        .map(it => ({ src: it.image || it.url, alt: it.name || "" }));
                      const imgIdx = canvasImgs.findIndex(ci => ci.src === src);
                      return (
                        <figure key={item.id} className="wish-thumb">
                          {src ? (
                            <img
                              className="wish-thumb__img"
                              src={src}
                              alt={item.name || "wish item"}
                              loading="lazy"
                              style={{ cursor: "zoom-in" }}
                              title="Click to enlarge"
                              onClick={() => openLb(canvasImgs, Math.max(0, imgIdx))}
                            />
                          ) : (
                            <div className="wish-thumb__fallback">
                              <div className="wish-thumb__title">
                                {item.name || "Item"}
                              </div>
                              {item.url ? (
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {item.url}
                                </a>
                              ) : null}
                            </div>
                          )}

                          {/* remove (top-right) */}
                          <button
                            className="wish-thumb__remove"
                            onClick={() => handleRemoveItem(index)}
                            aria-label="Remove"
                          >
                            🗑️
                          </button>

                          {/* edit description (top-left) */}
                          <button
                            type="button"
                            className="wish-thumb__edit"
                            title="Edit name / description"
                            onClick={(e) => { e.stopPropagation(); startEdit(item); }}
                          >
                            ✏️
                          </button>

                          {/* name toggle (bottom-left) */}
                          <button
                            type="button"
                            className="opp__name-toggle"
                            title={nameShown ? "Hide name" : "Show name"}
                            onClick={() => toggleNameFor(item.id)}
                          >
                            i
                          </button>

                          {/* caption (bottom overlay) */}
                          {item.name && nameShown && (
                            <figcaption
                              className="wish-thumb__cap"
                              title={item.name}
                            >
                              {item.name}
                            </figcaption>
                          )}
                        </figure>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Inline item editor */}
              {editingId && (
                <div className="wish-item-editor">
                  <h5 className="wish-item-editor__title">✏️ Edit Item</h5>
                  <label className="wish-item-editor__label">Name</label>
                  <input
                    className="wish-item-editor__input"
                    type="text"
                    placeholder="Item name…"
                    value={editDraft.name}
                    onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                  />
                  <label className="wish-item-editor__label">Description</label>
                  <input
                    type="text"
                    className="wish-item-editor__textarea"
                    placeholder="Add a description, size, colour, or any notes…"
                    value={editDraft.description}
                    onChange={(e) => setEditDraft((d) => ({ ...d, description: e.target.value }))}
                  />
                  <div className="wish-item-editor__actions">
                    <button className="wish-modal__btn" onClick={cancelEdit}>Cancel</button>
                    <button className="wish-modal__btn wish-modal__btn--save" onClick={saveEdit}>Save</button>
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Saved Wish Lists Drawer */}
          {listsOpen && (
            <div
              className="opp-saved__backdrop"
              onClick={() => setListsOpen(false)}
              aria-label="Close Saved Wish Lists"
            >
              <aside
                className="opp-saved"
                role="dialog"
                aria-modal="true"
                aria-label="Saved Wish Lists"
                onClick={(e) => e.stopPropagation()}
              >
                <header className="opp-saved__head">
                  <h4 className="opp-saved__title">Saved Wish Lists</h4>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input
                      className="opp__input"
                      type="text"
                      placeholder="New list name…"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      style={{ minWidth: 160 }}
                    />
                    <button
                      className="opp__btn"
                      onClick={saveCurrentWishList}
                      disabled={!wishListItems.length}
                      title="Save current list"
                    >
                      Save Current
                    </button>
                    {listsStatus === "saved" && (
                      <span className="opp__badge">Saved!</span>
                    )}

                    {/* Entire collection share */}
                    <button
                      className="opp__btn"
                      onClick={shareSavedWishLists}
                      disabled={listsSharing || !savedLists.length}
                      title="Share all Saved Wish Lists"
                    >
                      {listsSharing ? "Sharing…" : "Share"}
                    </button>

                    <button
                      className="opp__btn"
                      onClick={() => setListsOpen(false)}
                      aria-label="Close"
                    >
                      ✕
                    </button>
                  </div>
                </header>

                {(listsShareUrl || listsShareErr) && (
                  <div
                    className="opp__share"
                    style={{ padding: "0 10px" }}
                    aria-live="polite"
                  >
                    {listsShareUrl && (
                      <span className="opp__badge">{listsShareUrl}</span>
                    )}
                    {listsShareErr && (
                      <span className="opp__error">{listsShareErr}</span>
                    )}
                  </div>
                )}

                <div className="opp-saved__content">
                  {!savedLists || savedLists.length === 0 ? (
                    <div className="opp__empty" style={{ padding: 12 }}>
                      No saved wish lists yet
                    </div>
                  ) : (
                    <div className="opp__looks-list">
                      {savedLists.map((l) => (
                        <div key={l.id} className="opp__look">
                          <div className="opp__look-head">
                            <input
                              className="opp__look-name"
                              value={l.name}
                              onChange={(e) => renameList(l.id, e.target.value)}
                              title="Rename list"
                            />
                            <div className="opp__look-actions">
                              <button
                                className="opp__mini"
                                onClick={() => loadList(l.id, "replace")}
                                title="Replace current list"
                              >
                                Load
                              </button>
                              <button
                                className="opp__mini"
                                onClick={() => loadList(l.id, "merge")}
                                title="Merge with current list"
                              >
                                Merge
                              </button>
                              <button
                                className="opp__mini opp__danger"
                                onClick={() => deleteList(l.id)}
                                title="Delete list"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                          <div className="opp__look-strip">
                            {(l.items || []).slice(0, 10).map((it, i) => {
                              const hasImg = it.image || it.url?.match(/\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i);
                              const listImgs = (l.items || []).filter(x => x.image || x.url?.match(/\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i)).map(x => ({ src: x.image || x.url, alt: x.name || "" }));
                              const imgIdx = listImgs.findIndex(ci => ci.src === (it.image || it.url));
                              const isMoving = movingContext?.listId === l.id && movingContext?.itemId === it.id;
                              return (
                              <span key={(it.url || "thumb") + i} className="donate-thumb-wrap wish-saved-thumb-wrap">
                                <div
                                  className="opp__look-thumb wish-saved-thumb"
                                  style={{ display: "grid", placeItems: "center", fontSize: 10, cursor: hasImg ? "zoom-in" : "default" }}
                                  onClick={() => hasImg && openLb(listImgs, Math.max(0, imgIdx))}
                                >
                                  {hasImg ? (
                                    <img
                                      src={it.image || it.url}
                                      alt={it.name || "item"}
                                      style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 6 }}
                                    />
                                  ) : (
                                    it.name || "item"
                                  )}
                                </div>

                                {/* Received checkbox — check once acquired to
                                    reveal the Move-to-Closet action */}
                                <input
                                  type="checkbox"
                                  checked={!!it.received}
                                  onChange={() => toggleReceived(l.id, i)}
                                  title="Mark as received"
                                  style={{ position: "absolute", top: 4, left: 4, accentColor: "#16a34a" }}
                                />

                                <button
                                  className="donate-thumb-del"
                                  style={{ left: "auto", right: 2, opacity: 1 }}
                                  onClick={(e) => { e.stopPropagation(); deleteSavedListItem(l.id, i); }}
                                  title="Remove from this list"
                                  aria-label="Remove from this list"
                                >
                                  🗑️
                                </button>

                                {it.received && hasImg && (
                                  <button
                                    type="button"
                                    className="wish-thumb__move"
                                    style={{ opacity: 1, bottom: 4, right: 4 }}
                                    title="Move to your closet"
                                    onClick={(e) => { e.stopPropagation(); startMove(it, l.id); }}
                                  >
                                    👕
                                  </button>
                                )}

                                {isMoving && (
                                  <div className="wish-move-popover" onClick={(e) => e.stopPropagation()}>
                                    <p className="wish-move-popover__title">Move to closet section:</p>
                                    <select
                                      className="wish-move-popover__select"
                                      value={moveTargetTag}
                                      onChange={(e) => setMoveTargetTag(e.target.value)}
                                    >
                                      {SECTION_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                      ))}
                                    </select>
                                    {moveError && <p className="wish-move-popover__error">{moveError}</p>}
                                    <div className="wish-move-popover__actions">
                                      <button
                                        className="wish-move-popover__btn wish-move-popover__btn--primary"
                                        onClick={() => confirmMove(it, () => deleteSavedListItem(l.id, i))}
                                        disabled={moving}
                                      >
                                        {moving ? "Moving…" : "Confirm"}
                                      </button>
                                      <button className="wish-move-popover__btn" onClick={cancelMove} disabled={moving}>
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                )}
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

          {/* Moved to Closet Drawer */}
          {movedOpen && (
            <div
              className="opp-saved__backdrop"
              onClick={() => setMovedOpen(false)}
              aria-label="Close Moved to Closet"
            >
              <aside
                className="opp-saved"
                role="dialog"
                aria-modal="true"
                aria-label="Moved to Closet"
                onClick={(e) => e.stopPropagation()}
              >
                <header className="opp-saved__head">
                  <h4 className="opp-saved__title">
                    👕 Moved to Closet
                  </h4>
                  <button className="opp__btn" onClick={() => setMovedOpen(false)} aria-label="Close">
                    ✕
                  </button>
                </header>
                <div className="opp-saved__content">
                  {!movedItems.length ? (
                    <p className="sl-ai-hint">
                      Items you move here from your Wish List (once you've acquired them) will show up here as a record.
                    </p>
                  ) : (
                    <div className="opp__look-strip">
                      {movedItems.map((m, i) => {
                        const movedImgs = movedItems
                          .filter((x) => x.image)
                          .map((x) => ({ src: x.image, alt: x.name || "" }));
                        const imgIdx = movedImgs.findIndex((im) => im.src === m.image);
                        return (
                          <span key={m.id + i} className="opp__look-thumb-wrap">
                            <img
                              className="opp__look-thumb"
                              src={m.image}
                              alt={m.name || "item"}
                              style={{ cursor: "zoom-in" }}
                              title={`${m.name || "Item"} — moved to ${m.sectionLabel}. Click to enlarge.`}
                              onClick={() => openLb(movedImgs, Math.max(0, imgIdx))}
                            />
                            <button
                              className="opp__look-thumb-del"
                              onClick={(e) => { e.stopPropagation(); deleteMovedItem(i); }}
                              title="Remove from this record"
                              aria-label="Remove from this record"
                            >
                              🗑️
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </aside>
            </div>
          )}
        </>
      )}
    </>
  );
}
