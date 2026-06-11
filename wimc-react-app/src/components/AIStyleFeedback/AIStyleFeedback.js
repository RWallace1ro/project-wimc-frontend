import React, { useState, useRef } from "react";
import { aiProxyFetch } from "../../utils/aiProxy";
import "./AIStyleFeedback.css";

const OCCASIONS = [
  "Casual Day Out",
  "Work/Office",
  "Date Night",
  "Formal Event",
  "Working Out",
  "Travel",
  "Weekend Brunch",
];

export default function AIStyleFeedback({ isOpen, onClose, previewUrl }) {
  const [occasion, setOccasion] = useState("");
  const [description, setDescription] = useState("");
  const [feedback, setFeedback] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef(null);

  const systemPrompt = `You are WIMC's AI Style Feedback assistant — a friendly, encouraging, and knowledgeable personal stylist.

The user has recorded or uploaded a try-on video of themselves wearing an outfit. They will describe what they're wearing and the occasion. Your job is to:

1. Give warm, genuine feedback on the outfit
2. Highlight what works well (fit, color, style cohesion)
3. Offer 2-3 specific, actionable suggestions to elevate the look
4. Suggest complementary items from their closet categories: Dresses/Skirts, Shoes/Sneakers, Pants/Jeans, Tops, Bags/Accessories, Jackets/Coats
5. End with a confidence-boosting compliment

Format your response with clear sections:
✅ **What Works**
💡 **Style Tips**
👗 **Complete the Look**
⭐ **Final Note**

Keep the tone warm, positive, and empowering — never critical.`;

  const handleGetFeedback = async () => {
    if (!description.trim() || streaming) return;
    setFeedback("");
    setError("");
    setStreaming(true);

    const userMsg = `I'm wearing: ${description.trim()}
Occasion: ${occasion || "Not specified"}
Please give me style feedback on this outfit!`;

    try {
      abortRef.current = new AbortController();
      const res = await aiProxyFetch({
        model: "claude-sonnet-4-5",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: "user", content: userMsg }],
      }, { signal: abortRef.current.signal, feature: "ai_style_feedback" });

      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setFeedback(data.content?.[0]?.text || "");
    } catch (e) {
      if (e.name !== "AbortError")
        setError("Something went wrong. Please try again.");
    } finally {
      setStreaming(false);
    }
  };

  const reset = () => {
    abortRef.current?.abort();
    setOccasion("");
    setDescription("");
    setFeedback("");
    setError("");
    setStreaming(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="aisf-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="aisf-modal" role="dialog" aria-label="AI Style Feedback">
        <header className="aisf-header">
          <div className="aisf-header__left">
            <span className="aisf-header__icon">👗</span>
            <div>
              <h2 className="aisf-header__title">AI Style Feedback</h2>
              <p className="aisf-header__sub">
                Get personalised feedback on your try-on
              </p>
            </div>
          </div>
          <button className="aisf-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="aisf-body">
          {/* Video preview (if available) */}
          {previewUrl && (
            <div className="aisf-preview">
              <video
                className="aisf-preview__video"
                src={previewUrl}
                controls
                playsInline
              />
            </div>
          )}

          {/* Occasion selector */}
          <div className="aisf-field">
            <label className="aisf-label">What's the occasion?</label>
            <div className="aisf-occasions">
              {OCCASIONS.map((o) => (
                <button
                  key={o}
                  className={`aisf-occasion ${occasion === o ? "is-active" : ""}`}
                  onClick={() => setOccasion(o)}
                  disabled={streaming}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          {/* Outfit description */}
          <div className="aisf-field">
            <label className="aisf-label">Describe your outfit</label>
            <input
              type="text"
              className="aisf-textarea"
              placeholder="e.g. White linen blouse, high-waisted navy trousers, nude heels…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={streaming}
            />
          </div>

          <div className="aisf-actions">
            <button
              className="aisf-btn aisf-btn--generate"
              onClick={handleGetFeedback}
              disabled={!description.trim() || streaming}
            >
              {streaming ? "✨ Analysing…" : "✨ Get Style Feedback"}
            </button>
            {(feedback || error) && (
              <button className="aisf-btn" onClick={reset} disabled={streaming}>
                🔄 Start Over
              </button>
            )}
          </div>

          {/* Feedback result */}
          {(feedback || streaming) && (
            <div className="aisf-result">
              <pre className="aisf-result__text">
                {feedback}
                {streaming && <span className="aisf-cursor">▋</span>}
              </pre>
            </div>
          )}

          {error && <p className="aisf-error">{error}</p>}
        </div>
      </div>
    </div>
  );
}
