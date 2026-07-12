import React, { useState, useRef } from "react";
import { aiProxyFetch } from "../../utils/aiProxy";
import { fetchImagesForSection } from "../../utils/CloudinaryAPI";
import ApiErrorMessage from "../common/ApiErrorMessage";
import FormattedText from "../common/FormattedText";
import "./AIDonationAdvisor.css";

// Default section labels for the prompt. Actual fetch tags come from the
// `sections` prop so kids/pet/male closets resolve correctly.
const DEFAULT_SECTIONS = [
  { label: "Dresses/Skirts",   tag: "dresses-skirts" },
  { label: "Shoes/Sneakers",   tag: "shoes-sneakers" },
  { label: "Pants/Jeans",      tag: "pants-jeans" },
  { label: "Tops",             tag: "tops" },
  { label: "Bags/Accessories", tag: "bags-accessories" },
  { label: "Jackets/Coats",    tag: "jackets-coats" },
];

const isPhone = () =>
  typeof window !== "undefined" && window.matchMedia("(max-width: 600px)").matches;

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

export default function AIDonationAdvisor({ isOpen, onClose, sections = null, onAddImages, onSaved }) {
  const SECTIONS = sections && sections.length ? sections : DEFAULT_SECTIONS;

  const [step, setStep] = useState("questions"); // "questions" | "result"
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef(null);

  // Visual builder state
  const [building, setBuilding] = useState(false);
  const [board, setBoard] = useState(null);        // [{label, tag}]
  const [sectionImages, setSectionImages] = useState({}); // { tag: [urls] }
  const [imgIdx, setImgIdx] = useState({});        // { tag: index }
  const [picked, setPicked] = useState({});        // { [url]: sectionLabel } — chosen to donate
  const [savedFlash, setSavedFlash] = useState(false);

  const allAnswered = QUESTIONS.every((q) => answers[q.id]);

  const systemPrompt = `You are WIMC's Smart Donation Advisor — a friendly, practical assistant that helps users declutter their closet.

The user's closet has these categories: ${SECTIONS.map((s) => s.label).join(", ")}.

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
      const res = await aiProxyFetch({
        model: "claude-sonnet-4-5",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: "user", content: userMsg }],
      }, { signal: abortRef.current.signal, feature: "ai_donation_advisor" });

      const data = await res.json();
      if (!res.ok) {
        // Server sends `error` as a friendly plain string (e.g. the daily
        // AI-limit message) — surface it instead of a generic error.
        const msg = (typeof data?.error === "string" ? data.error : data?.error?.message) || `HTTP ${res.status}`;
        const err = new Error(msg);
        err.isApi = true;
        throw err;
      }
      setResult(data.content?.[0]?.text || "");
    } catch (e) {
      if (e.name !== "AbortError")
        setError(e.isApi ? e.message : "Something went wrong. Please try again.");
    } finally {
      setStreaming(false);
    }
  };

  // Which closet sections the plan references.
  const detectSections = () =>
    SECTIONS.filter((s) =>
      new RegExp(s.label.replace(/[/\\^$*+?.()|[\]{}]/g, "\\$&"), "i").test(result)
    );

  // Build a visual board: fetch closet images for each referenced section.
  const buildVisual = async () => {
    const secs = detectSections();
    if (!secs.length) {
      setError("Couldn't match the plan to your closet sections.");
      return;
    }
    setBuilding(true);
    try {
      const missing = secs.filter((s) => sectionImages[s.tag] === undefined);
      const next = { ...sectionImages };
      await Promise.all(
        missing.map((s) =>
          fetchImagesForSection(s.tag)
            .then((urls) => { next[s.tag] = urls || []; })
            .catch(() => { next[s.tag] = []; })
        )
      );
      setSectionImages(next);
      setBoard(secs);
    } finally {
      setBuilding(false);
    }
  };

  const cycleImg = (tag, dir, total) => {
    if (!total) return;
    setImgIdx((prev) => ({ ...prev, [tag]: ((prev[tag] || 0) + dir + total) % total }));
  };

  // Toggle whether a specific image is selected for donation.
  const togglePick = (url, sectionLabel) => {
    setPicked((prev) => {
      const next = { ...prev };
      if (next[url]) delete next[url];
      else next[url] = sectionLabel;
      return next;
    });
  };

  const pickedCount = Object.keys(picked).length;

  // Save all selected items to the Donate Bin.
  const addToDonateBin = () => {
    const images = Object.entries(picked).map(([url, section]) => ({ url, section }));
    if (!images.length) return;
    if (onAddImages) onAddImages(images);
    setSavedFlash(true);
    setTimeout(() => {
      setSavedFlash(false);
      if (isPhone()) (onSaved || onClose)?.();
    }, 1200);
  };

  const reset = () => {
    abortRef.current?.abort();
    setStep("questions");
    setAnswers({});
    setResult("");
    setError("");
    setStreaming(false);
    setBoard(null);
    setImgIdx({});
    setPicked({});
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
          <div className="aida-header__actions">
            {step === "result" && (
              <button className="aida-header__new" onClick={reset} title="Start a new plan">
                🔄 New
              </button>
            )}
            <button className="aida-close" onClick={onClose} aria-label="Close">×</button>
          </div>
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
                <FormattedText text={result} />
                {streaming && <span className="aida-cursor">▋</span>}
              </pre>
              {error && <ApiErrorMessage className="aida-error" message={error} />}

              {!streaming && result && !board && (
                <div className="aida-actions">
                  <button
                    className="aida-btn aida-btn--build"
                    onClick={buildVisual}
                    disabled={building}
                  >
                    {building ? "✨ Building…" : "🗑️ Build Donation Set"}
                  </button>
                </div>
              )}

              {/* Visual board — pick the actual items to donate */}
              {board && (
                <div className="aida-board">
                  <p className="aida-board__hint">
                    Tap the ✓ on each item you want to donate — swap with ‹ › to
                    pick more, then save.
                  </p>
                  <div className="aida-board__grid">
                    {board.map((s) => {
                      const imgs = sectionImages[s.tag] || [];
                      const idx = imgIdx[s.tag] || 0;
                      const curUrl = imgs[idx];
                      const isPicked = curUrl && !!picked[curUrl];
                      return (
                        <div key={s.tag} className={`aida-ob-card${isPicked ? " is-picked" : ""}`}>
                          <p className="aida-ob-card__label">{s.label}</p>
                          {imgs.length > 0 ? (
                            <>
                              <img src={imgs[idx]} alt={s.label} className="aida-ob-card__img" />
                              {/* Selection toggle — confirms this item for donation */}
                              <button
                                className={`aida-ob-card__pick${isPicked ? " is-on" : ""}`}
                                onClick={() => togglePick(curUrl, s.label)}
                                aria-pressed={isPicked}
                                title={isPicked ? "Selected to donate — tap to remove" : "Select this item to donate"}
                              >
                                {isPicked ? "✓" : "+"}
                              </button>
                              {imgs.length > 1 && (
                                <>
                                  <button className="aida-ob-card__prev" onClick={() => cycleImg(s.tag, -1, imgs.length)} aria-label="Previous">‹</button>
                                  <button className="aida-ob-card__next" onClick={() => cycleImg(s.tag, 1, imgs.length)} aria-label="Next">›</button>
                                </>
                              )}
                            </>
                          ) : (
                            <div className="aida-ob-card__empty">No items yet</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <button
                    className={`aida-btn aida-btn--save${savedFlash ? " is-saved" : ""}`}
                    onClick={addToDonateBin}
                    disabled={pickedCount === 0}
                  >
                    {savedFlash
                      ? "✓ Added to Donate Bin!"
                      : pickedCount > 0
                      ? `💾 Save ${pickedCount} item${pickedCount !== 1 ? "s" : ""} to Donate Bin`
                      : "Select items to donate"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
