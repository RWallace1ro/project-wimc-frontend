import React, { useState, useRef } from "react";
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

const SECTION_LABELS = [
  "Dresses/Skirts",
  "Shoes/Sneakers",
  "Pants/Jeans",
  "Tops",
  "Bags/Accessories",
  "Jackets/Coats",
];

export default function AIPackingAssistant({
  isOpen,
  onClose,
  onAddItem,
  selectedDay,
}) {
  const [destination, setDestination] = useState("");
  const [tripType, setTripType] = useState("");
  const [days, setDays] = useState(3);
  const [response, setResponse] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState(false);
  const abortRef = useRef(null);

  const systemPrompt = `You are a smart travel packing assistant for the WIMC (What's In My Closet) app.

The user's closet has these categories: ${SECTION_LABELS.join(", ")}.

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
    setStreaming(true);

    const userMsg = `I'm going to ${destination.trim()} for ${days} day${days > 1 ? "s" : ""} on a ${tripType} trip. Generate a packing list from my closet.`;

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
          messages: [{ role: "user", content: userMsg }],
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
            if (delta) setResponse((prev) => prev + delta);
          } catch {}
        }
      }
      setGenerated(true);
    } catch (e) {
      if (e.name !== "AbortError") {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setStreaming(false);
    }
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
          !l.startsWith("👕") &&
          !l.startsWith("👖") &&
          !l.startsWith("👗") &&
          !l.startsWith("👟") &&
          !l.startsWith("👜") &&
          !l.startsWith("🧥") &&
          !l.startsWith("Pro tip") &&
          l.length > 2,
      );
    lines.forEach((item) => onAddItem({ name: item, kind: "text" }));
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
  };

  if (!isOpen) return null;

  return (
    <div
      className="aipa-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="aipa-modal"
        role="dialog"
        aria-label="AI Packing Assistant"
      >
        <header className="aipa-header">
          <div className="aipa-header__left">
            <span className="aipa-header__icon">🧳</span>
            <div>
              <h2 className="aipa-header__title">AI Packing Assistant</h2>
              <p className="aipa-header__sub">
                Smart packing lists from your closet
              </p>
            </div>
          </div>
          <button
            className="aipa-header__close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
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
                <button className="aipa-btn" onClick={reset}>
                  🔄 Start Over
                </button>
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
                  <span className="aipa-result__day">
                    Adding to: {selectedDay}
                  </span>
                )}
              </div>
              <pre className="aipa-result__text">
                {response}
                {streaming && <span className="aipa-cursor">▋</span>}
              </pre>
              {generated && onAddItem && (
                <button
                  className="aipa-btn aipa-btn--add"
                  onClick={addAllToPack}
                >
                  ➕ Add All to Travel Pack
                </button>
              )}
            </div>
          )}

          {error && <p className="aipa-error">{error}</p>}
        </div>
      </div>
    </div>
  );
}
