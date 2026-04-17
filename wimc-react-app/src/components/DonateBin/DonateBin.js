import React, { useEffect, useState, useMemo } from "react";
import {
  uploadRawJSON,
  fetchImagesByTag,
  fetchVideosByTag,
  videoPoster,
} from "../../utils/CloudinaryAPI";
import "./DonateBin.css";

const SECTION_OPTIONS = [
  { value: "dresses-skirts", label: "Dresses/Skirts" },
  { value: "shoes-sneakers", label: "Shoes/Sneakers" },
  { value: "pants-jeans", label: "Pants/Jeans" },
  { value: "tops", label: "Tops" },
  { value: "bags-accessories", label: "Bags/Accessories" },
  { value: "jackets-coats", label: "Jackets/Coats" },
];

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

// ---------- helpers ----------
function ensureHttps(u) {
  return u?.startsWith("//") ? "https:" + u : u;
}
function isVideoUrl(u = "") {
  return /\.(mp4|mov|webm|mkv|m4v)(\?.*)?$/i.test(u);
}
function normalizeChoice(x, sectionHint) {
  const to = (url) =>
    url?.replace("/upload/", "/upload/f_auto,q_auto,w_600,c_limit/");
  if (typeof x === "string") {
    const url = ensureHttps(x);
    const v = isVideoUrl(url);
    return {
      mediaType: v ? "video" : "image",
      mediaUrl: url,
      mediaPoster: v ? videoPoster(url) : "",
      mediaThumb: !v ? to(url) : "",
      name: (url.split("/").pop() || "").split(".")[0].replace(/[_-]+/g, " "),
      section: sectionHint,
    };
  }
  const url = ensureHttps(x.mediaUrl || x.url || x.imageUrl || "");
  const v = isVideoUrl(url);
  return {
    mediaType: x.mediaType || (v ? "video" : "image"),
    mediaUrl: url,
    mediaPoster: x.mediaPoster || (v ? videoPoster(url) : ""),
    mediaThumb: x.mediaThumb || (!v ? to(url) : ""),
    name: x.name || "",
    section: x.section || sectionHint,
  };
}
const keyOf = (it) => it.imageUrl || it.url || it.mediaUrl || it.name || "";

// ---------- component ----------
export default function DonateBin() {
  // inline stub (doesn’t push footer)
  const [collapsed, setCollapsed] = useState(true);
  const toggleCollapsed = () => setCollapsed((c) => !c);

  // floating donate panel
  const [isOpen, setIsOpen] = useState(false);

  // canvas & history
  const [donateItems, setDonateItems] = useState([]);
  const [donatedItems, setDonatedItems] = useState([]);

  // closet rail
  const [section, setSection] = useState(SECTION_OPTIONS[0].value);
  const [choices, setChoices] = useState([]);
  const [choicesLoading, setChoicesLoading] = useState(false);
  const [choicesError, setChoicesError] = useState("");

  // share current bin
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareErr, setShareErr] = useState("");
  const [shareIsBlob, setShareIsBlob] = useState(false);

  // name toggle (per-item)
  const [nameVisibleKeys, setNameVisibleKeys] = useState(() => new Set());
  const toggleNameFor = (it) => {
    const k = keyOf(it);
    setNameVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  // saved sets
  const [sets, setSets] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("wimc_donation_sets") || "[]");
    } catch {
      return [];
    }
  });
  const [setsOpen, setSetsOpen] = useState(false);
  const [newSetName, setNewSetName] = useState("");
  const [setsStatus, setSetsStatus] = useState("");
  const [setsSharing, setSetsSharing] = useState(false);
  const [setsShareUrl, setSetsShareUrl] = useState("");
  const [setsShareErr, setSetsShareErr] = useState("");
  const [setsShareIsBlob, setSetsShareIsBlob] = useState(false);

  // donated items drawer (+ share/json)
  const [donatedOpen, setDonatedOpen] = useState(false);
  const [donatedSharing, setDonatedSharing] = useState(false);
  const [donatedShareUrl, setDonatedShareUrl] = useState("");
  const [donatedShareErr, setDonatedShareErr] = useState("");
  const [donatedShareIsBlob, setDonatedShareIsBlob] = useState(false);

  // hydrate
  useEffect(() => {
    try {
      const savedDonate = JSON.parse(
        localStorage.getItem("donateItems") || "[]",
      );
      const savedDonated = JSON.parse(
        localStorage.getItem("donatedItems") || "[]",
      );
      setDonateItems(savedDonate);
      setDonatedItems(savedDonated);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("donateItems", JSON.stringify(donateItems));
    } catch {}
  }, [donateItems]);

  // load closet choices
  useEffect(() => {
    let ignore = false;
    async function run() {
      if (!isOpen || !section) return;
      setChoicesLoading(true);
      setChoicesError("");
      try {
        const imgs = await fetchImagesByTag(section);
        const vids = await fetchVideosByTag(section);
        const norm = [
          ...(imgs || []).map((u) => normalizeChoice(u, section)),
          ...(vids || []).map((u) =>
            normalizeChoice(
              { mediaType: "video", mediaUrl: u, mediaPoster: videoPoster(u) },
              section,
            ),
          ),
        ].filter(Boolean);
        if (!ignore) setChoices(norm);
      } catch {
        if (!ignore) {
          setChoices([]);
          setChoicesError("Couldn’t load this section. Try another one.");
        }
      } finally {
        if (!ignore) setChoicesLoading(false);
      }
    }
    run();
    return () => {
      ignore = true;
    };
  }, [isOpen, section]);

  // canvas ops
  const addFromChoice = (it) =>
    setDonateItems((prev) => {
      const key = it.mediaUrl || it.imageUrl || it.name;
      if (prev.some((p) => (p.mediaUrl || p.imageUrl || p.name) === key))
        return prev;
      return [
        ...prev,
        {
          name: it.name || "",
          description: "",
          url: it.mediaUrl || "",
          imageUrl: it.mediaThumb || it.mediaUrl || "",
        },
      ];
    });
  const removeFromCanvas = (i) =>
    setDonateItems((prev) => prev.filter((_, idx) => idx !== i));

  const handleDonate = () => {
    if (!donateItems.length) return;
    const updated = [...donatedItems, ...donateItems];
    setDonatedItems(updated);
    try {
      localStorage.setItem("donatedItems", JSON.stringify(updated));
    } catch {}
    setDonateItems([]);
    try {
      localStorage.removeItem("donateItems");
    } catch {}
  };

  // share helpers
  const buildDonatePayload = () => ({
    kind: "wimc.donateBin",
    version: 2,
    createdAt: new Date().toISOString(),
    pendingCount: donateItems.length,
    donatedCount: donatedItems.length,
    pending: donateItems.map((it) => ({
      name: it.name || "",
      description: it.description || "",
      url: it.url || "",
      imageUrl: it.imageUrl || "",
    })),
    donated: donatedItems.map((it) => ({
      name: it.name || "",
      description: it.description || "",
      url: it.url || "",
      imageUrl: it.imageUrl || "",
    })),
    meta: { source: "WIMC Donate Bin" },
  });
  async function shareDonateBin() {
    setSharing(true);
    setShareErr("");
    setShareUrl("");
    setShareIsBlob(false);
    try {
      const res = await uploadRawJSON(buildDonatePayload(), "wimc/donate-bin");
      const url =
        res?.secure_url || res?.url || res?.data?.secure_url || res?.data?.url;
      if (url) {
        setShareUrl(url);
        try {
          await navigator.clipboard.writeText(url);
        } catch {}
      } else {
        const blob = new Blob([JSON.stringify(buildDonatePayload(), null, 2)], {
          type: "application/json",
        });
        const local = URL.createObjectURL(blob);
        setShareUrl(local);
        setShareIsBlob(true);
        setShareErr(
          "Upload failed — temporary local link. Keep this tab open.",
        );
      }
    } catch {
      const blob = new Blob([JSON.stringify(buildDonatePayload(), null, 2)], {
        type: "application/json",
      });
      const local = URL.createObjectURL(blob);
      setShareUrl(local);
      setShareIsBlob(true);
      setShareErr("Share failed — temporary local link. Keep this tab open.");
    } finally {
      setSharing(false);
    }
  }
  const downloadDonateJson = () => {
    const blob = new Blob([JSON.stringify(buildDonatePayload(), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wimc-donate-bin-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // saved sets
  const persistSets = (next) => {
    setSets(next);
    try {
      localStorage.setItem("wimc_donation_sets", JSON.stringify(next));
    } catch {}
  };
  const saveCurrentSet = () => {
    if (!donateItems.length) return;
    const now = new Date().toISOString();
    const name =
      (newSetName || "").trim() ||
      `Donation Set ${String((sets?.length || 0) + 1).padStart(2, "0")}`;
    const entry = {
      id: now,
      name,
      createdAt: now,
      updatedAt: now,
      items: donateItems.map((it) => ({ ...it })),
    };
    persistSets([...(sets || []), entry]);
    setNewSetName("");
    setSetsOpen(true);
    setSetsStatus("saved");
    setTimeout(() => setSetsStatus(""), 1200);
  };
  const renameSet = (id, name) =>
    persistSets(
      (sets || []).map((s) =>
        s.id === id ? { ...s, name, updatedAt: new Date().toISOString() } : s,
      ),
    );
  const deleteSet = (id) =>
    persistSets((sets || []).filter((s) => s.id !== id));
  const loadSet = (id, mode = "replace") => {
    const s = (sets || []).find((x) => x.id === id);
    if (!s) return;
    const incoming = (s.items || []).map((it) => ({ ...it }));
    setDonateItems((prev) => {
      if (mode === "replace") return incoming;
      const seen = new Set(prev.map((p) => keyOf(p)));
      const merged = prev.slice();
      for (const it of incoming) {
        const k = keyOf(it);
        if (!seen.has(k)) {
          seen.add(k);
          merged.push(it);
        }
      }
      return merged;
    });
  };

  // share / json for all saved sets
  const buildDonationSetsPayload = () => ({
    kind: "wimc.donationSets",
    version: 1,
    createdAt: new Date().toISOString(),
    count: (sets || []).length,
    sets: (sets || []).map((s) => ({
      id: s.id,
      name: s.name,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      items: (s.items || []).map((it) => ({
        name: it.name || "",
        description: it.description || "",
        url: it.url || "",
        imageUrl: it.imageUrl || "",
      })),
    })),
    meta: { source: "WIMC Saved Donation Sets" },
  });
  async function shareDonationSets() {
    setSetsSharing(true);
    setSetsShareErr("");
    setSetsShareUrl("");
    setSetsShareIsBlob(false);
    try {
      const res = await uploadRawJSON(
        buildDonationSetsPayload(),
        "wimc/donation-sets",
      );
      const url =
        res?.secure_url || res?.url || res?.data?.secure_url || res?.data?.url;
      if (url) {
        setSetsShareUrl(url);
        try {
          await navigator.clipboard.writeText(url);
        } catch {}
      } else {
        const blob = new Blob(
          [JSON.stringify(buildDonationSetsPayload(), null, 2)],
          { type: "application/json" },
        );
        const local = URL.createObjectURL(blob);
        setSetsShareUrl(local);
        setSetsShareIsBlob(true);
        setSetsShareErr(
          "Upload failed — temporary local link. Keep this tab open.",
        );
      }
    } catch {
      const blob = new Blob(
        [JSON.stringify(buildDonationSetsPayload(), null, 2)],
        { type: "application/json" },
      );
      const local = URL.createObjectURL(blob);
      setSetsShareUrl(local);
      setSetsShareIsBlob(true);
      setSetsShareErr(
        "Share failed — temporary local link. Keep this tab open.",
      );
    } finally {
      setSetsSharing(false);
    }
  }
  const downloadDonationSetsJson = () => {
    const blob = new Blob(
      [JSON.stringify(buildDonationSetsPayload(), null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wimc-donation-sets-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ---- Donated Items share/json (ENTIRE donated history) ----
  const buildDonatedItemsPayload = () => ({
    kind: "wimc.donatedItems",
    version: 1,
    createdAt: new Date().toISOString(),
    count: donatedItems.length,
    items: donatedItems.map((it) => ({
      name: it.name || "",
      description: it.description || "",
      url: it.url || "",
      imageUrl: it.imageUrl || "",
    })),
    meta: { source: "WIMC Donated Items" },
  });
  async function shareDonatedItems() {
    setDonatedSharing(true);
    setDonatedShareErr("");
    setDonatedShareUrl("");
    setDonatedShareIsBlob(false);
    try {
      const res = await uploadRawJSON(
        buildDonatedItemsPayload(),
        "wimc/donated-items",
      );
      const url =
        res?.secure_url || res?.url || res?.data?.secure_url || res?.data?.url;
      if (url) {
        setDonatedShareUrl(url);
        try {
          await navigator.clipboard.writeText(url);
        } catch {}
      } else {
        const blob = new Blob(
          [JSON.stringify(buildDonatedItemsPayload(), null, 2)],
          { type: "application/json" },
        );
        const local = URL.createObjectURL(blob);
        setDonatedShareUrl(local);
        setDonatedShareIsBlob(true);
        setDonatedShareErr(
          "Upload failed — temporary local link. Keep this tab open.",
        );
      }
    } catch {
      const blob = new Blob(
        [JSON.stringify(buildDonatedItemsPayload(), null, 2)],
        { type: "application/json" },
      );
      const local = URL.createObjectURL(blob);
      setDonatedShareUrl(local);
      setDonatedShareIsBlob(true);
      setDonatedShareErr(
        "Share failed — temporary local link. Keep this tab open.",
      );
    } finally {
      setDonatedSharing(false);
    }
  }
  const downloadDonatedItemsJson = () => {
    const blob = new Blob(
      [JSON.stringify(buildDonatedItemsPayload(), null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wimc-donated-items-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // memo section label
  const sectionLabel = useMemo(
    () => SECTION_OPTIONS.find((o) => o.value === section)?.label || "",
    [section],
  );

  return (
    <>
      {/* Collapsible stub */}
      <section className={`donate-bin ${collapsed ? "is-collapsed" : ""}`}>
        <header
          className="panel-header"
          role="button"
          tabIndex={0}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((c) => !c)}
          onKeyDown={(e) =>
            (e.key === "Enter" || e.key === " ") && setCollapsed((c) => !c)
          }
          title="Toggle Donate Bin"
        >
          <h3 className="panel-title">Donate Bin</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="donate-bin__open-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(true);
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
          <p className="donate-bin__hint">
            Open to select closet items to donate.
          </p>
        </div>
      </section>

      {/* Floating Donate modal */}
      {isOpen && (
        <>
          <div className="opp-backdrop" onClick={() => setIsOpen(false)} />
          <aside
            className="donate-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Donate Bin"
          >
            <header className="donate-modal__head">
              <h4 className="donate-modal__title">Donate Bin</h4>
              <div className="donate-modal__actions">
                <button
                  className="donate-modal__btn donate-modal__btn--primary"
                  onClick={handleDonate}
                  title="Donate selected items"
                >
                  Donate Items
                </button>
                <button
                  className="donate-modal__btn"
                  onClick={saveCurrentSet}
                  title="Save current selected items"
                  aria-label="Save"
                >
                  <IconSave />
                </button>
                <button
                  className="donate-modal__btn"
                  onClick={() => setSetsOpen(true)}
                  title="Open Saved Donation Sets"
                >
                  Saved Sets
                </button>
                <button
                  className="donate-modal__btn"
                  onClick={shareDonateBin}
                  disabled={sharing}
                  title="Share current Donate Bin"
                >
                  {sharing ? "Sharing…" : "Share"}
                </button>
                <button
                  className="donate-modal__btn"
                  onClick={downloadDonateJson}
                  title="Download current Donate Bin JSON"
                >
                  JSON
                </button>
                <button
                  className="donate-modal__btn"
                  onClick={() => setIsOpen(false)}
                >
                  Close
                </button>
              </div>
            </header>

            {(shareUrl || shareErr) && (
              <div className="donate-modal__share" aria-live="polite">
                {shareUrl && (
                  <a
                    className="donate-modal__link"
                    href={shareUrl}
                    target={shareIsBlob ? "_self" : "_blank"}
                    rel={shareIsBlob ? undefined : "noopener noreferrer"}
                  >
                    {shareIsBlob ? "Open local share URL" : "Open shared list"}
                  </a>
                )}
                {shareErr && (
                  <span className="donate-modal__err">{shareErr}</span>
                )}
              </div>
            )}

            <div className="donate-modal__body donate-modal__layout">
              {/* LEFT RAIL */}
              <nav className="opp__sections" aria-label="Closet sections">
                {SECTION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={
                      "opp__section-btn" +
                      (section === opt.value ? " is-active" : "")
                    }
                    onClick={() => setSection(opt.value)}
                    title={opt.label}
                    type="button"
                  >
                    {opt.label}
                  </button>
                ))}
                <button
                  className="opp__section-btn opp__section-btn--saved"
                  type="button"
                  onClick={() => setSetsOpen(true)}
                  title="Open Saved Donation Sets"
                >
                  Saved Sets
                </button>
                <button
                  className="opp__section-btn"
                  type="button"
                  onClick={() => setDonatedOpen(true)}
                  title="Open Donated Items"
                >
                  Donated Items
                </button>
              </nav>

              {/* RIGHT: Canvas + Picker (fixed, equal heights) */}
              <div className="donate-modal__right">
                {/* Canvas */}
                <div className="donate-canvas">
                  {donateItems.length === 0 ? (
                    <div className="donate-canvas__hint">
                      No items selected — choose from the closet on the left.
                    </div>
                  ) : (
                    <div className="donate-grid">
                      {donateItems.map((it, i) => {
                        const nameShown = nameVisibleKeys.has(keyOf(it));
                        return (
                          <figure
                            key={(it.url || it.imageUrl || it.name || "it") + i}
                            className="donate-thumb"
                          >
                            <img
                              className="donate-thumb__img"
                              src={it.imageUrl || it.url}
                              alt={it.name || "Selected"}
                            />
                            {/* remove */}
                            <button
                              className="donate-thumb__remove"
                              onClick={() => removeFromCanvas(i)}
                              aria-label="Remove"
                            >
                              ×
                            </button>
                            {/* name toggle (reuses global opp__name-toggle / badge styles) */}
                            <button
                              type="button"
                              className="opp__name-toggle"
                              title={nameShown ? "Hide name" : "Show name"}
                              onClick={() => toggleNameFor(it)}
                            >
                              i
                            </button>
                            {nameShown && (
                              <div
                                className="opp__name-badge"
                                title={it.name || ""}
                              >
                                {it.name || " "}
                              </div>
                            )}
                          </figure>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Picker */}
                <div className="donate-picker">
                  <h4 className="opp__picker-title">{sectionLabel}</h4>
                  {choicesLoading ? (
                    <div className="opp__loading">Loading…</div>
                  ) : choicesError ? (
                    <div className="opp__error">{choicesError}</div>
                  ) : choices.length === 0 ? (
                    <div className="opp__empty">No items found.</div>
                  ) : (
                    <div className="opp__choices">
                      {choices.map((it, idx) => (
                        <button
                          key={(it.mediaUrl || "choice") + idx}
                          className="opp__choice"
                          onClick={() => addFromChoice(it)}
                          title="Add to donation selection"
                          type="button"
                        >
                          {it.mediaType === "video" ? (
                            <div className="opp__choice-vidwrap">
                              <img
                                className="opp__choice-img"
                                src={it.mediaPoster || ""}
                                alt="video poster"
                                onError={(e) =>
                                  (e.currentTarget.style.display = "none")
                                }
                              />
                              <span className="opp__pill">Video</span>
                            </div>
                          ) : (
                            <img
                              className="opp__choice-img"
                              src={it.mediaThumb || it.mediaUrl}
                              alt={it.name || "item"}
                              onError={(e) =>
                                (e.currentTarget.src = it.mediaUrl)
                              }
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>

          {/* Saved Donation Sets Drawer */}
          {setsOpen && (
            <>
              <div
                className="opp-saved__backdrop"
                onClick={() => setSetsOpen(false)}
                aria-label="Close Saved Sets"
              />
              <aside
                className="opp-saved opp-saved--donations"
                role="dialog"
                aria-modal="true"
                aria-label="Saved Donation Sets"
              >
                <header className="opp-saved__head">
                  <h4 className="opp-saved__title">Saved Donation Sets</h4>
                  <div className="opp-saved__actions">
                    <input
                      className="opp__input"
                      type="text"
                      placeholder="New set name…"
                      value={newSetName}
                      onChange={(e) => setNewSetName(e.target.value)}
                    />
                    <button
                      className="opp__btn"
                      onClick={saveCurrentSet}
                      disabled={!donateItems.length}
                      title="Save current selection"
                    >
                      Save Current
                    </button>
                    {setsStatus === "saved" && (
                      <span className="opp__badge">Saved!</span>
                    )}
                    <button
                      className="opp__btn"
                      onClick={shareDonationSets}
                      disabled={setsSharing || !sets.length}
                      title="Share all sets"
                    >
                      {setsSharing ? "Sharing…" : "Share"}
                    </button>
                    <button
                      className="opp__btn"
                      onClick={downloadDonationSetsJson}
                      disabled={!sets.length}
                      title="Download all sets JSON"
                    >
                      JSON
                    </button>
                    <button
                      className="opp__btn"
                      onClick={() => setSetsOpen(false)}
                    >
                      Close
                    </button>
                  </div>
                </header>

                {(setsShareUrl || setsShareErr) && (
                  <div
                    className="opp__share"
                    aria-live="polite"
                    style={{ padding: "0 10px" }}
                  >
                    {setsShareUrl && (
                      <a
                        className="opp__share-link"
                        href={setsShareUrl}
                        target={setsShareIsBlob ? "_self" : "_blank"}
                        rel={
                          setsShareIsBlob ? undefined : "noopener noreferrer"
                        }
                      >
                        {setsShareIsBlob
                          ? "Open local share URL"
                          : "Open shared Saved Donation Sets"}
                      </a>
                    )}
                    {setsShareErr && (
                      <span className="opp__error">{setsShareErr}</span>
                    )}
                  </div>
                )}

                <div className="opp-saved__content">
                  {!sets || !sets.length ? (
                    <div className="opp__empty" style={{ padding: 12 }}>
                      No saved donation sets yet
                    </div>
                  ) : (
                    <div className="opp__looks-list">
                      {sets.map((s) => (
                        <div key={s.id} className="opp__look">
                          <div className="opp__look-head">
                            <input
                              className="opp__look-name"
                              value={s.name}
                              onChange={(e) => renameSet(s.id, e.target.value)}
                              title="Rename set"
                            />
                            <div className="opp__look-actions">
                              <button
                                className="opp__mini"
                                onClick={() => loadSet(s.id, "replace")}
                                title="Load (replace)"
                              >
                                Load
                              </button>
                              <button
                                className="opp__mini"
                                onClick={() => loadSet(s.id, "merge")}
                                title="Merge into current"
                              >
                                Merge
                              </button>
                              <button
                                className="opp__mini opp__danger"
                                onClick={() => deleteSet(s.id)}
                                title="Delete set"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                          <div className="opp__look-strip">
                            {(s.items || []).slice(0, 10).map((it, i) => (
                              <img
                                key={(it.imageUrl || it.url || "thumb") + i}
                                className="opp__look-thumb"
                                src={it.imageUrl || it.url}
                                alt={it.name || "item"}
                              />
                            ))}
                            {(s.items || []).length > 10 && (
                              <span className="opp__look-more">
                                +{(s.items || []).length - 10}
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

          {/* Donated Items Drawer (with Share / JSON + Close) */}
          {donatedOpen && (
            <>
              <div
                className="opp-saved__backdrop"
                onClick={() => setDonatedOpen(false)}
                aria-label="Close Donated Items"
              />
              <aside
                className="opp-saved opp-saved--donated"
                role="dialog"
                aria-modal="true"
                aria-label="Donated Items"
              >
                <header className="opp-saved__head">
                  <h4 className="opp-saved__title">Donated Items</h4>
                  <div className="opp-saved__actions">
                    <button
                      className="opp__btn"
                      onClick={shareDonatedItems}
                      disabled={donatedSharing || !donatedItems.length}
                      title="Share all donated items"
                    >
                      {donatedSharing ? "Sharing…" : "Share"}
                    </button>
                    <button
                      className="opp__btn"
                      onClick={downloadDonatedItemsJson}
                      disabled={!donatedItems.length}
                      title="Download donated items JSON"
                    >
                      JSON
                    </button>
                    <button
                      className="opp__btn"
                      onClick={() => setDonatedOpen(false)}
                    >
                      Close
                    </button>
                  </div>
                </header>

                {(donatedShareUrl || donatedShareErr) && (
                  <div
                    className="opp__share"
                    aria-live="polite"
                    style={{ padding: "0 10px" }}
                  >
                    {donatedShareUrl && (
                      <a
                        className="opp__share-link"
                        href={donatedShareUrl}
                        target={donatedShareIsBlob ? "_self" : "_blank"}
                        rel={
                          donatedShareIsBlob ? undefined : "noopener noreferrer"
                        }
                      >
                        {donatedShareIsBlob
                          ? "Open local share URL"
                          : "Open shared Donated Items"}
                      </a>
                    )}
                    {donatedShareErr && (
                      <span className="opp__error">{donatedShareErr}</span>
                    )}
                  </div>
                )}

                <div className="opp-saved__content">
                  {!donatedItems || !donatedItems.length ? (
                    <div className="opp__empty" style={{ padding: 12 }}>
                      No items have been donated yet.
                    </div>
                  ) : (
                    <div className="opp__looks-list">
                      <div className="opp__look">
                        <div className="opp__look-strip">
                          {donatedItems.slice(0, 120).map((it, i) => (
                            <img
                              key={(it.imageUrl || it.url || "donated") + i}
                              className="opp__look-thumb"
                              src={it.imageUrl || it.url}
                              alt={it.name || "donated"}
                              title={it.name || ""}
                            />
                          ))}
                        </div>
                      </div>
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
