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
  "Show me all my dresses",
  "Find something casual for the weekend",
  "A formal outfit for a wedding",
  "Comfortable travel outfit",
  "Business casual for the office",
  "Something bright and summery",
  "Cozy winter layers",
];

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

export default function ClosetSearch({
  isOpen,
  onClose,
  onSectionSelect,
  onApplyItems,   // (items, target) — called when user applies results
  tagPrefix = "", // Kids Closet: "kid-{id}"
}) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);      // { text, sections[] }
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const [loadingImages, setLoadingImages] = useState(false);
  const [resultImages, setResultImages] = useState([]); // [{ url, sectionTag }]
  const [selected, setSelected] = useState(new Set());  // Set of urls
  const [applyFeedback, setApplyFeedback] = useState(""); // toast
  const abortRef = useRef(null);
  const inputRef = useRef(null);

  const systemPrompt = `You are WIMC's Natural Language Closet Search assistant.

The user's closet has these exact categories:
- Dresses/Skirts (tag: dresses-skirts)
- Dress Shirts/Suits (tag: dress-shirts-suits)
- Shoes/Sneakers (tag: shoes-sneakers)
- Pants/Jeans (tag: pants-jeans)
- Tops (tag: tops)
- Bags/Accessories (tag: bags-accessories)
- Jackets/Coats (tag: jackets-coats)

When the user describes what they're looking for, you must:
1. Give a short, friendly 1-2 sentence response describing the look
2. Identify which closet categories are most relevant
3. Return a JSON block at the END of your response in this exact format:
{"sections": ["dresses-skirts", "tops"]}

Only include the most relevant 1-3 sections. Always include the JSON block.`;

  const handleSearch = async (searchQuery) => {
    const q = (searchQuery || query).trim();
    if (!q || streaming) return;
    setResult(null);
    setResultImages([]);
    setSelected(new Set());
    setError("");
    setStreaming(true);

    try {
      abortRef.current = new AbortController();
      const res = await fetch(process.env.REACT_APP_ANTHROPIC_PROXY_URL, {
        method: "POST",
        signal: abortRef.current.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 400,
          system: systemPrompt,
          messages: [{ role: "user", content: q }],
        }),
      });

      const responseData = await res.json();
      if (!res.ok) {
        const detail = responseData?.error?.message || `HTTP ${res.status}`;
        throw new Error(String(detail));
      }
      const fullText = responseData.content?.[0]?.text || "";

      let sections = [];
      const jsonMatch = fullText.match(/\{"sections":\s*\[.*?\]\}/s);
      if (jsonMatch) {
        try { sections = JSON.parse(jsonMatch[0]).sections || []; } catch {}
      }
      const text = fullText.replace(/\{"sections":\s*\[.*?\]\}/s, "").trim();
      setResult({ text, sections });

      // ── Fetch actual images from matched sections ─────────────────────────
      if (sections.length > 0) {
        setLoadingImages(true);
        try {
          const fetchPromises = sections.map((sectionTag) => {
            const effectiveTag = tagPrefix ? `${tagPrefix}-${sectionTag}` : sectionTag;
            return fetchImagesByTag(effectiveTag).then((urls) =>
              (urls || []).map((url) => ({ url, sectionTag }))
            );
          });
          const nested = await Promise.all(fetchPromises);
          const flat = nested.flat();
          setResultImages(flat);
          // Auto-select all images initially
          setSelected(new Set(flat.map((x) => x.url)));
        } catch {
          // Images failed to load — user can still navigate to section
        } finally {
          setLoadingImages(false);
        }
      }
    } catch (e) {
      if (e.name !== "AbortError") setError(`Error: ${e.message}`);
    } finally {
      setStreaming(false);
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

  const selectAll  = () => setSelected(new Set(resultImages.map((x) => x.url)));
  const clearAll   = () => setSelected(new Set());

  const handleApply = useCallback((target) => {
    const chosenItems = resultImages
      .filter((x) => selected.has(x.url))
      .map((x) => normalizeForPanels(x.url, x.sectionTag));

    if (!chosenItems.length) {
      setApplyFeedback("No items selected.");
      setTimeout(() => setApplyFeedback(""), 2000);
      return;
    }

    if (onApplyItems) {
      onApplyItems(chosenItems, target);
      const labels = {
        preview: "Outfit Preview",
        planner: "Outfit of the Day",
        pack:    "Travel Pack",
        donate:  "Donate Bin",
      };
      setApplyFeedback(`✅ ${chosenItems.length} item${chosenItems.length !== 1 ? "s" : ""} added to ${labels[target] || target}!`);
      setTimeout(() => setApplyFeedback(""), 2500);
    }
  }, [resultImages, selected, onApplyItems]);

  const reset = () => {
    abortRef.current?.abort();
    setQuery("");
    setResult(null);
    setResultImages([]);
    setSelected(new Set());
    setError("");
    setStreaming(false);
    setLoadingImages(false);
    setApplyFeedback("");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  if (!isOpen) return null;

  const hasImages = resultImages.length > 0;
  const selectedCount = selected.size;

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
              placeholder="e.g. Show all my black dresses…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
              disabled={streaming}
              autoFocus
            />
            <button
              className="cs-search-btn"
              onClick={() => handleSearch()}
              disabled={!query.trim() || streaming}
            >
              {streaming ? "…" : "🔍"}
            </button>
          </div>

          {/* Quick searches */}
          {!result && !streaming && (
            <div className="cs-quick">
              <p className="cs-quick__label">Try a quick search:</p>
              <div className="cs-quick__chips">
                {QUICK_SEARCHES.map((s) => (
                  <button
                    key={s}
                    className="cs-chip"
                    onClick={() => { setQuery(s); handleSearch(s); }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Streaming indicator */}
          {streaming && (
            <div className="cs-thinking">
              <span className="cs-cursor">▋</span> Searching your closet…
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="cs-result">
              <p className="cs-result__text">{result.text}</p>

              {/* Section navigation buttons (fallback if no images) */}
              {!hasImages && !loadingImages && result.sections.length > 0 && (
                <>
                  <p className="cs-result__heading">Matching sections:</p>
                  <div className="cs-result__sections">
                    {result.sections.map((tag) => {
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

              {/* Loading images */}
              {loadingImages && (
                <div className="cs-thinking">
                  <span className="cs-cursor">▋</span> Loading your items…
                </div>
              )}

              {/* Image results grid */}
              {hasImages && (
                <>
                  <div className="cs-results-bar">
                    <span className="cs-results-count">
                      {resultImages.length} item{resultImages.length !== 1 ? "s" : ""} found
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
                          <div className="cs-image-tile__check">
                            {isSelected ? "✓" : ""}
                          </div>
                          {sec && (
                            <div className="cs-image-tile__label">
                              {sec.emoji} {sec.label}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Apply to panel buttons */}
                  <div className="cs-apply-bar">
                    <p className="cs-apply-bar__label">
                      Add {selectedCount} selected item{selectedCount !== 1 ? "s" : ""} to:
                    </p>
                    <div className="cs-apply-btns">
                      <button
                        className="cs-apply-btn"
                        onClick={() => handleApply("preview")}
                        disabled={!selectedCount}
                        title="Add to Outfit Preview"
                      >
                        👗 Outfit Preview
                      </button>
                      <button
                        className="cs-apply-btn"
                        onClick={() => handleApply("planner")}
                        disabled={!selectedCount}
                        title="Add to Outfit of the Day"
                      >
                        📅 Outfit of the Day
                      </button>
                      <button
                        className="cs-apply-btn"
                        onClick={() => handleApply("pack")}
                        disabled={!selectedCount}
                        title="Add to Travel Pack"
                      >
                        🧳 Travel Pack
                      </button>
                      <button
                        className="cs-apply-btn"
                        onClick={() => handleApply("donate")}
                        disabled={!selectedCount}
                        title="Add to Donate Bin"
                      >
                        ♻️ Donate Bin
                      </button>
                    </div>
                    {applyFeedback && (
                      <p className="cs-apply-feedback">{applyFeedback}</p>
                    )}
                  </div>
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
