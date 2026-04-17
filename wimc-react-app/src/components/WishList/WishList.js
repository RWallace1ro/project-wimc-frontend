import React, { useEffect, useRef, useState } from "react";
import { uploadRawJSON } from "../../utils/CloudinaryAPI";
import { fetchLinkPreview } from "../../utils/linkPreview";
import ImageUpload from "../ImageUpload/ImageUpload"; // uses your existing widget
import "./WishList.css";

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

export default function WishList() {
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
  const [shareUrl, setShareUrl] = useState("");
  const [shareErr, setShareErr] = useState("");
  const [shareIsBlob, setShareIsBlob] = useState(false);
  const [shareMsg, setShareMsg] = useState("");
  const shareRowRef = useRef(null);

  // Saved lists drawer
  const [savedLists, setSavedLists] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("wimc_saved_wishlists") || "[]");
    } catch {
      return [];
    }
  });
  const [listsOpen, setListsOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [listsStatus, setListsStatus] = useState("");
  const [listsShareUrl, setListsShareUrl] = useState("");
  const [listsShareErr, setListsShareErr] = useState("");
  const [listsShareIsBlob, setListsShareIsBlob] = useState(false);
  const [listsSharing, setListsSharing] = useState(false);

  // Inline preview for URL (OpenGraph/oEmbed via helper)
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewAbortRef = useRef(null);

  // Per-item name visibility toggle
  const [nameVisibleIds, setNameVisibleIds] = useState(() => new Set());

  useEffect(() => {
    const savedItems = JSON.parse(localStorage.getItem("wishListItems")) || [];
    setWishListItems(savedItems);
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
      localStorage.setItem("wimc_saved_wishlists", JSON.stringify(next));
    } catch {}
  };

  const handleInputChange = (e) =>
    setNewItem({ ...newItem, [e.target.name]: e.target.value });

  const pushItems = (items) => {
    setWishListItems((prev) => {
      const next = [...prev, ...items];
      localStorage.setItem("wishListItems", JSON.stringify(next));
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
    localStorage.setItem("wishListItems", JSON.stringify(updated));
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
  const loadList = (id, mode = "replace") => {
    const l = (savedLists || []).find((x) => x.id === id);
    if (!l) return;
    const incoming = (l.items || []).map((it) => ({
      ...it,
      id: (Date.now() + Math.random()).toString(36),
    }));
    setWishListItems((prev) => {
      if (mode === "replace") {
        localStorage.setItem("wishListItems", JSON.stringify(incoming));
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
      localStorage.setItem("wishListItems", JSON.stringify(merged));
      return merged;
    });
  };

  // Share current list
  const buildWishPayload = () => ({
    kind: "wimc.wishList",
    version: 2,
    createdAt: new Date().toISOString(),
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

  async function handleShareWishList() {
    setSharing(true);
    setShareErr("");
    setShareMsg("");
    setShareUrl("");
    setShareIsBlob(false);
    try {
      const res = await uploadRawJSON(buildWishPayload(), "wimc/wish-list");
      const url =
        res?.secure_url || res?.url || res?.data?.secure_url || res?.data?.url;
      if (url) {
        setShareUrl(url);
        setShareMsg("Share link copied to clipboard.");
        try {
          await navigator.clipboard.writeText(url);
        } catch {}
      } else {
        const blob = new Blob([JSON.stringify(buildWishPayload(), null, 2)], {
          type: "application/json",
        });
        const local = URL.createObjectURL(blob);
        setShareUrl(local);
        setShareIsBlob(true);
        setShareErr(
          "Upload failed — using a temporary local link. Keep this tab open.",
        );
        try {
          await navigator.clipboard.writeText(local);
          setShareMsg("Temporary link copied to clipboard.");
        } catch {}
      }
    } catch {
      const blob = new Blob([JSON.stringify(buildWishPayload(), null, 2)], {
        type: "application/json",
      });
      const local = URL.createObjectURL(blob);
      setShareUrl(local);
      setShareIsBlob(true);
      setShareErr(
        "Share failed — a temporary local link was created. Keep this tab open.",
      );
      try {
        await navigator.clipboard.writeText(local);
        setShareMsg("Temporary link copied to clipboard.");
      } catch {}
    } finally {
      setSharing(false);
      setTimeout(
        () =>
          shareRowRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          }),
        0,
      );
    }
  }
  const downloadWishJson = () => {
    const blob = new Blob([JSON.stringify(buildWishPayload(), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wimc-wish-list-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Share/JSON for ENTIRE saved lists
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
    setListsShareIsBlob(false);
    setListsShareUrl("");
    try {
      const res = await uploadRawJSON(
        buildSavedWishListsPayload(),
        "wimc/saved-wish-lists",
      );
      const url =
        res?.secure_url || res?.url || res?.data?.secure_url || res?.data?.url;
      if (url) {
        setListsShareUrl(url);
        try {
          await navigator.clipboard.writeText(url);
        } catch {}
      } else {
        const blob = new Blob(
          [JSON.stringify(buildSavedWishListsPayload(), null, 2)],
          { type: "application/json" },
        );
        const local = URL.createObjectURL(blob);
        setListsShareUrl(local);
        setListsShareIsBlob(true);
        setListsShareErr(
          "Upload failed — temporary local link created. Keep this tab open.",
        );
        try {
          await navigator.clipboard.writeText(local);
        } catch {}
      }
    } catch {
      const blob = new Blob(
        [JSON.stringify(buildSavedWishListsPayload(), null, 2)],
        { type: "application/json" },
      );
      const local = URL.createObjectURL(blob);
      setListsShareUrl(local);
      setListsShareIsBlob(true);
      setListsShareErr(
        "Share failed — temporary local link created. Keep this tab open.",
      );
      try {
        await navigator.clipboard.writeText(local);
      } catch {}
    } finally {
      setListsSharing(false);
    }
  }
  const downloadSavedWishListsJson = () => {
    const blob = new Blob(
      [JSON.stringify(buildSavedWishListsPayload(), null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wimc-saved-wish-lists-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
          <h3 className="panel-title">Wish List</h3>
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
              <h4 className="wish-modal__title">Wish List</h4>
              <div className="wish-modal__actions">
                {/* Upload: files, camera, social via Cloudinary widget config */}
                <ImageUpload
                  folder="wimc/wish-list"
                  tag="wishlist"
                  onUploadSuccess={onUploadSuccess}
                />

                <button
                  className="wish-modal__btn"
                  onClick={handleAddItem}
                  title="Add to Wish List"
                >
                  Add to Wish List
                </button>
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
                  Saved Wish Lists
                </button>
                <button
                  className="wish-modal__btn"
                  onClick={handleShareWishList}
                  disabled={sharing}
                  title="Share Wish List"
                >
                  {sharing ? "Sharing…" : "Share"}
                </button>
                <button
                  className="wish-modal__btn"
                  onClick={downloadWishJson}
                  title="Download JSON"
                >
                  JSON
                </button>
                <button className="wish-modal__btn" onClick={closeModal}>
                  Close
                </button>
              </div>
            </header>

            {(shareUrl || shareErr || shareMsg) && (
              <div
                ref={shareRowRef}
                className="wish-modal__share"
                aria-live="polite"
              >
                {shareUrl ? (
                  <a
                    className="wish-modal__link"
                    href={shareUrl}
                    target={shareIsBlob ? "_self" : "_blank"}
                    rel={shareIsBlob ? undefined : "noopener noreferrer"}
                  >
                    {shareIsBlob ? "Open local share URL" : "Open shared list"}
                  </a>
                ) : null}
                {shareMsg && <span className="wish-modal__ok">{shareMsg}</span>}
                {shareErr && (
                  <span className="wish-modal__err">{shareErr}</span>
                )}
              </div>
            )}

            <div className="wish-modal__body">
              {/* Inputs + inline preview */}
              <form
                className="wish-list__form"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddItem();
                }}
              >
                <label htmlFor="url">Item URL (auto-preview):</label>
                <input
                  id="url"
                  type="url"
                  name="url"
                  placeholder="https://example.com/item"
                  value={newItem.url}
                  onChange={handleInputChange}
                />

                {previewLoading && (
                  <div className="wish-preview">Looking up preview…</div>
                )}
                {!previewLoading &&
                  preview &&
                  (preview.title || preview.image) && (
                    <div className="wish-preview">
                      {preview.image ? (
                        <img
                          className="wish-preview__img"
                          src={preview.image}
                          alt={preview.title || "preview"}
                        />
                      ) : null}
                      <div className="wish-preview__meta">
                        <div className="wish-preview__title">
                          {preview.title || " "}
                        </div>
                        <div className="wish-preview__desc">
                          {preview.description || " "}
                        </div>
                        <div className="wish-preview__site">
                          {preview.siteName || ""}
                        </div>
                      </div>
                    </div>
                  )}

                <label htmlFor="name">Item Name (Optional):</label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  placeholder="Enter item name"
                  value={newItem.name}
                  onChange={handleInputChange}
                />
                <label htmlFor="description">
                  Item Description (Optional):
                </label>
                <textarea
                  id="description"
                  name="description"
                  placeholder="Enter item description"
                  value={newItem.description}
                  onChange={handleInputChange}
                />
                {addAttempted && error && (
                  <p className="wish-list__error">{error}</p>
                )}
              </form>

              {/* Canvas */}
              <div className="wish-canvas">
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
                      return (
                        <figure key={item.id} className="wish-thumb">
                          {src ? (
                            <img
                              className="wish-thumb__img"
                              src={src}
                              alt={item.name || "wish item"}
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
                            ×
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
            </div>
          </aside>

          {/* Saved Wish Lists Drawer */}
          {listsOpen && (
            <>
              <div
                className="opp-saved__backdrop"
                onClick={() => setListsOpen(false)}
                aria-label="Close Saved Wish Lists"
              />
              <aside
                className="opp-saved"
                role="dialog"
                aria-modal="true"
                aria-label="Saved Wish Lists"
              >
                <header
                  className="opp-saved__head"
                  style={{
                    position: "sticky",
                    top: 0,
                    background: "#fff",
                    zIndex: 2,
                  }}
                >
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

                    {/* Entire collection share/JSON */}
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
                      onClick={downloadSavedWishListsJson}
                      disabled={!savedLists.length}
                      title="Download all Saved Wish Lists JSON"
                    >
                      JSON
                    </button>

                    <button
                      className="opp__btn"
                      onClick={() => setListsOpen(false)}
                    >
                      Close
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
                      <a
                        className="opp__share-link"
                        href={listsShareUrl}
                        target={listsShareIsBlob ? "_self" : "_blank"}
                        rel={
                          listsShareIsBlob ? undefined : "noopener noreferrer"
                        }
                      >
                        {listsShareIsBlob
                          ? "Open local share URL"
                          : "Open shared Saved Wish Lists"}
                      </a>
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
                            {(l.items || []).slice(0, 10).map((it, i) => (
                              <div
                                key={(it.url || "thumb") + i}
                                className="opp__look-thumb"
                                style={{
                                  display: "grid",
                                  placeItems: "center",
                                  fontSize: 10,
                                }}
                              >
                                {it.image ||
                                it.url?.match(
                                  /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i,
                                ) ? (
                                  <img
                                    src={it.image || it.url}
                                    alt={it.name || "item"}
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      objectFit: "cover",
                                      borderRadius: 6,
                                    }}
                                  />
                                ) : (
                                  it.name || "item"
                                )}
                              </div>
                            ))}
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
            </>
          )}
        </>
      )}
    </>
  );
}
