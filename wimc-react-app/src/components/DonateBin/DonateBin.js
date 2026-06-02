import { syncSetItem, syncRemoveItem } from '../../utils/syncStore';
﻿import React, { useEffect, useState, useMemo } from "react";
import AIDonationAdvisor from "../AIDonationAdvisor/AIDonationAdvisor";
import {
  uploadRawJSON,
  fetchImagesByTag,
  fetchVideosByTag,
  videoPoster,
} from "../../utils/CloudinaryAPI";
import { appShareUrl, createCollabDoc, shareAppLink } from "../../utils/shareUtils";
import Lightbox from "../Lightbox/Lightbox";
import ClosetSearch from "../ClosetSearch/ClosetSearch";
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

export default function DonateBin({ tagPrefix = "", incomingItems = null }) {
  // Child-specific localStorage keys so each child has their own donate bin data
  const lsDonateKey  = tagPrefix ? `wimc_donateItems_${tagPrefix}`  : "donateItems";
  const lsDonatedKey = tagPrefix ? `wimc_donatedItems_${tagPrefix}` : "donatedItems";
  const lsSetsKey    = tagPrefix ? `wimc_donation_sets_${tagPrefix}` : "wimc_donation_sets";

  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);
  const [showDonating, setShowDonating] = useState(false);
  const [showOpening, setShowOpening] = useState(false);

  const [collapsed, setCollapsed] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [donateItems, setDonateItems] = useState([]);
  const [donatedItems, setDonatedItems] = useState([]);
  const [section, setSection] = useState(SECTION_OPTIONS[0].value);
  const [choices, setChoices] = useState([]);
  const [choicesLoading, setChoicesLoading] = useState(false);
  const [choicesError, setChoicesError] = useState("");
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareErr, setShareErr] = useState("");
  const [smsHref, setSmsHref] = useState(""); // eslint-disable-line no-unused-vars
  const [shareNote, setShareNote] = useState("");
  const [nameVisibleKeys, setNameVisibleKeys] = useState(() => new Set());
  const [sets, setSets] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(lsSetsKey) || "[]");
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
  const [setsShareIsBlob, setSetsShareIsBlob] = useState(false); // eslint-disable-line no-unused-vars
  const [donatedOpen, setDonatedOpen] = useState(false);
  const [lbImages, setLbImages] = useState([]);
  const [lbIndex, setLbIndex] = useState(0);
  const openLb = (imgs, idx) => { setLbImages(imgs); setLbIndex(idx); };
  const closeLb = () => setLbImages([]);
  const [donatedSharing, setDonatedSharing] = useState(false);
  const [donatedShareUrl, setDonatedShareUrl] = useState("");
  const [donatedShareErr, setDonatedShareErr] = useState("");
  const [donatedShareIsBlob, setDonatedShareIsBlob] = useState(false); // eslint-disable-line no-unused-vars

  const addSearchItems = (rawItems) => {
    const toAdd = rawItems.map((it) => normalizeChoice(it, it?.section)).filter(Boolean);
    setDonateItems((prev) => {
      const seen = new Set(prev.map((p) => keyOf(p)));
      const unique = toAdd.filter((it) => {
        const k = keyOf(it);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      return [...prev, ...unique];
    });
  };

  // Apply items from search results (parent-routed, legacy)
  useEffect(() => {
    if (!incomingItems?.items?.length) return;
    addSearchItems(incomingItems.items);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingItems]);

  // In-panel closet search
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const toggleNameFor = (it) => {
    const k = keyOf(it);
    setNameVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  useEffect(() => {
    try {
      const savedDonate = JSON.parse(
        localStorage.getItem(lsDonateKey) || "[]",
      );
      const savedDonated = JSON.parse(
        localStorage.getItem(lsDonatedKey) || "[]",
      );
      setDonateItems(savedDonate);
      setDonatedItems(savedDonated);
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      syncSetItem(lsDonateKey, JSON.stringify(donateItems));
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [donateItems]);

  useEffect(() => {
    let ignore = false;
    async function run() {
      if (!isOpen || !section) return;
      setChoicesLoading(true);
      setChoicesError("");
      try {
        const effectiveSection = tagPrefix ? `${tagPrefix}-${section}` : section;
        const imgs = await fetchImagesByTag(effectiveSection);
        const vids = await fetchVideosByTag(effectiveSection);
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
          setChoicesError("Couldn't load this section. Try another one.");
        }
      } finally {
        if (!ignore) setChoicesLoading(false);
      }
    }
    run();
    return () => {
      ignore = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, section]);

  // ✅ Open modal with "Select items to donate" fade-in/out
  const handleOpen = () => {
    setIsOpen(true);
    setShowOpening(true);
    setTimeout(() => setShowOpening(false), 2200);
  };

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
    setShowDonating(true);
    setTimeout(() => {
      setShowDonating(false);
      const updated = [...donatedItems, ...donateItems];
      setDonatedItems(updated);
      try {
        syncSetItem(lsDonatedKey, JSON.stringify(updated));
      } catch {}
      setDonateItems([]);
      try {
        syncRemoveItem(lsDonateKey);
      } catch {}
    }, 2000);
  };

  const buildDonatePayload = () => ({
    kind: "wimc.donateBin",
    version: 2,
    createdAt: new Date().toISOString(),
    note: shareNote,
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

  async function shareDonateBin(withEdit = false) {
    setSharing(true);
    setShareErr("");
    setShareUrl("");
    try {
      let url;
      if (withEdit) {
        url = await createCollabDoc("donatebin", buildDonatePayload());
      } else {
        const res = await uploadRawJSON(buildDonatePayload(), "wimc/donate-bin");
        const cloudUrl = res?.secure_url || res?.url || res?.data?.secure_url || res?.data?.url;
        if (!cloudUrl) throw new Error("Upload failed");
        url = appShareUrl(cloudUrl, "donatebin");
      }
      const result = await shareAppLink({ title: "My Donate Bin ♻️", text: shareNote ? `Items I'm donating via WIMC\n\n📝 ${shareNote}` : "Items I'm donating via WIMC", url });
      setShareUrl(result === "clipboard" ? "📋 Link copied!" : "✅ Shared!");
      setTimeout(() => setShareUrl(""), 3500);
    } catch {
      setShareUrl("❌ Share failed.");
      setTimeout(() => setShareUrl(""), 3000);
    } finally { setSharing(false); }
  }

  const persistSets = (next) => {
    setSets(next);
    try {
      syncSetItem(lsSetsKey, JSON.stringify(next));
    } catch {}
  };
  const saveCurrentSet = () => {
    if (!donateItems.length) return;
    const now = new Date().toISOString();
    const name =
      (newSetName || "").trim() ||
      `Donation Set ${String((sets?.length || 0) + 1).padStart(2, "0")}`;
    persistSets([
      ...(sets || []),
      {
        id: now,
        name,
        createdAt: now,
        updatedAt: now,
        items: donateItems.map((it) => ({ ...it })),
      },
    ]);
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
    try {
      const res = await uploadRawJSON(
        buildDonationSetsPayload(),
        "wimc/donation-sets",
      );
      const cloudUrl =
        res?.secure_url || res?.url || res?.data?.secure_url || res?.data?.url;
      if (!cloudUrl) throw new Error("Upload failed");
      const url = appShareUrl(cloudUrl, "donatesets");
      const result = await shareAppLink({ title: "My Donation Sets ♻️", text: shareNote ? `My saved donation sets via WIMC\n\n📝 ${shareNote}` : "My saved donation sets via WIMC", url });
      setSetsShareUrl(result === "clipboard" ? "📋 Link copied!" : "✅ Shared!");
      setTimeout(() => setSetsShareUrl(""), 3500);
    } catch {
      setSetsShareErr("Share failed. Please try again.");
      setTimeout(() => setSetsShareErr(""), 3000);
    } finally {
      setSetsSharing(false);
    }
  }

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
    try {
      const res = await uploadRawJSON(
        buildDonatedItemsPayload(),
        "wimc/donated-items",
      );
      const cloudUrl =
        res?.secure_url || res?.url || res?.data?.secure_url || res?.data?.url;
      if (!cloudUrl) throw new Error("Upload failed");
      const url = appShareUrl(cloudUrl, "donatedbins");
      const result = await shareAppLink({ title: "My Donated Items ♻️", text: shareNote ? `Items I've donated via WIMC\n\n📝 ${shareNote}` : "Items I've donated via WIMC", url });
      setDonatedShareUrl(result === "clipboard" ? "📋 Link copied!" : "✅ Shared!");
      setTimeout(() => setDonatedShareUrl(""), 3500);
    } catch {
      setDonatedShareErr("Share failed. Please try again.");
      setTimeout(() => setDonatedShareErr(""), 3000);
    } finally {
      setDonatedSharing(false);
    }
  }

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
                handleOpen();
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

      {/* ✅ "Donating" overlay — fades out over the modal */}
      {isOpen && showDonating && (
        <div className="donate-word-overlay">
          <span className="donate-word-overlay__text">Donating</span>
        </div>
      )}

      {/* ✅ "Select items to donate" overlay — shown when modal first opens */}
      {isOpen && showOpening && (
        <div className="donate-word-overlay">
          <span className="donate-word-overlay__text donate-word-overlay__text--sm">
            Select items to donate
          </span>
        </div>
      )}

      {lbImages.length > 0 && (
        <Lightbox images={lbImages} index={lbIndex} onClose={closeLb} onChange={setLbIndex} />
      )}
      <ClosetSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        target="donate"
        tagPrefix={tagPrefix}
        onApplyItems={addSearchItems}
      />

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
                  className="donate-modal__btn donate-modal__close"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </header>

            {/* Share bar — share buttons left, note right */}
            <div className="donate-modal__share-bar">
              <div className="donate-modal__share-btns">
                <button
                  className="donate-modal__share-btn"
                  onClick={() => shareDonateBin(false)}
                  disabled={sharing}
                  title="Share current Donate Bin (view only)"
                >
                  {sharing ? "Sharing…" : "Share (View Only)"}
                </button>
                <button
                  className="donate-modal__share-btn donate-modal__share-btn--edit"
                  onClick={() => shareDonateBin(true)}
                  disabled={sharing}
                  title="Share Donate Bin with edit access"
                >
                  ✏️ Share + Edit
                </button>
              </div>
              <textarea
                className="donate-modal__share-note"
                placeholder="Add a note for the recipient, when sharing (optional)…"
                value={shareNote}
                onChange={(e) => setShareNote(e.target.value)}
                rows={2}
              />
            </div>

            {(shareUrl || shareErr || smsHref) && (
              <div className="donate-modal__share" aria-live="polite">
                {shareUrl && <span className="donate-modal__link">{shareUrl}</span>}
                {smsHref && (
                  <a href={smsHref} className="donate-modal__btn" style={{ textDecoration: "none" }}>
                    📱 Text
                  </a>
                )}
                {shareErr && <span className="donate-modal__err">{shareErr}</span>}
              </div>
            )}

            {/* ── Horizontal section strip ── */}
            <div className="donate-section-strip">
              {SECTION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={"donate-section-pill" + (section === opt.value ? " is-active" : "")}
                  onClick={() => setSection(opt.value)}
                  type="button"
                >
                  {opt.label}
                </button>
              ))}
              <button
                className="donate-section-pill donate-section-pill--action"
                type="button"
                onClick={() => setIsSearchOpen(true)}
              >
                🔍 Search Closet
              </button>
              <button
                className="donate-section-pill donate-section-pill--action"
                type="button"
                onClick={() => setSetsOpen(true)}
              >
                💾 Saved Sets
              </button>
              <button
                className="donate-section-pill donate-section-pill--action"
                type="button"
                onClick={() => setIsAdvisorOpen(true)}
              >
                🤖 AI Advisor
              </button>
              <button
                className="donate-section-pill donate-section-pill--action"
                type="button"
                onClick={() => setDonatedOpen(true)}
              >
                ↩️ Donated Items
              </button>
            </div>

            <div className="donate-modal__body">
              {/* Full-width canvas + picker */}
              <div className="donate-modal__right">
                <div className="donate-canvas">
                  {donateItems.length === 0 ? (
                    <div className="donate-canvas__hint">
                      No items selected — choose from the closet below.
                    </div>
                  ) : (
                    <div className="donate-grid">
                      {donateItems.map((it, i) => {
                        const nameShown = nameVisibleKeys.has(keyOf(it));
                        const canvasImgs = donateItems
                          .filter(x => x.imageUrl || x.url)
                          .map(x => ({ src: x.imageUrl || x.url, alt: x.name || "" }));
                        const imgIdx = donateItems.filter(x => x.imageUrl || x.url).indexOf(it);
                        return (
                          <figure
                            key={(it.url || it.imageUrl || it.name || "it") + i}
                            className="donate-thumb"
                          >
                            <img
                              className="donate-thumb__img"
                              src={it.imageUrl || it.url}
                              alt={it.name || "Selected"}
                              loading="lazy"
                              style={{ cursor: "zoom-in" }}
                              title="Click to enlarge"
                              onClick={() => openLb(canvasImgs, Math.max(0, imgIdx))}
                            />
                            <button
                              className="donate-thumb__remove"
                              onClick={() => removeFromCanvas(i)}
                              aria-label="Remove"
                            >
                              🗑️
                            </button>
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
                                loading="lazy"
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
                              loading="lazy"
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
                      onClick={() => setSetsOpen(false)}
                      aria-label="Close"
                    >
                      ✕
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
                      <span className="opp__badge">{setsShareUrl}</span>
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

          {/* Donated Items Drawer */}
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
                      onClick={() => setDonatedOpen(false)}
                      aria-label="Close"
                    >
                      ✕
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
                      <span className="opp__badge">{donatedShareUrl}</span>
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
                          {donatedItems.slice(0, 120).map((it, i) => {
                            const donatedImgs = donatedItems.filter(x => x.imageUrl || x.url).map(x => ({ src: x.imageUrl || x.url, alt: x.name || "" }));
                            const imgIdx = donatedItems.filter(x => x.imageUrl || x.url).indexOf(it);
                            return (
                            <img
                              key={(it.imageUrl || it.url || "donated") + i}
                              className="opp__look-thumb"
                              src={it.imageUrl || it.url}
                              alt={it.name || "donated"}
                              title="Click to enlarge"
                              style={{ cursor: "zoom-in" }}
                              onClick={() => openLb(donatedImgs, Math.max(0, imgIdx))}
                            />
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </aside>
            </>
          )}

          {/* AI Donation Advisor */}
          <AIDonationAdvisor
            isOpen={isAdvisorOpen}
            onClose={() => setIsAdvisorOpen(false)}
          />
        </>
      )}
    </>
  );
}
