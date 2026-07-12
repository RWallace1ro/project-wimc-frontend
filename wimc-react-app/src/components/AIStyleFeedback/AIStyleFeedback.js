import React, { useState, useRef, useEffect } from "react";
import { aiProxyFetch } from "../../utils/aiProxy";
import { fetchImagesForSection } from "../../utils/CloudinaryAPI";
import { syncSetItem } from "../../utils/syncStore";
import { extractSections, aiPickItems } from "../../utils/outfitBuilder";
import Lightbox from "../Lightbox/Lightbox";
import ApiErrorMessage from "../common/ApiErrorMessage";
import FormattedText from "../common/FormattedText";
import "./AIStyleFeedback.css";

const OCCASIONS = [
  "Casual Day Out",
  "Work/Office",
  "Date Night",
  "Formal Event",
  "Working Out",
  "Travel",
  "Weekend Brunch",
];

const SAVED_LOOKS_KEY = "wimc_style_feedback_saved_outfits";

export default function AIStyleFeedback({ isOpen, onClose, previewUrl, gender = "female" }) {
  const [occasion, setOccasion] = useState("");
  const [description, setDescription] = useState("");
  const [feedback, setFeedback] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef(null);

  // Outfit board — the closet items AI Style Feedback recommended to
  // "Complete the Look," built into a visual, pick-able board.
  const [sectionImages, setSectionImages] = useState({}); // { tag: [url,...] }
  const [imgIndexes, setImgIndexes] = useState({});        // { tag: idx }
  const [boardOpen, setBoardOpen] = useState(false);
  const [building, setBuilding] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);

  // Saved looks — same pattern as AI Stylist's saved outfits, own key.
  const [savedLooks, setSavedLooks] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SAVED_LOOKS_KEY) || "[]"); }
    catch { return []; }
  });
  const [savedOpen, setSavedOpen] = useState(false);
  const [savedLightbox, setSavedLightbox] = useState(null); // { images, index }

  // Re-read on open — picks up cloud-synced saves made on another device.
  useEffect(() => {
    if (!isOpen) return;
    try { setSavedLooks(JSON.parse(localStorage.getItem(SAVED_LOOKS_KEY) || "[]")); } catch {}
  }, [isOpen]);

  const outfitSections =
    !streaming && feedback ? extractSections(feedback, gender) : [];
  const hasOutfit = outfitSections.length >= 2;

  const systemPrompt = `You are WIMC's AI Style Feedback assistant — a friendly, encouraging, and knowledgeable personal stylist.

The user has recorded or uploaded a try-on video of themselves wearing an outfit. They will describe what they're wearing and the occasion. Your job is to:

1. Give warm, genuine feedback on the outfit
2. Highlight what works well (fit, color, style cohesion)
3. Offer 2-3 specific, actionable suggestions to elevate the look
4. Suggest complementary items from their closet categories: Dresses/Skirts, Shoes/Sneakers, Pants/Jeans, Tops, Bags/Accessories, Jackets/Coats
5. End with a confidence-boosting compliment

Format your response with clear sections:
✅ **What Works**
💡 **Style Tips**
👗 **Complete the Look**
⭐ **Final Note**

Keep the tone warm, positive, and empowering — never critical.`;

  const handleGetFeedback = async () => {
    if (!description.trim() || streaming) return;
    setFeedback("");
    setError("");
    setBoardOpen(false);
    setStreaming(true);

    const userMsg = `I'm wearing: ${description.trim()}
Occasion: ${occasion || "Not specified"}
Please give me style feedback on this outfit!`;

    try {
      abortRef.current = new AbortController();
      const res = await aiProxyFetch({
        model: "claude-sonnet-4-5",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: "user", content: userMsg }],
      }, { signal: abortRef.current.signal, feature: "ai_style_feedback" });

      const data = await res.json();
      if (!res.ok) {
        // Server sends `error` as a friendly plain string (e.g. the daily
        // AI-limit message) — surface it instead of a generic error.
        const msg = (typeof data?.error === "string" ? data.error : data?.error?.message) || `HTTP ${res.status}`;
        const err = new Error(msg);
        err.isApi = true;
        throw err;
      }
      setFeedback(data.content?.[0]?.text || "");
    } catch (e) {
      if (e.name !== "AbortError")
        setError(e.isApi ? e.message : "Something went wrong. Please try again.");
    } finally {
      setStreaming(false);
    }
  };

  // ── Build This Look — fetch closet photos for the recommended sections and
  // let the AI pick the best match, mirroring AI Stylist's "Build This Outfit."
  const handleBuildOutfit = async () => {
    if (boardOpen) { setBoardOpen(false); return; }
    setBuilding(true);
    try {
      const missing = outfitSections.filter((s) => sectionImages[s.tag] === undefined);
      let imagesByTag = { ...sectionImages };
      if (missing.length) {
        const results = await Promise.all(
          missing.map((s) => fetchImagesForSection(s.tag).then((urls) => ({ tag: s.tag, urls })))
        );
        results.forEach(({ tag, urls }) => { imagesByTag[tag] = urls; });
        setSectionImages(imagesByTag);
      }
      const picks = await aiPickItems(feedback, outfitSections, imagesByTag, "ai_style_feedback_outfit_pick");
      if (picks) setImgIndexes((prev) => ({ ...prev, ...picks }));
      setBoardOpen(true);
    } finally {
      setBuilding(false);
    }
  };

  const cycleImg = (tag, dir, total) => {
    setImgIndexes((prev) => ({ ...prev, [tag]: ((prev[tag] || 0) + dir + total) % total }));
  };

  const persistLooks = (list) => {
    setSavedLooks(list);
    try { syncSetItem(SAVED_LOOKS_KEY, JSON.stringify(list)); } catch {}
  };

  const saveOutfit = () => {
    const items = outfitSections
      .map((s) => {
        const imgs = sectionImages[s.tag] || [];
        const idx = imgIndexes[s.tag] || 0;
        return imgs.length ? { label: s.label, tag: s.tag, url: imgs[idx] } : null;
      })
      .filter(Boolean);
    if (!items.length) return;

    const look = {
      id: Date.now(),
      date: new Date().toLocaleDateString(),
      request: description.trim(),
      gender,
      items,
    };
    persistLooks([look, ...savedLooks]);
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 2000);
  };

  const deleteLook = (id) => persistLooks(savedLooks.filter((o) => o.id !== id));

  // Older saves have no gender field — infer it from the item tags.
  const lookGender = (o) =>
    o.gender || (o.items?.some((it) => (it.tag || "").startsWith("male-")) ? "male" : "female");
  const visibleLooks = savedLooks.filter((o) => lookGender(o) === gender);

  const reset = () => {
    abortRef.current?.abort();
    setOccasion("");
    setDescription("");
    setFeedback("");
    setError("");
    setStreaming(false);
    setBoardOpen(false);
    setSectionImages({});
    setImgIndexes({});
  };

  if (!isOpen) return null;

  return (
    <div
      className="aisf-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="aisf-modal" role="dialog" aria-label="AI Style Feedback">
        <header className="aisf-header">
          <div className="aisf-header__left">
            <span className="aisf-header__icon">{gender === "male" ? "👔" : "👗"}</span>
            <div>
              <h2 className="aisf-header__title">AI Style Feedback</h2>
              <p className="aisf-header__sub">
                Get personalised feedback on your try-on
              </p>
            </div>
          </div>
          <div className="aisf-header__actions">
            {visibleLooks.length > 0 && (
              <button
                className={`aisf-header__btn${savedOpen ? " is-active" : ""}`}
                onClick={() => setSavedOpen((v) => !v)}
                title="Saved looks"
              >
                {gender === "male" ? "👔" : "👗"}
              </button>
            )}
            <button className="aisf-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
        </header>

        {/* Saved looks drawer */}
        {savedOpen && (
          <div className="aisf-saved">
            <div className="aisf-saved__head">
              <h3 className="aisf-saved__title">Saved Looks ({visibleLooks.length})</h3>
              <button className="aisf-saved__close" onClick={() => setSavedOpen(false)}>✕</button>
            </div>
            {visibleLooks.length === 0 ? (
              <p className="aisf-saved__empty">No saved looks yet.</p>
            ) : (
              visibleLooks.map((o) => (
                <div key={o.id} className="aisf-saved__outfit">
                  <div className="aisf-saved__meta">
                    <span className="aisf-saved__date">{o.date}</span>
                    {o.request && (
                      <span className="aisf-saved__request" title={o.request}>{o.request}</span>
                    )}
                    <button
                      className="aisf-saved__delete"
                      onClick={() => deleteLook(o.id)}
                      aria-label="Delete look"
                    >🗑️</button>
                  </div>
                  <div className="aisf-saved__imgs">
                    {o.items.map((it, i) => (
                      <div key={it.tag} className="aisf-saved__item">
                        <img
                          src={it.url}
                          alt={it.label}
                          className="aisf-saved__img"
                          onClick={() => setSavedLightbox({
                            images: o.items.map((x) => ({ src: x.url, alt: x.label })),
                            index: i,
                          })}
                          title="Click to enlarge"
                        />
                        <span className="aisf-saved__label">{it.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <div className="aisf-body">
          {/* Video preview (if available) */}
          {previewUrl && (
            <div className="aisf-preview">
              <video
                className="aisf-preview__video"
                src={previewUrl}
                controls
                playsInline
              />
            </div>
          )}

          {/* Occasion selector */}
          <div className="aisf-field">
            <label className="aisf-label">What's the occasion?</label>
            <div className="aisf-occasions">
              {OCCASIONS.map((o) => (
                <button
                  key={o}
                  className={`aisf-occasion ${occasion === o ? "is-active" : ""}`}
                  onClick={() => setOccasion(o)}
                  disabled={streaming}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          {/* Outfit description */}
          <div className="aisf-field">
            <label className="aisf-label">Describe your outfit</label>
            <input
              type="text"
              className="aisf-textarea"
              placeholder="e.g. White linen blouse, high-waisted navy trousers, nude heels…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={streaming}
            />
          </div>

          <div className="aisf-actions">
            <button
              className="aisf-btn aisf-btn--generate"
              onClick={handleGetFeedback}
              disabled={!description.trim() || streaming}
            >
              {streaming ? "✨ Analysing…" : "✨ Get Style Feedback"}
            </button>
            {hasOutfit && (
              <button
                className="aisf-btn aisf-btn--outfit"
                onClick={handleBuildOutfit}
                disabled={building}
              >
                {building ? "✨ Selecting items…" : boardOpen ? "✕ Close Look" : `${gender === "male" ? "👔" : "👗"} Build This Look`}
              </button>
            )}
            {(feedback || error) && (
              <button className="aisf-btn" onClick={reset} disabled={streaming}>
                🔄 Start Over
              </button>
            )}
          </div>

          {/* Feedback result */}
          {(feedback || streaming) && (
            <div className="aisf-result">
              <pre className="aisf-result__text">
                <FormattedText text={feedback} />
                {streaming && <span className="aisf-cursor">▋</span>}
              </pre>
            </div>
          )}

          {/* Outfit image board — the recommended "Complete the Look" items */}
          {boardOpen && (
            <div className="aisf-outfit-board">
              {outfitSections.map((s) => {
                const imgs = sectionImages[s.tag] || [];
                const idx = imgIndexes[s.tag] || 0;
                return (
                  <div key={s.tag} className="aisf-outfit-card">
                    <p className="aisf-outfit-card__label">{s.label}</p>
                    {imgs.length > 0 ? (
                      <>
                        <img
                          src={imgs[idx]}
                          alt={s.label}
                          className="aisf-outfit-card__img"
                        />
                        {imgs.length > 1 && (
                          <>
                            <button
                              className="aisf-outfit-card__prev"
                              onClick={() => cycleImg(s.tag, -1, imgs.length)}
                              aria-label={`Previous ${s.label}`}
                            >‹</button>
                            <button
                              className="aisf-outfit-card__next"
                              onClick={() => cycleImg(s.tag, 1, imgs.length)}
                              aria-label={`Next ${s.label}`}
                            >›</button>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="aisf-outfit-card__empty">No items yet</div>
                    )}
                  </div>
                );
              })}
              <button
                className={`aisf-outfit-save${saveFlash ? " is-saved" : ""}`}
                onClick={saveOutfit}
              >
                {saveFlash ? "✓ Look Saved!" : "💾 Save This Look"}
              </button>
            </div>
          )}

          {error && <ApiErrorMessage className="aisf-error" message={error} />}
        </div>
      </div>
      {savedLightbox && (
        <Lightbox
          images={savedLightbox.images}
          index={savedLightbox.index}
          onClose={() => setSavedLightbox(null)}
          onChange={(i) => setSavedLightbox((prev) => ({ ...prev, index: i }))}
        />
      )}
    </div>
  );
}
