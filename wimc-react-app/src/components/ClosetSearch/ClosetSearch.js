import React, { useState, useRef, useCallback, useEffect } from "react";
import { fetchImagesByTag } from "../../utils/CloudinaryAPI";
import { aiProxyFetch } from "../../utils/aiProxy";
import { syncSetItem } from "../../utils/syncStore";
import { sectionTagsWithSubs } from "../../utils/closetSubsections";
import ApiErrorMessage from "../common/ApiErrorMessage";
import FormattedText from "../common/FormattedText";
import "./ClosetSearch.css";

const SECTIONS = [
  { tag: "dresses-skirts",    label: "Dresses/Skirts",    emoji: "👗" },
  { tag: "dress-shirts-suits",label: "Dress Shirts/Suits",emoji: "👔" },
  { tag: "shoes-sneakers",    label: "Shoes/Sneakers",    emoji: "👟" },
  { tag: "pants-jeans",       label: "Pants/Jeans",       emoji: "👖" },
  { tag: "tops",              label: "Tops",              emoji: "👕" },
  { tag: "bags-accessories",  label: "Bags/Accessories",  emoji: "👜" },
  { tag: "jackets-coats",     label: "Jackets/Coats",     emoji: "🧥" },
];

// Gender-specific quick-search examples + input placeholder
function getQuickSearches(gender) {
  if (gender === "male") {
    return [
      "Show me all my dress shirts",
      "Find something casual for the weekend",
      "A formal suit for a wedding",
      "Comfortable travel outfit",
      "Business casual for the office",
      "Something light for summer",
    ];
  }
  return [
    "Show me all my black dresses",
    "Find something casual for the weekend",
    "A formal outfit for a wedding",
    "Comfortable travel outfit",
    "Business casual for the office",
    "Something bright and summery",
  ];
}

function getPlaceholder(gender) {
  return gender === "male"
    ? "e.g. Show me all my dress shirts…"
    : "e.g. Show me all my black dresses…";
}

const TARGET_LABELS = {
  preview: "👗 Add to Outfit Preview",
  planner: "📅 Add to Outfit of the Day",
  pack:    "🧳 Add to Travel Pack",
  donate:  "♻️ Add to Donate Bin",
};

function toThumb(url) {
  return url?.replace("/upload/", "/upload/f_auto,q_auto,w_400,c_limit/") || url;
}

// Drop exact-duplicate images (same Cloudinary URL) so a single item never
// shows more than once. Different photos / colours keep their own URL.
function dedupeByUrl(arr) {
  const seen = new Set();
  return arr.filter((x) => {
    if (seen.has(x.url)) return false;
    seen.add(x.url);
    return true;
  });
}

// POST to the Anthropic proxy with automatic retry on transient failures.
// Fixes the "had to click 2–3 times" issue when the first request hiccups.
async function postProxy(body, retries = 2) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await aiProxyFetch(body, { feature: "ai_closet_search" });
      const data = await res.json();
      if (!res.ok) {
        // The server sends `error` as a friendly string (e.g. the daily-limit
        // notice). Surface that rather than a bare "HTTP 429".
        const msg =
          (typeof data?.error === "string" ? data.error : data?.error?.message) ||
          `HTTP ${res.status}`;
        // Only retry transient 5xx errors. A 429 (limit) or other 4xx won't
        // succeed on retry, so fail fast with the server's message.
        if (res.status >= 500) {
          lastErr = new Error(msg);
        } else {
          throw new Error(msg);
        }
      } else {
        return data;
      }
    } catch (e) {
      lastErr = e;
    }
    // brief backoff before retrying
    if (attempt < retries) await new Promise((r) => setTimeout(r, 600));
  }
  throw lastErr || new Error("Request failed");
}
function normalizeForPanels(url, sectionTag) {
  return {
    mediaType: "image",
    mediaUrl: url,
    mediaThumb: toThumb(url),
    mediaPoster: "",
    name: "",
    section: sectionTag || "",
  };
}

// ── Step 1: identify sections from query ─────────────────────────────────────
async function identifySections(query, gender = "female", sectionOptions = null) {
  // Only offer the categories that exist for THIS closet, so the AI never
  // returns a section that doesn't apply. sectionOptions (e.g. Pet Closet)
  // overrides the gender-based default list with custom labels.
  let categoryList;
  if (sectionOptions && sectionOptions.length) {
    categoryList = sectionOptions
      .map((o) => `- ${o.label.replace(/^[^\w]+\s*/, "")} (tag: ${o.value})`)
      .join("\n");
  } else {
    const firstCat = gender === "male"
      ? "- Dress Shirts/Suits (tag: dress-shirts-suits)"
      : "- Dresses/Skirts (tag: dresses-skirts)";
    categoryList = `${firstCat}
- Shoes/Sneakers (tag: shoes-sneakers)
- Pants/Jeans (tag: pants-jeans)
- Tops (tag: tops)
- Bags/Accessories (tag: bags-accessories)
- Jackets/Coats (tag: jackets-coats)`;
  }
  const systemPrompt = `You are WIMC's Natural Language Closet Search assistant.
The user's closet has these categories:
${categoryList}

Give a short, friendly 1-2 sentence response, then identify which categories are relevant.
Return a JSON block at the END: {"sections": ["tops"]}
Only include the most relevant 1-3 sections from the list above. Always include the JSON block.`;

  const data = await postProxy({
    model: "claude-sonnet-4-5",
    max_tokens: 300,
    system: systemPrompt,
    messages: [{ role: "user", content: query }],
  });
  const fullText = data.content?.[0]?.text || "";
  // Tolerant of whitespace/newlines around the braces and colon — Claude
  // doesn't always format the JSON block identically (e.g. `{ "sections":`
  // with a space, or split across lines inside a ```json fence), and the
  // tight `{"sections":` pattern silently failed to match those, leaving the
  // raw JSON visible in the response and `sections` empty until the user
  // retried.
  const JSON_RE = /\{\s*"sections"\s*:\s*\[[^\]]*\]\s*\}/is;
  const jsonMatch = fullText.match(JSON_RE);
  let sections = [];
  if (jsonMatch) {
    try { sections = JSON.parse(jsonMatch[0]).sections || []; } catch {}
  }
  const text = fullText
    .replace(JSON_RE, "")
    .replace(/```(?:json)?/gi, "") // strip any leftover markdown code fence
    .trim();
  return { text, sections };
}

// ── Step 2: visually filter images to match the query ────────────────────────
// Returns { matched: [...], errored: false }
// - matched: the images the vision model confirmed match the query
// - errored: true if the API failed (caller shows all as fallback)
async function filterImagesByQuery(imageObjects, userQuery) {
  if (!imageObjects.length) return { matched: [], errored: false };
  const batch = imageObjects.slice(0, 20); // Vision API limit

  try {
    // Interleave a numbered text label BEFORE each image so the model can
    // reliably map its answer back to the correct index.
    const content = [
      {
        type: "text",
        text: `The user is searching their clothing closet for: "${userQuery}".

I will show you ${batch.length} clothing items, each labeled "Item 0", "Item 1", etc.

Your job: identify ONLY the items that genuinely match ALL aspects of the search.
- If the search names ONE color (e.g. "black dresses"), the item's MAIN color must be that color. A mostly-white dress with black trim is NOT a black dress. Be strict about color.
- If the search names TWO OR MORE colors together (e.g. "red and white sneakers"), the item must clearly show BOTH of those colors as significant colors on the item — reject an item that only has ONE of the named colors, even if it's a strong match on that one color (e.g. all-white sneakers with zero red must be REJECTED; all-red sneakers with zero white must be REJECTED). Only a sneaker that is genuinely BOTH red AND white counts.
- If the search names a TYPE (e.g. "dress", "jacket"), the item must be that type.
- If the search names a STYLE/occasion (e.g. "formal", "casual"), judge by the garment's look.

First, go through EACH item one at a time and note its actual colors in one short line, e.g.:
Item 0: white with black sole — no red, reject
Item 1: red and white — match
Item 2: all black — reject

Then, on its own line at the very end, give ONLY a JSON object listing the item numbers that matched:
{"matching": [0, 3]}

If NONE of the items match the search, end with exactly: {"matching": []}`,
      },
    ];
    batch.forEach((obj, i) => {
      // Use a moderate-size thumbnail for faster, reliable vision analysis
      const visionUrl = obj.url?.replace("/upload/", "/upload/f_auto,q_auto,w_500,c_limit/") || obj.url;
      content.push({ type: "text", text: `Item ${i}:` });
      content.push({ type: "image", source: { type: "url", url: visionUrl } });
    });

    const data = await postProxy({
      model: "claude-sonnet-4-5",
      // Bumped up from 200 — the per-item color reasoning (added to reduce
      // false-positive color matches, e.g. plain white sneakers matching a
      // "red and white sneakers" search) needs room for a line per item
      // before the final JSON verdict.
      max_tokens: 800,
      messages: [{ role: "user", content }],
    });

    const text = data.content?.[0]?.text || "";
    // Same whitespace tolerance as identifySections' JSON_RE above.
    const jsonMatch = text.match(/\{\s*"matching"\s*:\s*\[[^\]]*\]\s*\}/is);
    if (jsonMatch) {
      const { matching } = JSON.parse(jsonMatch[0]);
      if (Array.isArray(matching)) {
        const matchSet = new Set(matching);
        const filtered = batch.filter((_, i) => matchSet.has(i));
        // Respect an explicit empty result — do NOT fall back to all,
        // otherwise a "black dresses" search wrongly shows every colour.
        return { matched: filtered, errored: false };
      }
    }
    return { matched: batch, errored: true }; // unparseable → show all
  } catch {
    return { matched: batch, errored: true }; // network error → show all
  }
}

export default function ClosetSearch({
  isOpen,
  onClose,
  onSectionSelect,
  onApplyItems,   // (items) — required when target is set
  target = null,  // "preview"|"planner"|"pack"|"donate"|null
  tagPrefix = "", // Kids Closet: "kid-{id}" or main male closet: "male"
  gender = "female", // restricts the AI to this closet's sections
  sectionOptions = null, // Pet Closet: custom [{value,label}] section list
}) {
  const [query, setQuery] = useState("");
  const [resultText, setResultText] = useState("");
  const [sections, setSections] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  const [filteringImages, setFilteringImages] = useState(false);
  const [resultImages, setResultImages] = useState([]);
  const [noMatches, setNoMatches] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [applyFeedback, setApplyFeedback] = useState("");
  const [error, setError] = useState("");
  const abortRef = useRef(null);
  const inputRef = useRef(null);

  // ── Saved searches (persist results so they can be reopened later) ──
  // Scope per closet so kids/pet/main closets keep their own saved searches.
  const savedKey = `wimc_saved_searches:${tagPrefix || gender || "main"}`;
  const [savedSearches, setSavedSearches] = useState([]);
  const [showSaved, setShowSaved] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [lightboxIdx, setLightboxIdx] = useState(-1); // -1 = closed

  useEffect(() => {
    if (!isOpen) return;
    try {
      const raw = localStorage.getItem(savedKey);
      setSavedSearches(raw ? JSON.parse(raw) : []);
    } catch {
      setSavedSearches([]);
    }
  }, [isOpen, savedKey]);

  // This component stays mounted (only its own `isOpen` toggles visibility),
  // so a search's results otherwise linger even after switching to a
  // different closet (male/female toggle, or a different kid/pet). Clear the
  // stale search whenever the closet identity changes.
  useEffect(() => {
    setQuery("");
    setResultText("");
    setSections([]);
    setResultImages([]);
    setNoMatches(false);
    setSelected(new Set());
    setError("");
  }, [gender, tagPrefix]);

  const persistSaved = (list) => {
    setSavedSearches(list);
    try { syncSetItem(savedKey, JSON.stringify(list)); } catch {}
  };

  // ── Lightbox navigation (scroll through all result images) ──
  const lbClose = useCallback(() => setLightboxIdx(-1), []);
  const lbPrev = useCallback(
    () => setLightboxIdx((i) => (i > 0 ? i - 1 : resultImages.length - 1)),
    [resultImages.length],
  );
  const lbNext = useCallback(
    () => setLightboxIdx((i) => (i < resultImages.length - 1 ? i + 1 : 0)),
    [resultImages.length],
  );
  useEffect(() => {
    if (lightboxIdx < 0) return;
    const onKey = (e) => {
      if (e.key === "Escape") lbClose();
      if (e.key === "ArrowLeft") lbPrev();
      if (e.key === "ArrowRight") lbNext();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightboxIdx, lbClose, lbPrev, lbNext]);

  const hasResult = !!resultText;
  const hasImages = resultImages.length > 0;
  const selectedCount = selected.size;

  const handleSearch = async (searchQuery) => {
    const q = (searchQuery || query).trim();
    if (!q || streaming) return;

    setResultText("");
    setSections([]);
    setResultImages([]);
    setNoMatches(false);
    setSelected(new Set());
    setError("");
    setStreaming(true);

    try {
      // Step 1 — identify relevant sections
      const { text, sections: secs } = await identifySections(q, gender, sectionOptions);
      setResultText(text);
      setSections(secs);
      setStreaming(false);

      if (!secs.length) return;

      // Step 2 — fetch all images from matched sections (incl. their
      // sub-sections, so items sorted into sub-sections are still found).
      setLoadingImages(true);
      const fetchPromises = secs.map((sectionTag) => {
        const effectiveTag = tagPrefix ? `${tagPrefix}-${sectionTag}` : sectionTag;
        const tags = sectionTagsWithSubs(effectiveTag);
        return Promise.all(
          tags.map((t) => fetchImagesByTag(t).catch(() => []))
        ).then((lists) =>
          lists.flat().map((url) => ({ url, sectionTag }))
        );
      });
      const nested = await Promise.all(fetchPromises);
      const flat = dedupeByUrl(nested.flat());
      setLoadingImages(false);

      if (!flat.length) return;

      // Step 3 — visually filter images to match the query
      setFilteringImages(true);
      const { matched, errored } = await filterImagesByQuery(flat, q);
      setFilteringImages(false);

      setResultImages(matched);
      setSelected(new Set(matched.map((x) => x.url))); // auto-select all matches
      // Show a clear message when the vision model found no genuine matches
      setNoMatches(matched.length === 0 && !errored);
    } catch (e) {
      if (e.name !== "AbortError") setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setStreaming(false);
      setLoadingImages(false);
      setFilteringImages(false);
    }
  };

  const toggleSelect = (url) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(resultImages.map((x) => x.url)));

  // Remove the currently-selected items from the results grid
  const removeSelected = () => {
    setResultImages((prev) => prev.filter((x) => !selected.has(x.url)));
    setSelected(new Set());
  };

  // Remove a single item from the results grid (trash-can on each tile)
  const removeOne = (url) => {
    setResultImages((prev) => prev.filter((x) => x.url !== url));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(url);
      return next;
    });
  };

  const handleApply = useCallback(() => {
    const chosenItems = resultImages
      .filter((x) => selected.has(x.url))
      .map((x) => normalizeForPanels(x.url, x.sectionTag));
    if (!chosenItems.length) {
      setApplyFeedback("No items selected.");
      setTimeout(() => setApplyFeedback(""), 2000);
      return;
    }
    onApplyItems?.(chosenItems);
    setApplyFeedback(`✅ ${chosenItems.length} item${chosenItems.length !== 1 ? "s" : ""} added!`);
    setTimeout(() => setApplyFeedback(""), 2500);
  }, [resultImages, selected, onApplyItems]);

  // Save the current results (query + matched images) so they can be reopened.
  const saveCurrentSearch = () => {
    if (!resultImages.length) return;
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      query: (query || resultText || "Search").trim().slice(0, 80),
      ts: Date.now(),
      items: resultImages.map(({ url, sectionTag }) => ({ url, sectionTag })),
    };
    persistSaved([entry, ...savedSearches].slice(0, 50));
    setSaveMsg("✅ Search saved");
    setTimeout(() => setSaveMsg(""), 2000);
  };

  // Reopen a saved search — load its images back into the results grid.
  // Keep the Saved drawer open so the results appear right below it and the
  // user can pick another saved search without re-opening the drawer.
  const openSaved = (s) => {
    const items = dedupeByUrl(s.items || []);
    setQuery(s.query || "");
    setResultText(`Saved search: "${s.query}"`);
    setSections([]);
    setNoMatches(false);
    setResultImages(items);
    setSelected(new Set(items.map((x) => x.url)));
    setError("");
  };

  const deleteSaved = (id) =>
    persistSaved(savedSearches.filter((s) => s.id !== id));

  const reset = () => {
    abortRef.current?.abort();
    setQuery("");
    setResultText("");
    setSections([]);
    setResultImages([]);
    setNoMatches(false);
    setSelected(new Set());
    setError("");
    setStreaming(false);
    setLoadingImages(false);
    setFilteringImages(false);
    setApplyFeedback("");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  if (!isOpen) return null;

  const isLoading = streaming || loadingImages || filteringImages;
  const loadingMsg = streaming
    ? "Searching your closet…"
    : loadingImages
    ? "Loading your items…"
    : "Analysing images…";

  return (
    <div
      className="cs-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="cs-modal" role="dialog" aria-label="Closet Search">
        <header className="cs-header">
          <div className="cs-header__left">
            <span className="cs-header__icon">🔍</span>
            <div>
              <h2 className="cs-header__title">Search My Closet</h2>
              <p className="cs-header__sub">Describe what you're looking for in plain English</p>
            </div>
          </div>
          <div className="cs-header__actions">
            <button
              className="cs-header__reset"
              onClick={() => setShowSaved((v) => !v)}
              title="View your saved searches"
            >
              {gender === "male" ? "👔" : "👗"} Saved{savedSearches.length ? ` (${savedSearches.length})` : ""}
            </button>
            {(query || hasResult || resultImages.length > 0) && (
              <button className="cs-header__reset" onClick={reset} title="Start a new search">🔄 New</button>
            )}
            <button className="cs-close" onClick={onClose} aria-label="Close">×</button>
          </div>
        </header>

        <div className="cs-body">
          {/* Saved searches drawer */}
          {showSaved && (
            <div className="cs-saved">
              <p className="cs-saved__title">{gender === "male" ? "👔" : "👗"} Saved Searches</p>
              {savedSearches.length === 0 ? (
                <p className="cs-saved__empty">
                  No saved searches yet. Run a search, then tap 💾 Save to keep
                  the results here.
                </p>
              ) : (
                <ul className="cs-saved__list">
                  {savedSearches.map((s) => (
                    <li key={s.id} className="cs-saved__item">
                      <button
                        className="cs-saved__open"
                        onClick={() => openSaved(s)}
                        title="Reopen this search"
                      >
                        <span className="cs-saved__q">{s.query}</span>
                        <span className="cs-saved__meta">
                          {(s.items || []).length} item
                          {(s.items || []).length !== 1 ? "s" : ""}
                          {" · "}
                          {new Date(s.ts).toLocaleDateString()}
                        </span>
                      </button>
                      <button
                        className="cs-saved__del"
                        onClick={() => deleteSaved(s.id)}
                        title="Delete saved search"
                        aria-label="Delete saved search"
                      >
                        🗑️
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Search input */}
          <div className="cs-search-row">
            <input
              ref={inputRef}
              className="cs-input"
              type="text"
              placeholder={getPlaceholder(gender)}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
              disabled={isLoading}
              autoFocus
            />
            <button
              className="cs-search-btn"
              onClick={() => handleSearch()}
              disabled={!query.trim() || isLoading}
            >
              {isLoading ? "…" : "🔍"}
            </button>
          </div>

          {/* Quick searches */}
          {!hasResult && !isLoading && (
            <div className="cs-quick">
              <p className="cs-quick__label">Try a quick search:</p>
              <div className="cs-quick__chips">
                {getQuickSearches(gender).map((s) => (
                  <button key={s} className="cs-chip" onClick={() => { setQuery(s); handleSearch(s); }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="cs-thinking">
              <span className="cs-cursor">▋</span> {loadingMsg}
            </div>
          )}

          {/* Result */}
          {hasResult && (
            <div className="cs-result">
              <p className="cs-result__text"><FormattedText text={resultText} /></p>

              {/* No genuine matches found */}
              {!hasImages && !isLoading && noMatches && (
                <p className="cs-no-matches">
                  No items in your closet match that search. Try a different
                  colour, style, or description.
                </p>
              )}

              {/* Section nav (fallback when no images found) */}
              {!hasImages && !isLoading && !noMatches && sections.length > 0 && (
                <>
                  <p className="cs-result__heading">Matching sections:</p>
                  <div className="cs-result__sections">
                    {sections.map((tag) => {
                      const sec = SECTIONS.find((s) => s.tag === tag);
                      if (!sec) return null;
                      return (
                        <button
                          key={tag}
                          className="cs-section-btn"
                          onClick={() => { onSectionSelect?.(tag); onClose(); }}
                        >
                          <span className="cs-section-btn__emoji">{sec.emoji}</span>
                          <span className="cs-section-btn__label">{sec.label}</span>
                          <span className="cs-section-btn__arrow">→</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Image results */}
              {hasImages && (
                <>
                  <div className="cs-results-bar">
                    <span className="cs-results-count">
                      {resultImages.length} matching item{resultImages.length !== 1 ? "s" : ""}
                      {selectedCount > 0 && ` · ${selectedCount} selected`}
                    </span>
                    <div className="cs-results-actions">
                      <button className="cs-mini-btn" onClick={selectAll}>Select All</button>
                      <button
                        className="cs-mini-btn cs-mini-btn--save"
                        onClick={saveCurrentSearch}
                        title="Save these results to reopen later"
                      >
                        💾 Save
                      </button>
                      <button
                        className="cs-mini-btn cs-mini-btn--danger"
                        onClick={removeSelected}
                        disabled={selectedCount === 0}
                        title="Remove the selected items from these results"
                      >
                        Remove Selected
                      </button>
                    </div>
                  </div>
                  {saveMsg && <p className="cs-apply-feedback">{saveMsg}</p>}

                  <div className="cs-image-grid">
                    {resultImages.map(({ url, sectionTag }, i) => {
                      const isSelected = selected.has(url);
                      const sec = SECTIONS.find((s) => s.tag === sectionTag);
                      return (
                        <div
                          key={url + i}
                          className={`cs-image-tile${isSelected ? " is-selected" : ""}`}
                        >
                          {/* Click the image to expand it (like the closet cards) */}
                          <img
                            className="cs-image-tile__img"
                            src={toThumb(url)}
                            alt={sec?.label || sectionTag}
                            onClick={() => setLightboxIdx(i)}
                            title="Click to enlarge"
                          />
                          {/* Checkmark — click to select / deselect for Save & Apply */}
                          <button
                            className="cs-image-tile__check"
                            onClick={(e) => { e.stopPropagation(); toggleSelect(url); }}
                            title={isSelected ? "Selected — click to deselect" : "Click to select"}
                            aria-pressed={isSelected}
                          >
                            {isSelected ? "✓" : ""}
                          </button>
                          {/* Trash-can — remove this item from results */}
                          <button
                            className="cs-image-tile__remove"
                            onClick={(e) => { e.stopPropagation(); removeOne(url); }}
                            title="Remove from results"
                            aria-label="Remove from results"
                          >
                            🗑️
                          </button>
                          {sec && (
                            <div className="cs-image-tile__label">{sec.emoji} {sec.label}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Apply button — only shown when target is set */}
                  {target && (
                    <div className="cs-apply-bar">
                      <button
                        className="cs-apply-btn cs-apply-btn--primary"
                        onClick={handleApply}
                        disabled={!selectedCount}
                      >
                        {TARGET_LABELS[target] || "Add selected items"}
                      </button>
                      {applyFeedback && (
                        <p className="cs-apply-feedback">{applyFeedback}</p>
                      )}
                    </div>
                  )}
                </>
              )}

              <button className="cs-btn" onClick={reset}>🔄 New Search</button>
            </div>
          )}

          {error && <ApiErrorMessage className="cs-error" message={error} />}
        </div>
      </div>

      {/* ── Fullscreen viewer (matches the closet section cards) ── */}
      {lightboxIdx >= 0 && resultImages[lightboxIdx] && (
        <div
          className="cs-lightbox"
          onClick={lbClose}
          role="dialog"
          aria-label="Fullscreen image viewer"
        >
          <button className="cs-lightbox__close" onClick={lbClose} aria-label="Close fullscreen view">✕</button>
          <span className="cs-lightbox__counter">
            {lightboxIdx + 1} / {resultImages.length}
          </span>
          {resultImages.length > 1 && (
            <button
              className="cs-lightbox__nav cs-lightbox__nav--prev"
              onClick={(e) => { e.stopPropagation(); lbPrev(); }}
              aria-label="Previous image"
            >
              ‹
            </button>
          )}
          <img
            src={resultImages[lightboxIdx].url}
            alt={`fullscreen-${lightboxIdx}`}
            className="cs-lightbox__img"
            onClick={(e) => e.stopPropagation()}
          />
          {resultImages.length > 1 && (
            <button
              className="cs-lightbox__nav cs-lightbox__nav--next"
              onClick={(e) => { e.stopPropagation(); lbNext(); }}
              aria-label="Next image"
            >
              ›
            </button>
          )}
        </div>
      )}
    </div>
  );
}
