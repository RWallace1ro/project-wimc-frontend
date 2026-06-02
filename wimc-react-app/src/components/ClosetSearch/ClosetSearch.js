import React, { useState, useRef, useCallback } from "react";
import { fetchImagesByTag } from "../../utils/CloudinaryAPI";
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

const QUICK_SEARCHES = [
  "Show me all my black dresses",
  "Find something casual for the weekend",
  "A formal outfit for a wedding",
  "Comfortable travel outfit",
  "Business casual for the office",
  "Something bright and summery",
];

const TARGET_LABELS = {
  preview: "👗 Add to Outfit Preview",
  planner: "📅 Add to Outfit of the Day",
  pack:    "🧳 Add to Travel Pack",
  donate:  "♻️ Add to Donate Bin",
};

function toThumb(url) {
  return url?.replace("/upload/", "/upload/f_auto,q_auto,w_400,c_limit/") || url;
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
async function identifySections(query) {
  const systemPrompt = `You are WIMC's Natural Language Closet Search assistant.
The user's closet has these categories:
- Dresses/Skirts (tag: dresses-skirts)
- Dress Shirts/Suits (tag: dress-shirts-suits)
- Shoes/Sneakers (tag: shoes-sneakers)
- Pants/Jeans (tag: pants-jeans)
- Tops (tag: tops)
- Bags/Accessories (tag: bags-accessories)
- Jackets/Coats (tag: jackets-coats)

Give a short, friendly 1-2 sentence response, then identify which categories are relevant.
Return a JSON block at the END: {"sections": ["dresses-skirts"]}
Only include the most relevant 1-3 sections. Always include the JSON block.`;

  const res = await fetch(process.env.REACT_APP_ANTHROPIC_PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 300,
      system: systemPrompt,
      messages: [{ role: "user", content: query }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  const fullText = data.content?.[0]?.text || "";
  const jsonMatch = fullText.match(/\{"sections":\s*\[.*?\]\}/s);
  let sections = [];
  if (jsonMatch) {
    try { sections = JSON.parse(jsonMatch[0]).sections || []; } catch {}
  }
  const text = fullText.replace(/\{"sections":\s*\[.*?\]\}/s, "").trim();
  return { text, sections };
}

// ── Step 2: visually filter images to match the query ────────────────────────
async function filterImagesByQuery(imageObjects, userQuery) {
  if (!imageObjects.length) return imageObjects;
  const batch = imageObjects.slice(0, 20); // Vision API limit

  try {
    const content = [
      {
        type: "text",
        text: `The user searched for: "${userQuery}".
Here are ${batch.length} clothing images from their closet (numbered 0 to ${batch.length - 1}).
Look at each image carefully and identify which ones match the user's search, considering color, style, and type.
Respond ONLY with a JSON object: {"matching": [0, 2, 4]}
List indices of images that match. Be selective — only include genuine matches.
If no images clearly match, return {"matching": []}.`,
      },
      ...batch.map(({ url }) => ({
        type: "image",
        source: { type: "url", url },
      })),
    ];

    const res = await fetch(process.env.REACT_APP_ANTHROPIC_PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 150,
        messages: [{ role: "user", content }],
      }),
    });
    const data = await res.json();
    if (!res.ok) return batch; // fallback: show all

    const text = data.content?.[0]?.text || "";
    const jsonMatch = text.match(/\{"matching":\s*\[.*?\]\}/s);
    if (jsonMatch) {
      const { matching } = JSON.parse(jsonMatch[0]);
      if (Array.isArray(matching)) {
        const matchSet = new Set(matching);
        const filtered = batch.filter((_, i) => matchSet.has(i));
        // If nothing matched, return all so user isn't left empty-handed
        return filtered.length > 0 ? filtered : batch;
      }
    }
  } catch {}
  return batch; // fallback on any error
}

export default function ClosetSearch({
  isOpen,
  onClose,
  onSectionSelect,
  onApplyItems,   // (items) — required when target is set
  target = null,  // "preview"|"planner"|"pack"|"donate"|null
  tagPrefix = "", // Kids Closet: "kid-{id}"
}) {
  const [query, setQuery] = useState("");
  const [resultText, setResultText] = useState("");
  const [sections, setSections] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  const [filteringImages, setFilteringImages] = useState(false);
  const [resultImages, setResultImages] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [applyFeedback, setApplyFeedback] = useState("");
  const [error, setError] = useState("");
  const abortRef = useRef(null);
  const inputRef = useRef(null);

  const hasResult = !!resultText;
  const hasImages = resultImages.length > 0;
  const selectedCount = selected.size;

  const handleSearch = async (searchQuery) => {
    const q = (searchQuery || query).trim();
    if (!q || streaming) return;

    setResultText("");
    setSections([]);
    setResultImages([]);
    setSelected(new Set());
    setError("");
    setStreaming(true);

    try {
      // Step 1 — identify relevant sections
      const { text, sections: secs } = await identifySections(q);
      setResultText(text);
      setSections(secs);
      setStreaming(false);

      if (!secs.length) return;

      // Step 2 — fetch all images from matched sections
      setLoadingImages(true);
      const fetchPromises = secs.map((sectionTag) => {
        const effectiveTag = tagPrefix ? `${tagPrefix}-${sectionTag}` : sectionTag;
        return fetchImagesByTag(effectiveTag).then((urls) =>
          (urls || []).map((url) => ({ url, sectionTag }))
        );
      });
      const nested = await Promise.all(fetchPromises);
      const flat = nested.flat();
      setLoadingImages(false);

      if (!flat.length) return;

      // Step 3 — visually filter images to match the query
      setFilteringImages(true);
      const filtered = await filterImagesByQuery(flat, q);
      setFilteringImages(false);

      setResultImages(filtered);
      setSelected(new Set(filtered.map((x) => x.url))); // auto-select all matches
    } catch (e) {
      if (e.name !== "AbortError") setError(`Error: ${e.message}`);
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
  const clearAll  = () => setSelected(new Set());

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

  const reset = () => {
    abortRef.current?.abort();
    setQuery("");
    setResultText("");
    setSections([]);
    setResultImages([]);
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
          <button className="cs-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className="cs-body">
          {/* Search input */}
          <div className="cs-search-row">
            <input
              ref={inputRef}
              className="cs-input"
              type="text"
              placeholder="e.g. Show me all my black dresses…"
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
                {QUICK_SEARCHES.map((s) => (
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
              <p className="cs-result__text">{resultText}</p>

              {/* Section nav (fallback when no images found) */}
              {!hasImages && !isLoading && sections.length > 0 && (
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
                      <button className="cs-mini-btn" onClick={clearAll}>Clear</button>
                    </div>
                  </div>

                  <div className="cs-image-grid">
                    {resultImages.map(({ url, sectionTag }, i) => {
                      const isSelected = selected.has(url);
                      const sec = SECTIONS.find((s) => s.tag === sectionTag);
                      return (
                        <div
                          key={url + i}
                          className={`cs-image-tile${isSelected ? " is-selected" : ""}`}
                          onClick={() => toggleSelect(url)}
                        >
                          <img
                            className="cs-image-tile__img"
                            src={toThumb(url)}
                            alt={sec?.label || sectionTag}
                            loading="lazy"
                          />
                          <div className="cs-image-tile__check">{isSelected ? "✓" : ""}</div>
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

          {error && <p className="cs-error">{error}</p>}
        </div>
      </div>
    </div>
  );
}
