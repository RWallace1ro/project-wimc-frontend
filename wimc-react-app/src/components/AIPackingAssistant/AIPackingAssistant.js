import React, { useState, useRef, useEffect } from "react";
import { aiProxyFetch } from "../../utils/aiProxy";
import { fetchImagesForSection } from "../../utils/CloudinaryAPI";
import { syncSetItem } from "../../utils/syncStore";
import Lightbox from "../Lightbox/Lightbox";
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

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const SAVED_LISTS_KEY = "wimc_packing_saved_lists";

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
  gender = "female",
}) {
  const SECTIONS = sections && sections.length ? sections : DEFAULT_SECTIONS;

  const [destination, setDestination] = useState("");
  const [tripType, setTripType] = useState("");
  // Which specific calendar days the trip covers — replaces the old numeric
  // "days" input so built items can land on the RIGHT day, not just whichever
  // day happens to be selected in Travel Pack right now.
  const [selectedDays, setSelectedDays] = useState([]);
  const [response, setResponse] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState(false);
  const abortRef = useRef(null);

  // Visual builder state
  const [building, setBuilding] = useState(false);
  const [board, setBoard] = useState(null);          // [{day, label, tag, qty}]
  const [sectionImages, setSectionImages] = useState({}); // { tag: [urls] }
  const [imgIdx, setImgIdx] = useState({});           // { "day::tag": index }
  const [picked, setPicked] = useState({});           // { [url]: {section, day} }
  const [savedFlash, setSavedFlash] = useState(false);

  // Saved packing lists — reusable trips, mirrors AI Stylist's saved outfits.
  const [savedLists, setSavedLists] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SAVED_LISTS_KEY) || "[]"); }
    catch { return []; }
  });
  const [savedOpen, setSavedOpen] = useState(false);
  // Fullscreen viewer for saved-list thumbnails — { images:[{src,alt}], index }
  const [savedLightbox, setSavedLightbox] = useState(null);
  useEffect(() => {
    if (!isOpen) return;
    try { setSavedLists(JSON.parse(localStorage.getItem(SAVED_LISTS_KEY) || "[]")); } catch {}
  }, [isOpen]);

  const toggleDay = (day) => {
    setSelectedDays((prev) => {
      const next = prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day];
      // Keep chronological (Mon-first) order regardless of click order.
      return WEEKDAYS.filter((d) => next.includes(d));
    });
  };

  const systemPrompt = `You are a smart travel packing assistant for the WIMC (What's In My Closet) app.

The user's closet has these categories: ${SECTIONS.map((s) => s.label).join(", ")}.

The trip covers these specific days: ${selectedDays.join(", ")}.

Your job:
- Give a DAY-BY-DAY outfit + packing plan — one block per day, covering EVERY day listed above, in that order
- Start each day's block with this exact header on its own line: 🗓️ {DayName}  (use the exact day name given, nothing else on that line)
- Under each day, suggest specific items grouped by closet category with quantities, formatted exactly like:
  👕 Tops (1 item)
  • Casual t-shirt

  👖 Pants/Jeans (1 item)
  • Jeans
- Items can repeat across days when practical (e.g. the same jacket for the whole trip), but vary the look day to day where it makes sense
- Consider the climate, activities, and occasion for the trip type
- Keep it concise and actionable
- After all the days, add a short "Pro tip:" relevant to the destination or trip type`;

  const generate = async () => {
    if (!destination.trim() || !tripType || !selectedDays.length || streaming) return;
    setResponse("");
    setError("");
    setGenerated(false);
    setBoard(null);
    setStreaming(true);

    const userMsg = `I'm going to ${destination.trim()} on a ${tripType} trip, covering these days: ${selectedDays.join(", ")}. Generate a day-by-day packing/outfit plan from my closet.`;

    try {
      abortRef.current = new AbortController();
      const res = await aiProxyFetch({
        model: "claude-sonnet-4-5",
        max_tokens: 1400,
        system: systemPrompt,
        messages: [{ role: "user", content: userMsg }],
      }, { signal: abortRef.current.signal, feature: "ai_packing_assistant" });

      const data = await res.json();
      if (!res.ok) {
        // Server sends `error` as a friendly plain string (e.g. the daily
        // AI-limit message) — surface it instead of a generic error.
        const msg = (typeof data?.error === "string" ? data.error : data?.error?.message) || `HTTP ${res.status}`;
        const err = new Error(msg);
        err.isApi = true;
        throw err;
      }
      setResponse(data.content?.[0]?.text || "");
      setGenerated(true);
    } catch (e) {
      if (e.name !== "AbortError") {
        setError(e.isApi ? e.message : "Something went wrong. Please try again.");
      }
    } finally {
      setStreaming(false);
    }
  };

  // Split the response into per-day chunks using the "🗓️ {Day}" headers.
  const splitByDay = (text) => {
    const re = new RegExp(`🗓️\\s*\\**\\s*(${WEEKDAYS.join("|")})\\**`, "gi");
    const matches = [...text.matchAll(re)];
    if (!matches.length) return [];
    return matches.map((m, i) => {
      const day = WEEKDAYS.find((d) => d.toLowerCase() === m[1].toLowerCase());
      const start = m.index + m[0].length;
      const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
      return { day, text: text.slice(start, end) };
    });
  };

  // Which closet sections a chunk of text references (+ a quantity if stated).
  const detectSectionsInText = (text) =>
    SECTIONS.map((s) => {
      const re = new RegExp(s.label.replace(/[/\\^$*+?.()|[\]{}]/g, "\\$&"), "i");
      if (!re.test(text)) return null;
      const qtyMatch = text.match(
        new RegExp(`${s.label.replace(/[/\\^$*+?.()|[\]{}]/g, "\\$&")}[^\\n]*?\\((\\d+)`, "i")
      );
      return { label: s.label, tag: s.tag, qty: qtyMatch ? Number(qtyMatch[1]) : null };
    }).filter(Boolean);

  // Build a visual board — one row of section-cards per day.
  const buildVisual = async () => {
    const dayChunks = splitByDay(response);
    if (!dayChunks.length) {
      setError("Couldn't match the plan to specific days. Try regenerating.");
      return;
    }
    const rows = dayChunks.flatMap(({ day, text }) =>
      detectSectionsInText(text).map((s) => ({ day, ...s }))
    );
    if (!rows.length) {
      setError("Couldn't match the plan to your closet sections.");
      return;
    }
    setBuilding(true);
    try {
      const uniqueTags = [...new Set(rows.map((r) => r.tag))];
      const missing = uniqueTags.filter((tag) => sectionImages[tag] === undefined);
      const next = { ...sectionImages };
      await Promise.all(
        missing.map((tag) =>
          fetchImagesForSection(tag)
            .then((urls) => { next[tag] = urls || []; })
            .catch(() => { next[tag] = []; })
        )
      );
      setSectionImages(next);
      setBoard(rows);
    } finally {
      setBuilding(false);
    }
  };

  const keyFor = (day, tag) => `${day}::${tag}`;

  const cycleImg = (day, tag, dir, total) => {
    if (!total) return;
    const k = keyFor(day, tag);
    setImgIdx((prev) => ({ ...prev, [k]: ((prev[k] || 0) + dir + total) % total }));
  };

  // Toggle whether a specific image is selected to pack for a specific day.
  const togglePick = (url, sectionLabel, day) => {
    setPicked((prev) => {
      const next = { ...prev };
      if (next[url]) delete next[url];
      else next[url] = { section: sectionLabel, day };
      return next;
    });
  };

  const pickedCount = Object.keys(picked).length;

  // Add all selected images to the Travel Pack — each lands on ITS OWN day.
  const addVisualToPack = () => {
    const images = Object.entries(picked).map(([url, { section, day }]) => ({ url, section, day }));
    if (!images.length) return;
    if (onAddImages) onAddImages(images);
    setSavedFlash(true);
    setTimeout(() => {
      setSavedFlash(false);
      // On phone, return to the Travel Pack after saving.
      if (isPhone()) (onSaved || onClose)?.();
    }, 1200);
  };

  // Parse response lines per-day and add as text items to their own day.
  const addAllToPack = () => {
    if (!response || !onAddItem) return;
    const dayChunks = splitByDay(response);
    const source = dayChunks.length ? dayChunks : [{ day: selectedDay, text: response }];
    source.forEach(({ day, text }) => {
      const lines = text
        .split("\n")
        .map((l) => l.replace(/^[•\-*]\s*/, "").trim())
        .filter(
          (l) =>
            l &&
            !/^[👕👖👗👟👜🧥🗓️]/.test(l) &&
            !l.startsWith("Pro tip") &&
            l.length > 2,
        );
      lines.forEach((item) => onAddItem({ name: item, kind: "text", day }));
    });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  };

  // ── Saved packing lists ────────────────────────────────────────────────────
  const persistLists = (list) => {
    setSavedLists(list);
    try { syncSetItem(SAVED_LISTS_KEY, JSON.stringify(list)); } catch {}
  };

  const saveList = () => {
    if (!board) return;
    const items = board
      .map((row) => {
        const k = keyFor(row.day, row.tag);
        const imgs = sectionImages[row.tag] || [];
        const idx = imgIdx[k] || 0;
        return imgs.length ? { day: row.day, label: row.label, tag: row.tag, url: imgs[idx] } : null;
      })
      .filter(Boolean);
    if (!items.length) return;

    const saved = {
      id: Date.now(),
      date: new Date().toLocaleDateString(),
      destination: destination.trim(),
      tripType,
      gender,
      days: selectedDays,
      items,
    };
    persistLists([saved, ...savedLists]);
    setSavedOpen(true);
  };

  const deleteList = (id) => persistLists(savedLists.filter((l) => l.id !== id));

  // Re-apply a saved list's items back into the Travel Pack, on the SAME days
  // they were originally built for — lets a user recover from an accidental
  // delete, or reuse a past trip's plan for a new one.
  const applyList = (list) => {
    if (!onAddImages) return;
    onAddImages(list.items.map((it) => ({ url: it.url, section: it.label, day: it.day })));
    setSavedFlash(true);
    setTimeout(() => {
      setSavedFlash(false);
      if (isPhone()) (onSaved || onClose)?.();
    }, 1200);
  };

  const listGender = (l) => l.gender || "female";
  const visibleLists = savedLists.filter((l) => listGender(l) === gender);

  const reset = () => {
    abortRef.current?.abort();
    setResponse("");
    setError("");
    setGenerated(false);
    setStreaming(false);
    setDestination("");
    setTripType("");
    setSelectedDays([]);
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
          <div className="aipa-header__actions">
            {visibleLists.length > 0 && (
              <button
                className={`aipa-header__btn${savedOpen ? " is-active" : ""}`}
                onClick={() => setSavedOpen((v) => !v)}
                title="Saved packing lists"
              >
                {gender === "male" ? "👔" : "👗"}
              </button>
            )}
            <button className="aipa-header__close" onClick={onClose} aria-label="Close">×</button>
          </div>
        </header>

        {/* Saved packing lists drawer */}
        {savedOpen && (
          <div className="aipa-saved">
            <div className="aipa-saved__head">
              <h3 className="aipa-saved__title">Saved Packing Lists ({visibleLists.length})</h3>
              <button className="aipa-saved__close" onClick={() => setSavedOpen(false)}>✕</button>
            </div>
            {visibleLists.length === 0 ? (
              <p className="aipa-saved__empty">No saved packing lists yet.</p>
            ) : (
              visibleLists.map((l) => {
                // Flat image list for this saved plan (used for lightbox
                // prev/next across the whole plan, not just one day).
                const lightboxImages = l.items.map((it) => ({ src: it.url, alt: `${it.day} — ${it.label}` }));
                const days = l.days?.length ? l.days : [...new Set(l.items.map((it) => it.day))];
                return (
                  <div key={l.id} className="aipa-saved__list">
                    <div className="aipa-saved__meta">
                      <span className="aipa-saved__date">{l.date}</span>
                      <span className="aipa-saved__trip" title={`${l.destination} — ${l.tripType}`}>
                        {l.destination} · {l.tripType} · {days.join(", ")}
                      </span>
                      <button
                        className="aipa-saved__delete"
                        onClick={() => deleteList(l.id)}
                        aria-label="Delete saved list"
                      >🗑️</button>
                    </div>
                    {/* Each day gets its own row so a multi-day plan doesn't
                        cram every item into one horizontal strip. */}
                    <div className="aipa-saved__days">
                      {days.filter((d) => l.items.some((it) => it.day === d)).map((day) => (
                        <div key={day} className="aipa-saved__day-row">
                          <p className="aipa-saved__day-label">🗓️ {day}</p>
                          <div className="aipa-saved__imgs">
                            {l.items.map((it, i) => ({ it, i })).filter(({ it }) => it.day === day).map(({ it, i }) => (
                              <div key={i} className="aipa-saved__item">
                                <img
                                  src={it.url}
                                  alt={it.label}
                                  className="aipa-saved__img"
                                  onClick={() => setSavedLightbox({ images: lightboxImages, index: i })}
                                  title="Click to enlarge"
                                />
                                <span className="aipa-saved__label">{it.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    {onAddImages && (
                      <button className="aipa-saved__apply" onClick={() => applyList(l)}>
                        📥 Apply to Travel Pack
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {savedLightbox && (
          <Lightbox
            images={savedLightbox.images}
            index={savedLightbox.index}
            onClose={() => setSavedLightbox(null)}
            onChange={(i) => setSavedLightbox((prev) => ({ ...prev, index: i }))}
          />
        )}

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
            </div>

            <div className="aipa-label" style={{ display: "block" }}>
              Which days are you traveling?
              <div className="aipa-days">
                {WEEKDAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`aipa-day-btn${selectedDays.includes(d) ? " is-active" : ""}`}
                    onClick={() => toggleDay(d)}
                    disabled={streaming}
                  >
                    {d.slice(0, 3)}
                  </button>
                ))}
              </div>
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
                disabled={!destination.trim() || !tripType || !selectedDays.length || streaming}
              >
                {streaming ? "✨ Generating…" : "✨ Generate Packing Plan"}
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
                  📋 Packing Plan — {destination} ({tripType})
                </h3>
                <span className="aipa-result__day">{selectedDays.join(", ")}</span>
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
                      {building ? "✨ Building…" : "🧳 Build Visual Plan"}
                    </button>
                  )}
                  {onAddItem && (
                    <button className="aipa-btn aipa-btn--add" onClick={addAllToPack}>
                      ➕ Add Plan (text)
                    </button>
                  )}
                </div>
              )}

              {/* Visual board — pick the actual items to pack, per day */}
              {board && (
                <div className="aipa-board">
                  <p className="aipa-board__hint">
                    Tap the ✓ on each item you want to pack — swap with ‹ › to
                    pick more, then save. Each item lands on the day shown.
                  </p>
                  {selectedDays.filter((d) => board.some((r) => r.day === d)).map((day) => (
                    <div key={day} className="aipa-board__day">
                      <p className="aipa-board__day-label">🗓️ {day}</p>
                      <div className="aipa-board__grid">
                        {board.filter((r) => r.day === day).map((s) => {
                          const k = keyFor(s.day, s.tag);
                          const imgs = sectionImages[s.tag] || [];
                          const idx = imgIdx[k] || 0;
                          const curUrl = imgs[idx];
                          const isPicked = curUrl && !!picked[curUrl];
                          return (
                            <div key={k} className={`aipa-ob-card${isPicked ? " is-picked" : ""}`}>
                              <p className="aipa-ob-card__label">
                                {s.label}{s.qty ? ` · ${s.qty}` : ""}
                              </p>
                              {imgs.length > 0 ? (
                                <>
                                  <img src={imgs[idx]} alt={s.label} className="aipa-ob-card__img" />
                                  <button
                                    className={`aipa-ob-card__pick${isPicked ? " is-on" : ""}`}
                                    onClick={() => togglePick(curUrl, s.label, s.day)}
                                    aria-pressed={isPicked}
                                    title={isPicked ? "Selected to pack — tap to remove" : "Select this item to pack"}
                                  >
                                    {isPicked ? "✓" : "+"}
                                  </button>
                                  {imgs.length > 1 && (
                                    <>
                                      <button className="aipa-ob-card__prev" onClick={() => cycleImg(s.day, s.tag, -1, imgs.length)} aria-label="Previous">‹</button>
                                      <button className="aipa-ob-card__next" onClick={() => cycleImg(s.day, s.tag, 1, imgs.length)} aria-label="Next">›</button>
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
                    </div>
                  ))}
                  <div className="aipa-board__actions">
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
                    <button
                      className="aipa-btn aipa-btn--save-list"
                      onClick={saveList}
                      disabled={pickedCount === 0}
                      title="Keep this plan so you can reapply or reuse it later"
                    >
                      📁 Save This Plan
                    </button>
                  </div>
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
