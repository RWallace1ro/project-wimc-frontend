import React, { useState, useRef, useEffect } from "react";
import { aiProxyFetch } from "../../utils/aiProxy";
import { fetchImagesForSection } from "../../utils/CloudinaryAPI";
import { syncSetItem } from "../../utils/syncStore";
import { getClosetSections, extractSections, aiPickItems } from "../../utils/outfitBuilder";
import Lightbox from "../Lightbox/Lightbox";
import ApiErrorMessage from "../common/ApiErrorMessage";
import FormattedText from "../common/FormattedText";
import "./AIStylist.css";

const SAVED_OUTFITS_KEY = "wimc_stylist_saved_outfits";

const QUICK_PROMPTS = [
  "What should I wear to a job interview?",
  "Build me a casual weekend outfit",
  "What's a good outfit for a first date?",
  "Suggest a capsule closet for travel",
  "What should I wear to a summer wedding?",
  "Give me a chic work-from-home look",
  "🎨 What are the colors of the season?",
  "🌿 What are the current seasonal fashion trends?",
];

export default function AIStylist({
  isOpen,
  onClose,
  onAddToPlanner,
  closetItems = [],
  selectedTab = "",
}) {
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState("");
  const [streaming, setStreaming]     = useState(false);
  const [error, setError]             = useState("");

  // Outfit board state
  const [sectionImages, setSectionImages] = useState({}); // { tag: [url,...] }
  const [imgIndexes, setImgIndexes]       = useState({}); // { tag: idx }
  const [openBoardId, setOpenBoardId]     = useState(null); // msg id with open board
  const [buildingId, setBuildingId]       = useState(null); // msg id while AI picks items

  // Saved outfits
  const [savedOutfits, setSavedOutfits] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(SAVED_OUTFITS_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const [savedOpen, setSavedOpen]   = useState(false);
  const [saveFlashId, setSaveFlashId] = useState(null); // msg id that just saved
  const [savedLightbox, setSavedLightbox] = useState(null); // { images, index }

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const abortRef  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  // Re-read saved outfits whenever the modal opens — picks up cloud-synced
  // saves made on another device (hydration/remote sync update localStorage).
  useEffect(() => {
    if (!isOpen) return;
    try {
      const fresh = JSON.parse(localStorage.getItem(SAVED_OUTFITS_KEY) || "[]");
      setSavedOutfits(fresh);
    } catch {}
  }, [isOpen]);

  // One-time migration: outfits saved before cloud sync existed live only in
  // this device's localStorage. Push them to Firestore once on mount.
  // Safe because SyncProvider gates rendering until hydration completes, so
  // localStorage already reflects the latest cloud state here.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_OUTFITS_KEY);
      if (raw && JSON.parse(raw).length > 0) {
        syncSetItem(SAVED_OUTFITS_KEY, raw);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isOpen) abortRef.current?.abort();
  }, [isOpen]);

  // ── Outfit board helpers ─────────────────────────────────────────────────
  const handleBuildOutfit = async (msgId, sections, outfitText) => {
    if (openBoardId === msgId) { setOpenBoardId(null); return; }

    setBuildingId(msgId);
    try {
      // Fetch images for sections we don't have yet
      const missing = sections.filter((s) => sectionImages[s.tag] === undefined);
      let imagesByTag = { ...sectionImages };
      if (missing.length) {
        const results = await Promise.all(
          missing.map((s) => fetchImagesForSection(s.tag).then((urls) => ({ tag: s.tag, urls })))
        );
        results.forEach(({ tag, urls }) => { imagesByTag[tag] = urls; });
        setSectionImages(imagesByTag);
      }

      // Ask the AI to pick specific items (falls back to first item per section)
      const picks = await aiPickItems(outfitText, sections, imagesByTag);
      if (picks) {
        setImgIndexes((prev) => ({ ...prev, ...picks }));
      }
      setOpenBoardId(msgId);
    } finally {
      setBuildingId(null);
    }
  };

  const cycleImg = (tag, dir, total) => {
    setImgIndexes((prev) => ({
      ...prev,
      [tag]: ((prev[tag] || 0) + dir + total) % total,
    }));
  };

  // ── Saved outfits ────────────────────────────────────────────────────────
  const persistOutfits = (list) => {
    setSavedOutfits(list);
    try { syncSetItem(SAVED_OUTFITS_KEY, JSON.stringify(list)); } catch {}
  };

  const saveOutfit = (msgId, sections) => {
    const items = sections
      .map((s) => {
        const imgs = sectionImages[s.tag] || [];
        const idx  = imgIndexes[s.tag] || 0;
        return imgs.length ? { label: s.label, tag: s.tag, url: imgs[idx] } : null;
      })
      .filter(Boolean);
    if (!items.length) return;

    // The user request that led to this suggestion = nearest user message
    // before the assistant message being saved.
    let request = "";
    const msgIdx = messages.findIndex((m) => m.id === msgId);
    for (let i = msgIdx - 1; i >= 0; i--) {
      if (messages[i].role === "user") { request = messages[i].content; break; }
    }

    const outfit = {
      id: Date.now(),
      date: new Date().toLocaleDateString(),
      request,
      items,
    };
    persistOutfits([outfit, ...savedOutfits]);
    setSaveFlashId(msgId);
    setTimeout(() => setSaveFlashId(null), 2000);
  };

  const deleteOutfit = (id) => {
    persistOutfits(savedOutfits.filter((o) => o.id !== id));
  };

  // Closet is unisex now — show every saved outfit, no gender filtering.
  const visibleOutfits = savedOutfits;
  const sectionLabels = getClosetSections().map((s) => s.label);

  const closetContext = closetItems.length > 0
    ? `The user currently has ${closetItems.length} item${closetItems.length !== 1 ? "s" : ""}${selectedTab ? ` in their "${selectedTab}" section` : " in their closet"}. Reference this section and suggest complementary categories.`
    : `The user's closet may be empty or not yet loaded. Give general outfit advice and encourage adding items.`;

  const systemPrompt = `You are WIMC Stylist, a friendly personal fashion assistant in the "What's In My Closet" app.

The user's closet has these sections: ${sectionLabels.join(", ")}.
${closetContext}

Rules:
- Suggest outfit combinations using the exact section names above
- Format EVERY outfit suggestion exactly like this (use exact section names in brackets):
  ✨ Outfit 1: [Tops] + [Pants/Jeans] + [Shoes/Sneakers]
  ✨ Outfit 2: [Dresses/Skirts] + [Bags/Accessories] + [Jackets/Coats]
- Keep responses concise, warm, and actionable
- For seasonal colors: provide Pantone palette with names and hex codes
- For trends: cover silhouettes, fabrics, patterns, key pieces, tied back to the user's closet sections
- Name specific trends (e.g. "quiet luxury", "coastal grandmother") and explain them plainly`;

  // ── Send message ─────────────────────────────────────────────────────────
  const sendMessage = async (text) => {
    const userText = (text || input).trim();
    if (!userText || streaming) return;
    setInput("");
    setError("");
    const userMsg  = { role: "user",      content: userText, id: Date.now() };
    const assistMsg = { role: "assistant", content: "",       id: Date.now() + 1, streaming: true };
    setMessages((prev) => [...prev, userMsg, assistMsg]);
    setStreaming(true);

    const history = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: userText },
    ];

    try {
      abortRef.current = new AbortController();
      const res = await aiProxyFetch(
        { model: "claude-sonnet-4-5", max_tokens: 1000, system: systemPrompt, messages: history },
        { signal: abortRef.current.signal, feature: "ai_stylist" }
      );
      const data = await res.json();
      if (!res.ok) {
        // Server sends `error` as a friendly plain string (e.g. the daily
        // AI-limit message), not an { message } object.
        const msg = (typeof data?.error === "string" ? data.error : data?.error?.message) || `HTTP ${res.status}`;
        throw new Error(msg);
      }
      const reply = data.content?.[0]?.text || "";
      // Set content AND streaming:false in one update to avoid batching race
      setMessages((prev) =>
        prev.map((m) => (m.id === assistMsg.id ? { ...m, content: reply, streaming: false } : m))
      );
    } catch (e) {
      if (e.name !== "AbortError") {
        setError(e.message || "Something went wrong. Please try again.");
        setMessages((prev) => prev.filter((m) => m.id !== assistMsg.id));
      } else {
        // AbortError: mark streaming done so cursor disappears
        setMessages((prev) =>
          prev.map((m) => (m.id === assistMsg.id ? { ...m, streaming: false } : m))
        );
      }
    } finally {
      setStreaming(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const clearChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setError("");
    setStreaming(false);
    setOpenBoardId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="stylist-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="stylist-panel" role="dialog" aria-label="AI Stylist">

        {/* Header */}
        <header className="stylist-header">
          <div className="stylist-header__left">
            <span className="stylist-header__icon">✨</span>
            <div>
              <h2 className="stylist-header__title">AI Stylist</h2>
              <p className="stylist-header__sub">Your personal fashion assistant</p>
            </div>
          </div>
          <div className="stylist-header__actions">
            {visibleOutfits.length > 0 && (
              <button
                className={`stylist-header__btn${savedOpen ? " is-active" : ""}`}
                onClick={() => setSavedOpen((v) => !v)}
                title="Saved outfits"
              >👕</button>
            )}
            {messages.length > 0 && (
              <button className="stylist-header__btn stylist-header__btn--new" onClick={clearChat} title="Start a new request">🔄 New</button>
            )}
            <button className="stylist-header__btn" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </header>

        {/* Saved outfits drawer */}
        {savedOpen && (
          <div className="stylist-saved">
            <div className="stylist-saved__head">
              <h3 className="stylist-saved__title">Saved Outfits ({visibleOutfits.length})</h3>
              <button className="stylist-saved__close" onClick={() => setSavedOpen(false)}>✕</button>
            </div>
            {visibleOutfits.length === 0 ? (
              <p className="stylist-saved__empty">No saved outfits yet.</p>
            ) : (
              visibleOutfits.map((o) => (
                <div key={o.id} className="stylist-saved__outfit">
                  <div className="stylist-saved__meta">
                    <span className="stylist-saved__date">{o.date}</span>
                    {o.request && (
                      <span className="stylist-saved__request" title={o.request}>
                        {o.request}
                      </span>
                    )}
                    <button
                      className="stylist-saved__delete"
                      onClick={() => deleteOutfit(o.id)}
                      aria-label="Delete outfit"
                    >🗑️</button>
                  </div>
                  <div className="stylist-saved__imgs">
                    {o.items.map((it, i) => (
                      <div key={it.tag} className="stylist-saved__item">
                        <img
                          src={it.url}
                          alt={it.label}
                          className="stylist-saved__img"
                          onClick={() => setSavedLightbox({
                            images: o.items.map((x) => ({ src: x.url, alt: x.label })),
                            index: i,
                          })}
                          title="Click to enlarge"
                        />
                        <span className="stylist-saved__label">{it.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Messages */}
        <div className="stylist-messages">
          {messages.length === 0 && (
            <div className="stylist-welcome">
              <p className="stylist-welcome__text">
                Hi! I'm your AI Stylist 👗 Ask me anything about your closet —
                outfits for occasions, capsule closets, travel packing, and more.
              </p>
              <div className="stylist-prompts">
                {QUICK_PROMPTS.map((p) => (
                  <button key={p} className="stylist-prompt" onClick={() => sendMessage(p)}>{p}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => {
            const outfitSections =
              msg.role === "assistant" && !msg.streaming && msg.content
                ? extractSections(msg.content)
                : [];
            const hasOutfit = outfitSections.length >= 2;

            return (
              <div key={msg.id} className={`stylist-msg stylist-msg--${msg.role}`}>
                <div className="stylist-msg__bubble">
                  {msg.content
                    ? <FormattedText text={msg.content} />
                    : (msg.streaming ? <span className="stylist-cursor">▋</span> : "")}
                </div>

                {/* Action row */}
                {msg.role === "assistant" && !msg.streaming && msg.content && (
                  <div className="stylist-msg__actions">
                    {hasOutfit && (
                      <button
                        className={`stylist-msg__action stylist-msg__action--outfit${openBoardId === msg.id ? " is-open" : ""}`}
                        onClick={() => handleBuildOutfit(msg.id, outfitSections, msg.content)}
                        disabled={buildingId === msg.id}
                      >
                        {buildingId === msg.id
                          ? "✨ Selecting items…"
                          : openBoardId === msg.id
                          ? "✕ Close Outfit"
                          : "👗 Build This Outfit"}
                      </button>
                    )}
                    {onAddToPlanner && (
                      <button
                        className="stylist-msg__action"
                        onClick={() => onAddToPlanner(msg.content)}
                        title="Send to Outfit Planner"
                      >
                        📅 Add to Planner
                      </button>
                    )}
                  </div>
                )}

                {/* Outfit image board */}
                {openBoardId === msg.id && (
                  <div className="stylist-outfit-board">
                    {outfitSections.map((s) => {
                      const imgs = sectionImages[s.tag] || [];
                      const idx  = imgIndexes[s.tag] || 0;
                      return (
                        <div key={s.tag} className="stylist-outfit-card">
                          <p className="stylist-outfit-card__label">{s.label}</p>
                          {imgs.length > 0 ? (
                            <>
                              <img
                                src={imgs[idx]}
                                alt={s.label}
                                className="stylist-outfit-card__img"
                              />
                              {imgs.length > 1 && (
                                <>
                                  <button
                                    className="stylist-outfit-card__prev"
                                    onClick={() => cycleImg(s.tag, -1, imgs.length)}
                                    aria-label={`Previous ${s.label}`}
                                  >‹</button>
                                  <button
                                    className="stylist-outfit-card__next"
                                    onClick={() => cycleImg(s.tag,  1, imgs.length)}
                                    aria-label={`Next ${s.label}`}
                                  >›</button>
                                </>
                              )}
                            </>
                          ) : (
                            <div className="stylist-outfit-card__empty">No items yet</div>
                          )}
                        </div>
                      );
                    })}
                    <button
                      className={`stylist-outfit-save${saveFlashId === msg.id ? " is-saved" : ""}`}
                      onClick={() => saveOutfit(msg.id, outfitSections)}
                    >
                      {saveFlashId === msg.id ? "✓ Outfit Saved!" : "💾 Save This Outfit"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {error && <ApiErrorMessage className="stylist-error" message={error} />}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <footer className="stylist-footer">
          <input
            ref={inputRef}
            type="text"
            className="stylist-input"
            placeholder="Ask your stylist anything…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={streaming}
          />
          <button
            className="stylist-send"
            onClick={() => sendMessage()}
            disabled={!input.trim() || streaming}
            aria-label="Send"
          >
            {streaming ? "…" : "➤"}
          </button>
        </footer>
      </aside>
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
