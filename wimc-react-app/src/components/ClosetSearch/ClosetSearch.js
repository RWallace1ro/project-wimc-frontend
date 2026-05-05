import React, { useState, useRef } from "react";
import "./ClosetSearch.css";

const SECTIONS = [
  { tag: "dresses-skirts", label: "Dresses/Skirts", emoji: "👗" },
  { tag: "shoes-sneakers", label: "Shoes/Sneakers", emoji: "👟" },
  { tag: "pants-jeans", label: "Pants/Jeans", emoji: "👖" },
  { tag: "tops", label: "Tops", emoji: "👕" },
  { tag: "bags-accessories", label: "Bags/Accessories", emoji: "👜" },
  { tag: "jackets-coats", label: "Jackets/Coats", emoji: "🧥" },
];

const QUICK_SEARCHES = [
  "Something casual for the weekend",
  "A formal outfit for a wedding",
  "Comfortable travel outfit",
  "Business casual for the office",
  "Something bright and summery",
  "Cozy winter layers",
];

export default function ClosetSearch({ isOpen, onClose, onSectionSelect }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null); // { text, sections[] }
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef(null);
  const inputRef = useRef(null);

  const systemPrompt = `You are WIMC's Natural Language Closet Search assistant.

The user's closet has these exact categories:
- Dresses/Skirts (tag: dresses-skirts)
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
    setError("");
    setStreaming(true);

    let fullText = "";

    try {
      abortRef.current = new AbortController();
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: abortRef.current.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 400,
          system: systemPrompt,
          stream: true,
          messages: [{ role: "user", content: q }],
        }),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed?.delta?.text || "";
            fullText += delta;
          } catch {}
        }
      }

      // Parse sections from JSON block
      let sections = [];
      const jsonMatch = fullText.match(/\{"sections":\s*\[.*?\]\}/s);
      if (jsonMatch) {
        try {
          sections = JSON.parse(jsonMatch[0]).sections || [];
        } catch {}
      }
      const text = fullText.replace(/\{"sections":\s*\[.*?\]\}/s, "").trim();
      setResult({ text, sections });
    } catch (e) {
      if (e.name !== "AbortError") setError("Search failed. Please try again.");
    } finally {
      setStreaming(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  const reset = () => {
    abortRef.current?.abort();
    setQuery("");
    setResult(null);
    setError("");
    setStreaming(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  if (!isOpen) return null;

  return (
    <div
      className="cs-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="cs-modal" role="dialog" aria-label="Closet Search">
        <header className="cs-header">
          <div className="cs-header__left">
            <span className="cs-header__icon">🔍</span>
            <div>
              <h2 className="cs-header__title">Search My Closet</h2>
              <p className="cs-header__sub">
                Describe what you're looking for in plain English
              </p>
            </div>
          </div>
          <button className="cs-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="cs-body">
          {/* Search input */}
          <div className="cs-search-row">
            <input
              ref={inputRef}
              className="cs-input"
              type="text"
              placeholder="e.g. Something casual for a summer picnic…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
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
                    onClick={() => {
                      setQuery(s);
                      handleSearch(s);
                    }}
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

              {result.sections.length > 0 && (
                <>
                  <p className="cs-result__heading">
                    Matching sections in your closet:
                  </p>
                  <div className="cs-result__sections">
                    {result.sections.map((tag) => {
                      const sec = SECTIONS.find((s) => s.tag === tag);
                      if (!sec) return null;
                      return (
                        <button
                          key={tag}
                          className="cs-section-btn"
                          onClick={() => {
                            onSectionSelect?.(tag);
                            onClose();
                          }}
                        >
                          <span className="cs-section-btn__emoji">
                            {sec.emoji}
                          </span>
                          <span className="cs-section-btn__label">
                            {sec.label}
                          </span>
                          <span className="cs-section-btn__arrow">→</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              <button className="cs-btn" onClick={reset}>
                🔄 New Search
              </button>
            </div>
          )}

          {error && <p className="cs-error">{error}</p>}
        </div>
      </div>
    </div>
  );
}
