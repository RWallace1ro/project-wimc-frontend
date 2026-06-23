import React, { useState, useRef } from "react";
import { aiProxyFetch } from "../../utils/aiProxy";
import { fetchImagesByTag } from "../../utils/CloudinaryAPI";
import "./AIPackingAssistant.css";

const TRIP_TYPES = [
  "Business",
  "Beach",
  "Hiking",
  "City Break",
  "Wedding",
  "Backpacking",
  "Ski/Winter",
  "Cruise",
];

// Default section labels (used for the prompt). The actual fetch tags come from
// the `sections` prop so kids/pet/male closets resolve correctly.
const DEFAULT_SECTIONS = [
  { label: "Dresses/Skirts",   tag: "dresses-skirts" },
  { label: "Shoes/Sneakers",   tag: "shoes-sneakers" },
  { label: "Pants/Jeans",      tag: "pants-jeans" },
  { label: "Tops",             tag: "tops" },
  { label: "Bags/Accessories", tag: "bags-accessories" },
  { label: "Jackets/Coats",    tag: "jackets-coats" },
];

const isPhone = () =>
  typeof window !== "undefined" && window.matchMedia("(max-width: 600px)").matches;

export default function AIPackingAssistant({
  isOpen,
  onClose,
  onAddItem,
  onAddImages,
  onSaved,
  selectedDay,
  sections = null,
}) {
  const SECTIONS = sections && sections.length ? sections : DEFAULT_SECTIONS;

  const [destination, setDestination] = useState("");
  const [tripType, setTripType] = useState("");
  const [days, setDays] = useState(3);
  const [response, setResponse] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState(false);
  const abortRef = useRef(null);

  // Visual builder state
  const [building, setBuilding] = useState(false);
  const [board, setBoard] = useState(null);        // [{label, tag, qty}]
  const [sectionImages, setSectionImages] = useState({}); // { tag: [urls] }
  const [imgIdx, setImgIdx] = useState({});        // { tag: index }
  const [picked, setPicked] = useState({});        // { [url]: sectionLabel } — chosen to pack
  const [savedFlash, setSavedFlash] = useState(false);

  const systemPrompt = `You are a smart travel packing assistant for the WIMC (What's In My Closet) app.

The user's closet has these categories: ${SECTIONS.map((s) => s.label).join(", ")}.

Your job:
- Generate a practical, organised packing list based on the destination, trip type, and duration
- Group items by closet category so the user knows exactly where to find them in their closet
- Suggest specific quantities (e.g. "3x Tops", "2x Pants/Jeans")
- Consider the climate, activities, and occasion for the trip type
- Keep it concise and actionable
- Format your response clearly with category headers like:
  👕 Tops (3 items)
  • 2x casual t-shirts
  • 1x smart blouse

  👖 Pants/Jeans (2 items)
  • 1x jeans
  • 1x chinos

  ...and so on for each relevant category.

At the end, add a short "Pro tip:" relevant to the destination or trip type.`;

  const generate = async () => {
    if (!destination.trim() || !tripType || streaming) return;
    setResponse("");
    setError("");
    setGenerated(false);
    setBoard(null);
    setStreaming(true);

    const userMsg = `I'm going to ${destination.trim()} for ${days} day${days > 1 ? "s" : ""} on a ${tripType} trip. Generate a packing list from my closet.`;

    try {
      abortRef.current = new AbortController();
      const res = await aiProxyFetch({
        model: "claude-sonnet-4-5",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: "user", content: userMsg }],
      }, { signal: abortRef.current.signal, feature: "ai_packing_assistant" });

      if (!res.ok) throw new Error(`API error ${res.status}`);

      const data = await res.json();
      setResponse(data.content?.[0]?.text || "");
      setGenerated(true);
    } catch (e) {
      if (e.name !== "AbortError") {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setStreaming(false);
    }
  };

  // Which closet sections the list references (+ a quantity if stated).
  const detectSections = () => {
    return SECTIONS.map((s) => {
      const re = new RegExp(s.label.replace(/[/\\^$*+?.()|[\]{}]/g, "\\$&"), "i");
      if (!re.test(response)) return null;
      // Try to pull a quantity like "(3 items)" near the label
      const qtyMatch = response.match(
        new RegExp(`${s.label.replace(/[/\\^$*+?.()|[\]{}]/g, "\\$&")}[^\\n]*?\\((\\d+)`, "i")
      );
      return { label: s.label, tag: s.tag, qty: qtyMatch ? Number(qtyMatch[1]) : null };
    }).filter(Boolean);
  };

  // Build a visual board: fetch closet images for each referenced section.
  const buildVisual = async () => {
    const secs = detectSections();
    if (!secs.length) {
      setError("Couldn't match the list to your closet sections.");
      return;
    }
    setBuilding(true);
    try {
      const missing = secs.filter((s) => sectionImages[s.tag] === undefined);
      const next = { ...sectionImages };
      await Promise.all(
        missing.map((s) =>
          fetchImagesByTag(s.tag)
            .then((urls) => { next[s.tag] = urls || []; })
            .catch(() => { next[s.tag] = []; })
        )
      );
      setSectionImages(next);
      setBoard(secs);
    } finally {
      setBuilding(false);
    }
  };

  const cycleImg = (tag, dir, total) => {
    if (!total) return;
    setImgIdx((prev) => ({ ...prev, [tag]: ((prev[tag] || 0) + dir + total) % total }));
  };

  // Toggle whether a specific image is selected to pack.
  const togglePick = (url, sectionLabel) => {
    setPicked((prev) => {
      const next = { ...prev };
      if (next[url]) delete next[url];
      else next[url] = sectionLabel;
      return next;
    });
  };

  const pickedCount = Object.keys(picked).length;

  // Add all selected images to the Travel Pack & save.
  const addVisualToPack = () => {
    const images = Object.entries(picked).map(([url, section]) => ({ url, section }));
    if (!images.length) return;
    if (onAddImages) onAddImages(images);
    setSavedFlash(true);
    setTimeout(() => {
      setSavedFlash(false);
      // On phone, return to the Travel Pack after saving.
      if (isPhone()) (onSaved || onClose)?.();
    }, 1200);
  };

  // Parse response lines and add as text items to the Travel Pack
  const addAllToPack = () => {
    if (!response || !onAddItem) return;
    const lines = response
      .split("\n")
      .map((l) => l.replace(/^[•\-*]\s*/, "").trim())
      .filter(
        (l) =>
          l &&
          !/^[👕👖👗👟👜🧥]/.test(l) &&
          !l.startsWith("Pro tip") &&
          l.length > 2,
      );
    lines.forEach((item) => onAddItem({ name: item, kind: "text" }));
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  };

  const reset = () => {
    abortRef.current?.abort();
    setResponse("");
    setError("");
    setGenerated(false);
    setStreaming(false);
    setDestination("");
    setTripType("");
    setDays(3);
    setBoard(null);
    setImgIdx({});
    setPicked({});
  };

  if (!isOpen) return null;

  return (
    <div
      className="aipa-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="aipa-modal" role="dialog" aria-label="AI Packing Assistant">
        <header className="aipa-header">
          <div className="aipa-header__left">
            <span className="aipa-header__icon">🧳</span>
            <div>
              <h2 className="aipa-header__title">AI Packing Assistant</h2>
              <p className="aipa-header__sub">Smart packing lists from your closet</p>
            </div>
          </div>
          <button className="aipa-header__close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className="aipa-body">
          {/* Form */}
          <div className="aipa-form">
            <div className="aipa-form__row">
              <label className="aipa-label">
                Destination
                <input
                  className="aipa-input"
                  type="text"
                  placeholder="e.g. Paris, Tokyo, Miami…"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  disabled={streaming}
                />
              </label>
              <label className="aipa-label">
                Days
                <input
                  className="aipa-input aipa-input--days"
                  type="number"
                  min={1}
                  max={30}
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  disabled={streaming}
                />
              </label>
            </div>

            <div className="aipa-trip-types">
              {TRIP_TYPES.map((t) => (
                <button
                  key={t}
                  className={`aipa-type-btn ${tripType === t ? "is-active" : ""}`}
                  onClick={() => setTripType(t)}
                  disabled={streaming}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="aipa-form__actions">
              <button
                className="aipa-btn aipa-btn--generate"
                onClick={generate}
                disabled={!destination.trim() || !tripType || streaming}
              >
                {streaming ? "✨ Generating…" : "✨ Generate Packing List"}
              </button>
              {(response || error) && (
                <button className="aipa-btn aipa-btn--new" onClick={reset}>🔄 New</button>
              )}
            </div>
          </div>

          {/* Response */}
          {(response || streaming) && (
            <div className="aipa-result">
              <div className="aipa-result__header">
                <h3 className="aipa-result__title">
                  📋 Packing List — {destination} ({days}d, {tripType})
                </h3>
                {selectedDay && (
                  <span className="aipa-result__day">Adding to: {selectedDay}</span>
                )}
              </div>
              <pre className="aipa-result__text">
                {response}
                {streaming && <span className="aipa-cursor">▋</span>}
              </pre>

              {/* Build & add actions */}
              {generated && (
                <div className="aipa-result__actions">
                  {!board && (
                    <button
                      className="aipa-btn aipa-btn--build"
                      onClick={buildVisual}
                      disabled={building}
                    >
                      {building ? "✨ Building…" : "🧳 Build Visual List"}
                    </button>
                  )}
                  {onAddItem && (
                    <button className="aipa-btn aipa-btn--add" onClick={addAllToPack}>
                      ➕ Add List (text)
                    </button>
                  )}
                </div>
              )}

              {/* Visual board — pick the actual items to pack */}
              {board && (
                <div className="aipa-board">
                  <p className="aipa-board__hint">
                    Tap the ✓ on each item you want to pack — swap with ‹ › to
                    pick more, then save.
                  </p>
                  <div className="aipa-board__grid">
                    {board.map((s) => {
                      const imgs = sectionImages[s.tag] || [];
                      const idx = imgIdx[s.tag] || 0;
                      const curUrl = imgs[idx];
                      const isPicked = curUrl && !!picked[curUrl];
                      return (
                        <div key={s.tag} className={`aipa-ob-card${isPicked ? " is-picked" : ""}`}>
                          <p className="aipa-ob-card__label">
                            {s.label}{s.qty ? ` · ${s.qty}` : ""}
                          </p>
                          {imgs.length > 0 ? (
                            <>
                              <img src={imgs[idx]} alt={s.label} className="aipa-ob-card__img" />
                              <button
                                className={`aipa-ob-card__pick${isPicked ? " is-on" : ""}`}
                                onClick={() => togglePick(curUrl, s.label)}
                                aria-pressed={isPicked}
                                title={isPicked ? "Selected to pack — tap to remove" : "Select this item to pack"}
                              >
                                {isPicked ? "✓" : "+"}
                              </button>
                              {imgs.length > 1 && (
                                <>
                                  <button className="aipa-ob-card__prev" onClick={() => cycleImg(s.tag, -1, imgs.length)} aria-label="Previous">‹</button>
                                  <button className="aipa-ob-card__next" onClick={() => cycleImg(s.tag, 1, imgs.length)} aria-label="Next">›</button>
                                </>
                              )}
                            </>
                          ) : (
                            <div className="aipa-ob-card__empty">No items yet</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <button
                    className={`aipa-btn aipa-btn--save${savedFlash ? " is-saved" : ""}`}
                    onClick={addVisualToPack}
                    disabled={pickedCount === 0}
                  >
                    {savedFlash
                      ? "✓ Saved to Travel Pack!"
                      : pickedCount > 0
                      ? `💾 Save ${pickedCount} item${pickedCount !== 1 ? "s" : ""} to Travel Pack`
                      : "Select items to pack"}
                  </button>
                </div>
              )}
            </div>
          )}

          {error && <p className="aipa-error">{error}</p>}
        </div>
      </div>
    </div>
  );
}
