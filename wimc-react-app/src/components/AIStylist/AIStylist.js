import React, { useState, useRef, useEffect } from "react";
import "./AIStylist.css";

const SECTION_LABELS = [
  "Dresses/Skirts",
  "Shoes/Sneakers",
  "Pants/Jeans",
  "Tops",
  "Bags/Accessories",
  "Jackets/Coats",
];

const QUICK_PROMPTS = [
  "What should I wear to a job interview?",
  "Build me a casual weekend outfit",
  "What's a good outfit for a first date?",
  "Suggest a capsule wardrobe for travel",
  "What should I wear to a summer wedding?",
  "Give me a chic work-from-home look",
];

export default function AIStylist({ isOpen, onClose, onAddToPlanner }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  // Cleanup stream on close
  useEffect(() => {
    if (!isOpen) abortRef.current?.abort();
  }, [isOpen]);

  const systemPrompt = `You are WIMC Stylist, a friendly and knowledgeable personal fashion assistant built into the "What's In My Closet" (WIMC) app.

The user's closet contains items across these categories: ${SECTION_LABELS.join(", ")}.

Your role:
- Suggest outfit combinations using items from the user's closet categories
- Give practical, stylish advice tailored to the occasion, season, or destination they mention
- When suggesting outfits, always reference the closet categories (e.g. "pair a Top with Pants/Jeans and Shoes/Sneakers")
- Keep responses concise, warm, and actionable
- If the user asks about packing or travel, focus on outfit combinations they can mix and match
- Format outfit suggestions clearly, e.g.:
  ✨ Outfit 1: [Top] + [Pants/Jeans] + [Shoes/Sneakers]
  ✨ Outfit 2: [Dresses/Skirts] + [Bags/Accessories] + [Jackets/Coats]`;

  const sendMessage = async (text) => {
    const userText = (text || input).trim();
    if (!userText || streaming) return;

    setInput("");
    setError("");

    const userMsg = { role: "user", content: userText, id: Date.now() };
    const assistMsg = {
      role: "assistant",
      content: "",
      id: Date.now() + 1,
      streaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistMsg]);
    setStreaming(true);

    const history = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: userText },
    ];

    try {
      abortRef.current = new AbortController();
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: abortRef.current.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          stream: true,
          messages: history,
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
            const delta =
              parsed?.delta?.text || parsed?.delta?.content?.[0]?.text || "";
            if (delta) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistMsg.id
                    ? { ...m, content: m.content + delta }
                    : m,
                ),
              );
            }
          } catch {}
        }
      }
    } catch (e) {
      if (e.name !== "AbortError") {
        setError("Something went wrong. Please try again.");
        setMessages((prev) => prev.filter((m) => m.id !== assistMsg.id));
      }
    } finally {
      setStreaming(false);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistMsg.id ? { ...m, streaming: false } : m,
        ),
      );
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setError("");
    setStreaming(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="stylist-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside className="stylist-panel" role="dialog" aria-label="AI Stylist">
        {/* Header */}
        <header className="stylist-header">
          <div className="stylist-header__left">
            <span className="stylist-header__icon">✨</span>
            <div>
              <h2 className="stylist-header__title">AI Stylist</h2>
              <p className="stylist-header__sub">
                Your personal fashion assistant
              </p>
            </div>
          </div>
          <div className="stylist-header__actions">
            {messages.length > 0 && (
              <button
                className="stylist-header__btn"
                onClick={clearChat}
                title="Clear chat"
              >
                🗑️
              </button>
            )}
            <button
              className="stylist-header__btn"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="stylist-messages">
          {messages.length === 0 && (
            <div className="stylist-welcome">
              <p className="stylist-welcome__text">
                Hi! I'm your AI Stylist 👗 Ask me anything about your wardrobe —
                outfits for occasions, capsule wardrobes, travel packing, and
                more.
              </p>
              <div className="stylist-prompts">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p}
                    className="stylist-prompt"
                    onClick={() => sendMessage(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`stylist-msg stylist-msg--${msg.role}`}
            >
              <div className="stylist-msg__bubble">
                {msg.content ||
                  (msg.streaming ? (
                    <span className="stylist-cursor">▋</span>
                  ) : (
                    ""
                  ))}
              </div>
              {/* Add to Planner button on assistant messages */}
              {msg.role === "assistant" &&
                !msg.streaming &&
                msg.content &&
                onAddToPlanner && (
                  <button
                    className="stylist-msg__action"
                    onClick={() => onAddToPlanner(msg.content)}
                    title="Send this suggestion to Outfit Planner"
                  >
                    📅 Add to Planner
                  </button>
                )}
            </div>
          ))}

          {error && <p className="stylist-error">{error}</p>}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <footer className="stylist-footer">
          <textarea
            ref={inputRef}
            className="stylist-input"
            placeholder="Ask your stylist anything…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            rows={2}
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
    </div>
  );
}
