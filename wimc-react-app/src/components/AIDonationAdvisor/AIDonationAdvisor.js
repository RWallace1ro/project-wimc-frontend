import React, { useState, useRef } from "react";
import "./AIDonationAdvisor.css";

const SECTIONS = [
  "Dresses/Skirts",
  "Shoes/Sneakers",
  "Pants/Jeans",
  "Tops",
  "Bags/Accessories",
  "Jackets/Coats",
];

const QUESTIONS = [
  {
    id: "worn",
    label: "How often do you wear most items?",
    options: ["Daily", "Weekly", "Monthly", "Rarely", "Never"],
  },
  {
    id: "duplicates",
    label: "Do you have duplicate items in any category?",
    options: ["Yes, many", "A few", "Not really", "None"],
  },
  {
    id: "season",
    label: "Do you keep items for seasons you no longer need?",
    options: ["Yes", "Some", "No"],
  },
  {
    id: "fit",
    label: "Do any items no longer fit or suit your style?",
    options: ["Yes, several", "A few", "No"],
  },
];

export default function AIDonationAdvisor({ isOpen, onClose }) {
  const [step, setStep] = useState("questions"); // "questions" | "result"
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef(null);

  const allAnswered = QUESTIONS.every((q) => answers[q.id]);

  const systemPrompt = `You are WIMC's Smart Donation Advisor — a friendly, practical assistant that helps users declutter their wardrobe.

The user's closet has these categories: ${SECTIONS.join(", ")}.

Based on their answers, give a personalised donation plan:
1. Start with a brief, warm summary of what their answers suggest
2. List specific category recommendations like:
   🗑️ **Tops** — Consider donating duplicates and items worn rarely
   🗑️ **Shoes/Sneakers** — Seasonal items taking up space
3. Give 2-3 practical donation tips (local shelters, online platforms like ThredUp, Poshmark)
4. End with an encouraging message

Keep the tone warm, non-judgmental, and motivating. Format clearly with headers and bullet points.`;

  const handleGenerate = async () => {
    if (!allAnswered || streaming) return;
    setStep("result");
    setResult("");
    setError("");
    setStreaming(true);

    const userMsg = `Here are my answers:
- How often I wear items: ${answers.worn}
- Duplicate items: ${answers.duplicates}  
- Off-season items kept: ${answers.season}
- Items that don't fit/suit style: ${answers.fit}

Please give me a personalised donation plan for my closet.`;

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
            const delta = parsed?.delta?.text || "";
            if (delta) setResult((prev) => prev + delta);
          } catch {}
        }
      }
    } catch (e) {
      if (e.name !== "AbortError")
        setError("Something went wrong. Please try again.");
    } finally {
      setStreaming(false);
    }
  };

  const reset = () => {
    abortRef.current?.abort();
    setStep("questions");
    setAnswers({});
    setResult("");
    setError("");
    setStreaming(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="aida-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="aida-modal"
        role="dialog"
        aria-label="AI Donation Advisor"
      >
        <header className="aida-header">
          <div className="aida-header__left">
            <span className="aida-header__icon">🤖</span>
            <div>
              <h2 className="aida-header__title">Smart Donation Advisor</h2>
              <p className="aida-header__sub">
                AI-powered closet declutter plan
              </p>
            </div>
          </div>
          <button className="aida-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="aida-body">
          {step === "questions" && (
            <>
              <p className="aida-intro">
                Answer a few quick questions and I'll create a personalised
                donation plan for your closet. 🛍️
              </p>
              {QUESTIONS.map((q) => (
                <div key={q.id} className="aida-question">
                  <p className="aida-question__label">{q.label}</p>
                  <div className="aida-question__options">
                    {q.options.map((opt) => (
                      <button
                        key={opt}
                        className={`aida-option ${answers[q.id] === opt ? "is-active" : ""}`}
                        onClick={() =>
                          setAnswers((prev) => ({ ...prev, [q.id]: opt }))
                        }
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button
                className="aida-btn aida-btn--generate"
                onClick={handleGenerate}
                disabled={!allAnswered}
              >
                ✨ Get My Donation Plan
              </button>
            </>
          )}

          {step === "result" && (
            <>
              <pre className="aida-result">
                {result}
                {streaming && <span className="aida-cursor">▋</span>}
              </pre>
              {error && <p className="aida-error">{error}</p>}
              {!streaming && (
                <button className="aida-btn" onClick={reset}>
                  🔄 Start Over
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
