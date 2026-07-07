import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { aiProxyFetch } from "../../utils/aiProxy";
import "./WIMCAssistant.css";

const QUICK_QUESTIONS = [
  "How do I add clothing to my closet?",
  "How do I create an outfit?",
  "What's the difference between the plans?",
  "How do I set up a Kids' or Pet Closet?",
  "How do I back up my receipts?",
];

// Everything the assistant needs to answer "how do I…" questions about WIMC.
const SYSTEM_PROMPT = `You are the WIMC Assistant — the friendly in-app help guide for "What's In My Closet" (WIMC), a closet-management web app. Your job is to help users understand and use the app's features. Be concise, warm, and practical. Use short paragraphs or numbered steps. If a question is unrelated to WIMC, gently steer back to how you can help with the app. Do NOT give fashion/outfit styling advice — that's the separate "AI Stylist" feature; point users there for styling.

WIMC FEATURES:
- Closet: six sections (Tops, Pants/Jeans, Shoes/Sneakers, Dresses/Skirts (or Dress Shirts/Suits in male mode), Bags/Accessories, Jackets/Coats). The Bags/Accessories card splits into Bags, Accessories, and Fragrance sub-sections. Upload photos and videos; each item can be deleted, moved between sections, pinned as the card cover, or reordered. A male/female toggle changes the sections.
- Adding items: open a section card and tap "+ Add" (or the card's add button), choose a category, and upload from your device, camera, a URL, or Unsplash. The card stays open so you see the new item immediately.
- Closet Search: AI natural-language search ("show my black dresses") that finds items across sections.
- Outfit Preview: build a look by selecting items; save and share it.
- Outfit of the Day Planner: assign outfits to each day of the week.
- Travel Pack Planner: plan what to pack for a trip, with AI help.
- Wish List: save items you want (with URL previews). Shopping List: categorized shopping with AI modes.
- Donate Bin: collect items to donate, with an AI Donation Advisor. Video Bin: store outfit videos.
- Receipts: store receipts as photo, PDF, or metadata; filter, search, mark returned, share, and back up/restore across devices.
- Kids' Closet: a separate closet + profile (sizes, age) for each child. Pet Closet: a closet + profile (species, breed, apparel size, measurements) for each pet. Both have their own sections and planners.
- Try-On Studio: record outfit videos and get AI Style Feedback. AI Stylist: chat for outfit ideas that can build a visual outfit from your closet. Weather: current + 7-day forecast to plan outfits.
- Settings (⚙️ in the header): edit profile/photo, change password, set page & card backgrounds, manage your subscription, or delete your account.
- Everything syncs across your devices automatically when you're signed in.

NAVIGATION: Most features are buttons in the top header (Weather, Try On, AI Stylist, Kids, Pets, Receipts, Tour, Settings). The closet itself is the Home/Closet page. The guided Tour (🎬 Tour) walks through everything.

PLANS / PRICING (find these on the Pricing page, or Settings → Subscription):
- Free ($0): closet with all 6 sections, 50 photo uploads, basic outfit preview, weather, Shopping List, Wish List, and the AI Stylist limited to 3 requests/day.
- Pro ($4.99/mo or $39.99/yr): everything in Free, unlimited uploads, Kids' Closet & Pet Closet, Travel Pack Planner, Video Bin, Donate Bin, Outfit-of-the-Day Planner, Receipts backup & restore, and 10 AI requests/day.
- Pro + AI ($7.99/mo or $79.99/yr): everything in Pro, 50 AI requests/day, and the full AI suite (AI Stylist outfit builder, AI Packing Assistant, AI Donation Advisor, AI Closet Search), plus unlimited Kids & Pet profiles.
- To upgrade: go to the Pricing page and pick a plan. To manage or cancel: Settings → Subscription → Manage Subscription.

When users ask where something is, name the exact header button or Settings tab. Keep answers short unless they ask for detail.`;

export default function WIMCAssistant() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const sendMessage = async (text) => {
    const userText = (text || input).trim();
    if (!userText || streaming) return;
    setInput("");
    setError("");
    const userMsg   = { role: "user",      content: userText, id: Date.now() };
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
        { model: "claude-sonnet-4-5", max_tokens: 800, system: SYSTEM_PROMPT, messages: history },
        { signal: abortRef.current.signal, feature: "wimc_assistant" }
      );
      const data = await res.json();
      if (!res.ok) {
        // Server sends `error` as a friendly plain string (e.g. the daily
        // help-question limit message), not an { message } object.
        const msg = (typeof data?.error === "string" ? data.error : data?.error?.message) || `HTTP ${res.status}`;
        throw new Error(msg);
      }
      const reply = data.content?.[0]?.text || "";
      setMessages((prev) =>
        prev.map((m) => (m.id === assistMsg.id ? { ...m, content: reply, streaming: false } : m))
      );
    } catch (e) {
      if (e.name !== "AbortError") {
        setError(e.message || "Something went wrong. Please try again.");
        setMessages((prev) => prev.filter((m) => m.id !== assistMsg.id));
      } else {
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

  // End the current conversation: stop any in-flight reply and reset to the
  // welcome screen + quick questions (no app refresh needed).
  const newChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setInput("");
    setError("");
    setStreaming(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <>
      {/* Floating launcher */}
      <button
        className={`wa-fab${open ? " is-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close help assistant" : "Open help assistant"}
        title="WIMC Assistant — Help"
      >
        {open ? "✕" : (
          <span className="wa-fab__face">
            {/* Chat badge stays visible at the upper-right of the bot */}
            <span className="wa-fab__badge" aria-hidden="true">💬</span>
            {/* A little robot whose arm catches the dropped hanger and lifts it
                back into place — gives the bot some character. */}
            <svg className="wa-bot" viewBox="0 0 44 50" fill="none" aria-hidden="true">
              {/* Antenna + head/body */}
              <g className="wa-bot__body">
                <line x1="22" y1="19" x2="22" y2="22" stroke="#c4b5fd" strokeWidth="1.4" />
                <rect x="11" y="22" width="22" height="19" rx="7" fill="#c4b5fd" />
                <circle cx="18" cy="30" r="1.8" fill="#1e293b" />
                <circle cx="26" cy="30" r="1.8" fill="#1e293b" />
                <path d="M18.5 34.5c1.6 1.5 5.4 1.5 7 0"
                      stroke="#1e293b" strokeWidth="1.4" strokeLinecap="round" />
              </g>

              {/* Left arm (reaches out to the side to catch & lift the hanger) */}
              <path className="wa-bot__arm" d="M12 31c-3 1-4.2 3-4.2 6.2"
                    stroke="#c4b5fd" strokeWidth="1.8" strokeLinecap="round" />
              {/* Right arm (static) */}
              <path d="M32 31c3 1 4.2 3 4.2 6.2"
                    stroke="#c4b5fd" strokeWidth="1.8" strokeLinecap="round" />

              {/* Hanger — drawn last so it stays in full view (on top of the bot).
                  Falls out to the side, is held beside the bot, then lifted back. */}
              <g className="wa-bot__hanger">
                <path d="M22 6c-1.5 0-2 1.7-.6 2.5.5.3.6.6.6 1.1"
                      stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
                <path d="M22 9.6 14.5 16.5h15L22 9.6Z"
                      stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
              </g>
            </svg>
          </span>
        )}
      </button>

      {open && (
        <div className="wa-panel" role="dialog" aria-label="WIMC Assistant">
          <header className="wa-header">
            <div className="wa-header__left">
              <span className="wa-header__icon">💬</span>
              <div>
                <h2 className="wa-header__title">WIMC Assistant</h2>
                <p className="wa-header__sub">Ask me how to use the app</p>
              </div>
            </div>
            <div className="wa-header__actions">
              {messages.length > 0 && (
                <button
                  className="wa-header__btn"
                  onClick={newChat}
                  title="End conversation / new chat"
                >
                  🔄 New chat
                </button>
              )}
              <button className="wa-header__close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
            </div>
          </header>

          <div className="wa-messages">
            {messages.length === 0 && (
              <div className="wa-welcome">
                <p className="wa-welcome__text">
                  Hi! I'm your WIMC helper 💬 Ask me anything about using the app —
                  closets, outfits, plans, settings, and more.
                </p>
                <div className="wa-prompts">
                  {QUICK_QUESTIONS.map((q) => (
                    <button key={q} className="wa-prompt" onClick={() => sendMessage(q)}>{q}</button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`wa-msg wa-msg--${msg.role}`}>
                <div className="wa-msg__bubble">
                  {msg.content || (msg.streaming ? <span className="wa-cursor">▋</span> : "")}
                </div>
              </div>
            ))}

            {error && <p className="wa-error">{error}</p>}
            <div ref={bottomRef} />
          </div>

          <footer className="wa-footer">
            <input
              ref={inputRef}
              type="text"
              className="wa-input"
              placeholder="Ask a question…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={streaming}
            />
            <button
              className="wa-send"
              onClick={() => sendMessage()}
              disabled={!input.trim() || streaming}
              aria-label="Send"
            >
              {streaming ? "…" : "➤"}
            </button>
          </footer>

          <p className="wa-footnote">
            Need styling ideas instead?{" "}
            <button className="wa-link" onClick={() => { setOpen(false); navigate("/pricing"); }}>
              See plans
            </button>
          </p>
        </div>
      )}
    </>
  );
}
