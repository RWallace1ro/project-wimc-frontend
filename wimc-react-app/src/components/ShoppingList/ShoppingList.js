import { syncSetItem } from '../../utils/syncStore';
﻿import React, { useState, useEffect, useRef, useCallback } from "react";
import { uploadRawJSON } from "../../utils/CloudinaryAPI";
import { appShareUrl, createCollabDoc, shareAppLink, smsShareUrl } from "../../utils/shareUtils";
import { aiProxyFetch } from "../../utils/aiProxy";
import ApiErrorMessage from "../common/ApiErrorMessage";
import { checkShoppingListAgainstCloset } from "../../utils/closetDupeCheck";
import "./ShoppingList.css";

const CLOSET_GENDER_KEY = "wimc_closet_gender";

// ── Default categories ────────────────────────────────────────────────────────
const DEFAULT_CATEGORIES = [
  {
    id: "clothing",
    label: "Clothing & Accessories",
    emoji: "👗",
    color: "#7c3aed",
  },
  { id: "travel", label: "Travel Items", emoji: "✈️", color: "#0369a1" },
  { id: "kids", label: "Kids Items", emoji: "🧸", color: "#d97706" },
];

const LS_KEY = "wimc_shopping_list_v1";
const FEEDBACK_KEY = "wimc_shopping_ai_feedback_v1";

// Trip types offered when suggesting for the "Travel Items" category — same
// options as AI Packing Assistant, so the two features feel consistent.
const TRIP_TYPES = ["Business", "Beach", "Hiking", "City Break", "Wedding", "Backpacking", "Ski/Winter", "Cruise"];

function uid() {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
}

// ── Convert AI results into readable text so they can be saved & re-read ──
function budgetToText(d) {
  const parts = [];
  if (d.estimatedTotal) parts.push(`Estimated total: ${d.estimatedTotal}`);
  if (d.savingsTip) parts.push(`💡 ${d.savingsTip}`);
  if (d.priority?.length) parts.push(`🎯 Buy first:\n${d.priority.map((x) => `• ${x}`).join("\n")}`);
  if (d.canSkip?.length) parts.push(`⏭ Can skip for now:\n${d.canSkip.map((x) => `• ${x}`).join("\n")}`);
  if (d.tips?.length) parts.push(`📋 Tips:\n${d.tips.map((x) => `• ${x}`).join("\n")}`);
  return parts.join("\n\n");
}

function prioritizeToText(items) {
  const lbl = { high: "🔴 High", medium: "🟡 Medium", low: "🟢 Low" };
  return items
    .map((it, i) => `#${i + 1} ${it.name} — ${lbl[it.priority] || it.priority}\n   ${it.reason || ""}`.trimEnd())
    .join("\n");
}

function suggestToText(items, destination, tripType) {
  const head = destination
    ? `Trip: ${destination}${tripType ? ` (${tripType})` : ""}\n\n`
    : "";
  return head + items.map((it) => `• ${it.name}${it.detail ? ` — ${it.detail}` : ""}`).join("\n");
}

// ── AI call via Anthropic API ─────────────────────────────────────────────────
async function callAI(messages, systemPrompt) {
  const res = await aiProxyFetch({
    model: "claude-sonnet-4-5",
    max_tokens: 1000,
    system: systemPrompt,
    messages,
  }, { feature: "ai_shopping_assistant" });
  const data = await res.json();
  if (!res.ok) {
    // Carry the server's friendly message (e.g. the daily-limit notice) and
    // status so callers can show it instead of a generic error.
    const err = new Error(
      (typeof data?.error === "string" ? data.error : data?.error?.message) ||
        `AI request failed (${res.status})`,
    );
    err.isApi = true;
    err.status = res.status;
    throw err;
  }
  return data.content?.find((b) => b.type === "text")?.text || "";
}

// When the failure came from the server (auth/limit/etc.), show its message —
// it already explains limits and suggests upgrading. Otherwise show a fallback.
function aiErrMsg(e, fallback) {
  return e?.isApi && e.message ? e.message : fallback;
}

// Claude often wraps JSON in a ```json fence or adds a stray sentence despite
// being told not to — a strict JSON.parse(raw.trim()) throws on that and was
// showing a generic error for every Suggest/Budget/Prioritize call. Strip
// fence markers and fall back to extracting the first {...} or [...] block.
function extractJson(raw) {
  const cleaned = raw.replace(/```(?:json)?/gi, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/[[{][\s\S]*[\]}]/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Malformed AI response.");
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CategoryTab({ cat, active, count, onClick }) {
  return (
    <button
      className={`sl-tab ${active ? "sl-tab--active" : ""}`}
      style={{ "--tab-color": cat.color }}
      onClick={onClick}
    >
      <span className="sl-tab__emoji">{cat.emoji}</span>
      <span className="sl-tab__label">{cat.label}</span>
      {count > 0 && <span className="sl-tab__badge">{count}</span>}
    </button>
  );
}

function ShoppingItem({ item, onToggle, onDelete, onEditNote, onDismissMatch }) {
  const [editingNote, setEditingNote] = useState(false);
  const [note, setNote] = useState(item.note || "");
  const [matchExpanded, setMatchExpanded] = useState(false);

  const saveNote = () => {
    onEditNote(item.id, note);
    setEditingNote(false);
  };

  const showMatch = item.closetMatch && !item.closetMatchDismissed;

  return (
    <div className={`sl-item ${item.checked ? "sl-item--checked" : ""}`}>
      <button
        className="sl-item__check"
        onClick={() => onToggle(item.id)}
        aria-label={item.checked ? "Uncheck" : "Check"}
      >
        {item.checked ? "✓" : ""}
      </button>
      <div className="sl-item__body">
        <span className="sl-item__name">{item.name}</span>
        {item.detail && <span className="sl-item__detail">{item.detail}</span>}
        {editingNote ? (
          <div className="sl-item__note-edit">
            <input
              className="sl-item__note-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveNote()}
              autoFocus
              placeholder="Add a note…"
            />
            <button className="sl-item__note-save" onClick={saveNote}>
              ✓
            </button>
          </div>
        ) : (
          <span
            className="sl-item__note"
            onClick={() => setEditingNote(true)}
            title="Click to add/edit note"
          >
            {item.note || <span className="sl-item__note--empty">+ note</span>}
          </span>
        )}
        {item.aiSuggested && <span className="sl-item__ai-tag">✨ AI</span>}
        {showMatch && (
          <button
            className="sl-item__dupe-badge"
            onClick={() => setMatchExpanded((v) => !v)}
          >
            👀 Maybe already in your closet
          </button>
        )}
        {showMatch && matchExpanded && (
          <div className="sl-item__dupe-compare" onClick={(e) => e.stopPropagation()}>
            <img className="sl-item__dupe-img" src={item.closetMatch} alt="Possible match in your closet" />
            <div className="sl-item__dupe-actions">
              <button className="sl-btn sl-btn--sm sl-btn--danger" onClick={() => onDelete(item.id)}>
                Remove from list
              </button>
              <button
                className="sl-btn sl-btn--sm"
                onClick={() => { onDismissMatch(item.id); setMatchExpanded(false); }}
              >
                Keep anyway
              </button>
            </div>
          </div>
        )}
      </div>
      <button
        className="sl-item__delete"
        onClick={() => onDelete(item.id)}
        aria-label="Delete"
      >
        ×
      </button>
    </div>
  );
}

// ── Add Category Modal ────────────────────────────────────────────────────────
const PRESET_COLORS = [
  "#7c3aed",
  "#0369a1",
  "#d97706",
  "#059669",
  "#dc2626",
  "#db2777",
  "#0891b2",
  "#65a30d",
  "#9333ea",
  "#ea580c",
  "#0d9488",
  "#7c2d12",
  "#1d4ed8",
  "#713f12",
  "#4f46e5",
];

const EMOJI_GROUPS = [
  {
    label: "Shopping",
    emojis: [
      "🛒",
      "🛍️",
      "💳",
      "💰",
      "🏷️",
      "🎁",
      "📦",
      "🧾",
      "💎",
      "👜",
      "👛",
      "💼",
      "🎀",
      "🛺",
      "🪙",
      "💵",
      "🏪",
      "🏬",
      "🏦",
      "🛁",
    ],
  },
  {
    label: "Clothing",
    emojis: [
      "👗",
      "👘",
      "🥻",
      "👙",
      "👚",
      "👕",
      "👔",
      "🧥",
      "🥼",
      "🧣",
      "🧤",
      "🧢",
      "👒",
      "🎩",
      "⛑️",
      "👟",
      "👠",
      "👡",
      "👢",
      "🥾",
      "🥿",
      "👞",
      "🩴",
      "🩱",
      "🩲",
      "🩳",
      "🪖",
      "🥽",
      "🧦",
      "🩰",
    ],
  },
  {
    label: "Travel",
    emojis: [
      "✈️",
      "🧳",
      "🏕️",
      "⛺",
      "🗺️",
      "🧭",
      "🏖️",
      "🏔️",
      "🎿",
      "🏂",
      "🚗",
      "🚢",
      "🚂",
      "🏨",
      "🌍",
      "🌴",
      "☀️",
      "🌊",
      "🎒",
      "🛸",
      "🚁",
      "🛳️",
      "🗼",
      "🏰",
      "⛩️",
      "🏜️",
      "🌋",
      "🗻",
      "🏕️",
      "🧲",
    ],
  },
  {
    label: "Kids",
    emojis: [
      "🧸",
      "🍼",
      "👶",
      "🧒",
      "🎠",
      "🎡",
      "🎢",
      "🎪",
      "🎨",
      "🖍️",
      "📚",
      "✏️",
      "🎒",
      "🏫",
      "🎈",
      "🎉",
      "🪀",
      "🎮",
      "⚽",
      "🏀",
      "🎯",
      "🪆",
      "🪁",
      "🎲",
      "♟️",
      "🃏",
      "🧩",
      "🪅",
      "🎭",
      "🪄",
    ],
  },
  {
    label: "Food",
    emojis: [
      "🍎",
      "🥗",
      "💊",
      "🧴",
      "🪥",
      "🧼",
      "🩹",
      "🍀",
      "🥤",
      "☕",
      "🍵",
      "🧃",
      "🫙",
      "🥘",
      "🍕",
      "🧁",
      "🍰",
      "🥐",
      "🍇",
      "🥑",
      "🥦",
      "🫐",
      "🍓",
      "🍒",
      "🍋",
      "🥕",
      "🥝",
      "🍔",
      "🌮",
      "🍜",
    ],
  },
  {
    label: "Home",
    emojis: [
      "🏠",
      "🛋️",
      "🪴",
      "🌿",
      "🧹",
      "🧺",
      "🪣",
      "🔧",
      "🪛",
      "💡",
      "🛁",
      "🚿",
      "🪞",
      "🪟",
      "🛏️",
      "🍳",
      "🧽",
      "🌻",
      "🌱",
      "🕯️",
      "🪑",
      "🚪",
      "🪤",
      "🧲",
      "🪚",
      "🔑",
      "🛡️",
      "🏺",
      "🪆",
      "🗝️",
    ],
  },
  {
    label: "Sports",
    emojis: [
      "💪",
      "🏋️",
      "🤸",
      "⚽",
      "🏀",
      "🎾",
      "🏊",
      "🚴",
      "🧘",
      "🏃",
      "⛷️",
      "🤺",
      "🏇",
      "🥊",
      "🎯",
      "🏹",
      "🛹",
      "🎽",
      "🥋",
      "🏅",
      "🎿",
      "🏈",
      "⚾",
      "🏐",
      "🏉",
      "🎱",
      "🏓",
      "🏸",
      "🤼",
      "🥅",
    ],
  },
  {
    label: "Tech",
    emojis: [
      "💻",
      "📱",
      "🖥️",
      "⌨️",
      "🖨️",
      "📷",
      "📸",
      "🎧",
      "🎙️",
      "📺",
      "🖱️",
      "💾",
      "📀",
      "🔋",
      "🔌",
      "📡",
      "🖊️",
      "📝",
      "📋",
      "🗂️",
      "🔭",
      "🔬",
      "🧪",
      "🧫",
      "🧬",
      "⚗️",
      "🔮",
      "🖲️",
      "💿",
      "📟",
    ],
  },
  {
    label: "Celebrate",
    emojis: [
      "🎉",
      "🎊",
      "🎈",
      "🎂",
      "🎁",
      "🥳",
      "🎆",
      "🎇",
      "✨",
      "🪄",
      "🎭",
      "🎪",
      "🏆",
      "🥇",
      "🎗️",
      "🎀",
      "🎏",
      "🎑",
      "🎃",
      "🎄",
      "🎋",
      "🎍",
      "🎎",
      "🎐",
      "🪩",
      "🎠",
      "🎡",
      "🎢",
      "🎪",
      "🪅",
    ],
  },
  {
    label: "Animals",
    emojis: [
      "🐾",
      "🐶",
      "🐱",
      "🐭",
      "🐹",
      "🐰",
      "🦊",
      "🐻",
      "🐼",
      "🐨",
      "🐯",
      "🦁",
      "🐸",
      "🦋",
      "🌸",
      "🌺",
      "🌹",
      "🍃",
      "🌲",
      "🌾",
      "🦄",
      "🐉",
      "🦅",
      "🦜",
      "🐬",
      "🦈",
      "🐙",
      "🦋",
      "🌞",
      "🌈",
    ],
  },
];

function extractEmoji(str) {
  const seg = str.trim();
  if (!seg) return "";
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
    const segments = [...segmenter.segment(seg)];
    return segments[0]?.segment || "";
  }
  const match = seg.match(/./su);
  return match ? match[0] : "";
}

function AddCategoryModal({ onAdd, onClose }) {
  const [label, setLabel] = useState("");
  const [emoji, setEmoji] = useState("🛒");
  const [color, setColor] = useState("#059669");
  const [customInput, setCustomInput] = useState("");
  const [activeGroup, setActiveGroup] = useState(0);
  const customRef = useRef(null);

  const handleCustomChange = (e) => {
    const val = e.target.value;
    setCustomInput(val);
    const extracted = extractEmoji(val);
    if (extracted) setEmoji(extracted);
  };

  const pickEmoji = (e) => {
    setEmoji(e);
    setCustomInput("");
  };

  const handleAdd = () => {
    const name = label.trim();
    if (!name) return;
    onAdd({ id: uid(), label: name, emoji: emoji || "🛒", color });
    onClose();
  };

  return (
    <div className="sl-cat-modal__overlay" onClick={onClose}>
      <div
        className="sl-cat-modal sl-cat-modal--wide"
        onClick={(e) => e.stopPropagation()}
      >
        <h4 className="sl-cat-modal__title">New Category</h4>

        <label className="sl-cat-modal__label">Name</label>
        <input
          className="sl-cat-modal__input"
          placeholder="e.g. Groceries"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          autoFocus
        />

        <label className="sl-cat-modal__label">Emoji</label>
        <div className="sl-emoji-preview-row">
          <div className="sl-emoji-preview">{emoji}</div>
          <div className="sl-emoji-custom-wrap">
            <input
              ref={customRef}
              className="sl-cat-modal__input sl-emoji-custom-input"
              placeholder="Type or paste any emoji here…"
              value={customInput}
              onChange={handleCustomChange}
            />
            <p className="sl-emoji-custom-hint">
              Type / paste any emoji — it updates the preview instantly
            </p>
          </div>
        </div>

        <div className="sl-emoji-group-tabs">
          {EMOJI_GROUPS.map((g, i) => (
            <button
              key={g.label}
              className={`sl-emoji-group-tab ${activeGroup === i ? "is-active" : ""}`}
              onClick={() => setActiveGroup(i)}
            >
              {g.emojis[0]} {g.label}
            </button>
          ))}
        </div>

        <div className="sl-emoji-grid">
          {EMOJI_GROUPS[activeGroup].emojis.map((e) => (
            <button
              key={e}
              className={`sl-cat-modal__emoji ${emoji === e ? "is-active" : ""}`}
              onClick={() => pickEmoji(e)}
              title={e}
            >
              {e}
            </button>
          ))}
        </div>

        <label className="sl-cat-modal__label">Color</label>
        <div className="sl-cat-modal__colors">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              className={`sl-cat-modal__color ${color === c ? "is-active" : ""}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>

        <div className="sl-cat-modal__footer">
          <button className="sl-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="sl-btn sl-btn--primary"
            onClick={handleAdd}
            disabled={!label.trim()}
          >
            Add Category
          </button>
        </div>
      </div>
    </div>
  );
}

// ── AI Panel ──────────────────────────────────────────────────────────────────
function AIPanel({ categories, items, activeCatId, onAddItems, onClose }) {
  const [mode, setMode] = useState("suggest"); // suggest | chat | budget | prioritize
  const [savedOpen, setSavedOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const chatEndRef = useRef(null);

  // ── Travel destination/trip-type context (Travel Items category only) —
  // lets Suggest mode reason about climate/season for what to buy, the same
  // way AI Packing Assistant does for what to pack from the closet.
  const [destination, setDestination] = useState("");
  const [tripType, setTripType] = useState("");

  // ── Saved AI feedback (persists across categories & sessions) ──
  const [savedFeedback, setSavedFeedback] = useState([]);
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FEEDBACK_KEY);
      setSavedFeedback(raw ? JSON.parse(raw) : []);
    } catch {
      setSavedFeedback([]);
    }
  }, []);

  const persistFeedback = (list) => {
    setSavedFeedback(list);
    try { syncSetItem(FEEDBACK_KEY, JSON.stringify(list)); } catch {}
  };

  const activeCat = categories.find((c) => c.id === activeCatId);

  // Applies the same male/female closet toggle Closet Search and Try-On
  // Studio already read, so suggestions lean toward the right style —
  // skipped for "Kids Items" since that category isn't tied to the adult
  // closet's gender at all (kids profiles have their own gender per child).
  const gender = localStorage.getItem(CLOSET_GENDER_KEY) || "female";
  const genderContext = activeCat?.id !== "kids" ? ` The shopper is ${gender === "male" ? "male" : "female"} — suggest items appropriate for ${gender === "male" ? "men's" : "women's"} fashion.` : "";

  const saveFeedback = (kind, content) => {
    if (!content) return;
    const entry = {
      id: uid(),
      catId: activeCatId,
      catLabel: activeCat?.label || "",
      catEmoji: activeCat?.emoji || "",
      kind,
      ts: Date.now(),
      content,
    };
    persistFeedback([entry, ...savedFeedback].slice(0, 100));
    setSavedMsg("✅ Feedback saved");
    setTimeout(() => setSavedMsg(""), 1800);
  };

  const deleteFeedback = (id) =>
    persistFeedback(savedFeedback.filter((f) => f.id !== id));

  const catItems = items.filter(
    (i) => i.categoryId === activeCatId && !i.checked,
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // ── Suggest items ──
  const isTravelCat = activeCat?.id === "travel";
  const handleSuggest = async () => {
    setLoading(true);
    setResult(null);
    try {
      const existing = catItems.map((i) => i.name).join(", ") || "none yet";
      const travelContext =
        isTravelCat && destination.trim()
          ? ` This is for a trip to "${destination.trim()}"${tripType ? ` (${tripType} trip)` : ""} — consider the destination's likely weather, climate, and season, and the trip type, when deciding what to suggest.`
          : "";
      const raw = await callAI(
        [
          {
            role: "user",
            content: `Category: "${activeCat?.label}". Context: "${input || "general shopping"}". Already have: ${existing}. Suggest 8-12 shopping items.${travelContext}${genderContext}`,
          },
        ],
        `You are a smart shopping assistant for a closet/lifestyle app called WIMC (What's In My Closet).
Return ONLY a JSON array like: [{"name":"Item","detail":"optional size/color/brand hint"}]
No markdown, no explanation, just the JSON array.`,
      );
      const parsed = extractJson(raw);
      setResult({ type: "suggest", items: parsed });
    } catch (e) {
      setResult({
        type: "error",
        message: aiErrMsg(e, "Couldn't generate suggestions. Please try again."),
      });
    } finally {
      setLoading(false);
    }
  };

  // ── Budget analysis ──
  const handleBudget = async () => {
    setLoading(true);
    setResult(null);
    try {
      const list = catItems.map((i) => i.name).join(", ") || "empty list";
      const raw = await callAI(
        [
          {
            role: "user",
            content: `Shopping list for "${activeCat?.label}": ${list}. Budget context: "${input || "general budget advice"}".${genderContext}`,
          },
        ],
        `You are a budget-conscious shopping advisor for WIMC app. 
Analyze the shopping list and return ONLY a JSON object like:
{"tips": ["tip1","tip2","tip3"], "priority": ["item1","item2"], "canSkip": ["item3"], "estimatedTotal": "$X-$Y", "savingsTip": "one key tip"}
No markdown, no explanation, just the JSON.`,
      );
      const parsed = extractJson(raw);
      setResult({ type: "budget", data: parsed });
    } catch (e) {
      setResult({
        type: "error",
        message: aiErrMsg(e, "Couldn't analyze budget. Please try again."),
      });
    } finally {
      setLoading(false);
    }
  };

  // ── Prioritize ──
  const handlePrioritize = async () => {
    setLoading(true);
    setResult(null);
    try {
      const list = catItems.map((i) => i.name).join(", ") || "empty list";
      const raw = await callAI(
        [
          {
            role: "user",
            content: `Prioritize this shopping list for "${activeCat?.label}": ${list}. Context: "${input || "everyday use"}"${genderContext}`,
          },
        ],
        `You are a smart shopping assistant for WIMC app.
Prioritize the list and return ONLY a JSON array of objects sorted by priority:
[{"name":"item","priority":"high|medium|low","reason":"brief reason"}]
No markdown, no explanation, just the JSON array.`,
      );
      const parsed = extractJson(raw);
      setResult({ type: "prioritize", items: parsed });
    } catch (e) {
      setResult({
        type: "error",
        message: aiErrMsg(e, "Couldn't prioritize. Please try again."),
      });
    } finally {
      setLoading(false);
    }
  };

  // ── Chat ──
  const handleChat = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput("");
    const newHistory = [...chatHistory, { role: "user", content: userMsg }];
    setChatHistory(newHistory);
    setLoading(true);
    try {
      const catContext = `Current category: "${activeCat?.label}". Items on list: ${catItems.map((i) => i.name).join(", ") || "none"}.${genderContext}`;
      const raw = await callAI(
        newHistory,
        `You are a helpful shopping assistant for WIMC (What's In My Closet), a closet and lifestyle app. ${catContext}
Help the user with shopping decisions, outfit planning, packing lists, or anything shopping-related. Be concise and practical.
If asked to add items to the list, respond with JSON at the end like: ITEMS:[{"name":"x","detail":"y"}]`,
      );
      const itemMatch = raw.match(/ITEMS:(\[.*?\])/s);
      let addedItems = [];
      let displayText = raw;
      if (itemMatch) {
        try {
          addedItems = JSON.parse(itemMatch[1]);
          displayText = raw.replace(/ITEMS:\[.*?\]/s, "").trim();
        } catch {}
      }
      setChatHistory([
        ...newHistory,
        { role: "assistant", content: displayText, addedItems },
      ]);
      if (addedItems.length > 0) {
        onAddItems(
          addedItems.map((it) => ({
            id: uid(),
            name: it.name,
            detail: it.detail || "",
            categoryId: activeCatId,
            checked: false,
            aiSuggested: true,
            note: "",
          })),
        );
      }
    } catch (e) {
      setChatHistory([
        ...newHistory,
        {
          role: "assistant",
          content: aiErrMsg(e, "Sorry, I couldn't process that. Please try again."),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const addSuggestedItems = (selected) => {
    onAddItems(
      selected.map((it) => ({
        id: uid(),
        name: it.name,
        detail: it.detail || "",
        categoryId: activeCatId,
        checked: false,
        aiSuggested: true,
        note: "",
      })),
    );
    // Keep the results (and the "Save feedback" button) visible after adding
    // — clearing them here meant Save was only ever available before you'd
    // added anything to your list.
  };

  return (
    <div className="sl-ai-panel">
      <div className="sl-ai-panel__header">
        <div className="sl-ai-panel__title">
          <span className="sl-ai-panel__icon">✨</span>
          AI Shopping Assistant
        </div>
        <button
          className="sl-ai-panel__saved-btn"
          onClick={() => setSavedOpen(true)}
          title="Your saved AI feedback (all categories)"
        >
          {gender === "male" ? "👔" : "👗"} Saved{savedFeedback.length ? ` (${savedFeedback.length})` : ""}
        </button>
        <button className="sl-ai-panel__close" onClick={onClose}>
          ×
        </button>
      </div>

      {/* Mode tabs */}
      <div className="sl-ai-modes">
        {[
          {
            id: "suggest",
            label: "💡 Suggest",
            title: "Get AI item suggestions",
          },
          { id: "chat", label: "💬 Chat", title: "Ask anything" },
          { id: "budget", label: "💰 Budget", title: "Budget analysis" },
          { id: "prioritize", label: "🎯 Prioritize", title: "Rank your list" },
        ].map((m) => (
          <button
            key={m.id}
            className={`sl-ai-mode ${mode === m.id ? "is-active" : ""}`}
            onClick={() => {
              setMode(m.id);
              setResult(null);
            }}
            title={m.title}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="sl-ai-panel__body">
        {/* ── Suggest mode ── */}
        {mode === "suggest" && (
          <div className="sl-ai-section">
            <p className="sl-ai-hint">
              Get personalized suggestions for{" "}
              <strong>
                {activeCat?.emoji} {activeCat?.label}
              </strong>
              .
            </p>
            {isTravelCat && (
              <>
                <div className="sl-ai-row">
                  <input
                    className="sl-ai-input"
                    placeholder="Destination (e.g. Cancun, Iceland)…"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSuggest()}
                  />
                </div>
                <div className="sl-ai-row">
                  <select
                    className="sl-ai-input sl-ai-input--select"
                    value={tripType}
                    onChange={(e) => setTripType(e.target.value)}
                  >
                    <option value="">Trip type (optional)</option>
                    {TRIP_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <div className="sl-ai-row">
              <input
                className="sl-ai-input"
                placeholder="Optional context: trip to Paris, back to school, winter closet…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSuggest()}
              />
              <button
                className="sl-btn sl-btn--ai"
                onClick={handleSuggest}
                disabled={loading}
              >
                {loading ? <span className="sl-spinner" /> : "Generate"}
              </button>
            </div>
            {isTravelCat && destination.trim() && (
              <p className="sl-ai-hint sl-ai-hint--travel">
                🌦️ Suggestions will consider {destination.trim()}'s likely weather/climate{tripType ? ` for a ${tripType.toLowerCase()} trip` : ""}.
              </p>
            )}

            {result?.type === "suggest" && (
              <>
                <SuggestResults items={result.items} onAdd={addSuggestedItems} />
                <button
                  className="sl-btn sl-btn--sm sl-save-fb"
                  onClick={() => saveFeedback("suggest", suggestToText(result.items, isTravelCat ? destination.trim() : "", isTravelCat ? tripType : ""))}
                >
                  💾 Save feedback
                </button>
                {savedMsg && <span className="sl-save-fb__msg">{savedMsg}</span>}
              </>
            )}
          </div>
        )}

        {/* ── Chat mode ── */}
        {mode === "chat" && (
          <div className="sl-ai-chat">
            <div className="sl-ai-chat__messages">
              {chatHistory.length === 0 && (
                <div className="sl-ai-chat__empty">
                  Ask me anything about your shopping list — what to buy, where
                  to shop, how to prioritize, or just say "add a winter coat"
                  and I'll add it to your list.
                </div>
              )}
              {chatHistory.map((msg, i) => (
                <div key={i} className={`sl-chat-msg sl-chat-msg--${msg.role}`}>
                  {msg.role === "assistant" && (
                    <span className="sl-chat-msg__avatar">✨</span>
                  )}
                  <div className="sl-chat-msg__bubble">{msg.content}</div>
                  {msg.role === "assistant" && msg.content && (
                    <button
                      className="sl-chat-msg__save"
                      onClick={() => saveFeedback("chat", msg.content)}
                      title="Save this answer to your saved feedback"
                    >
                      💾 Save
                    </button>
                  )}
                  {msg.addedItems?.length > 0 && (
                    <div className="sl-chat-msg__added">
                      ✓ Added {msg.addedItems.length} item
                      {msg.addedItems.length > 1 ? "s" : ""} to your list
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="sl-chat-msg sl-chat-msg--assistant">
                  <span className="sl-chat-msg__avatar">✨</span>
                  <div className="sl-chat-msg__bubble sl-chat-msg__bubble--loading">
                    <span className="sl-dot" />
                    <span className="sl-dot" />
                    <span className="sl-dot" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            {savedMsg && <span className="sl-save-fb__msg">{savedMsg}</span>}
            <div className="sl-ai-row">
              <input
                className="sl-ai-input"
                placeholder="Ask anything or say 'add [item]'…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !loading && handleChat()}
              />
              <button
                className="sl-btn sl-btn--ai"
                onClick={handleChat}
                disabled={loading || !input.trim()}
              >
                Send
              </button>
            </div>
          </div>
        )}

        {/* ── Budget mode ── */}
        {mode === "budget" && (
          <div className="sl-ai-section">
            <p className="sl-ai-hint">
              Get budget tips for your{" "}
              <strong>
                {activeCat?.emoji} {activeCat?.label}
              </strong>{" "}
              list ({catItems.length} items).
            </p>
            <div className="sl-ai-row">
              <input
                className="sl-ai-input"
                placeholder="Optional: my budget is $200, looking for deals…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleBudget()}
              />
              <button
                className="sl-btn sl-btn--ai"
                onClick={handleBudget}
                disabled={loading || catItems.length === 0}
              >
                {loading ? <span className="sl-spinner" /> : "Analyze"}
              </button>
            </div>
            {catItems.length === 0 && (
              <p className="sl-ai-warn">Add some items to your list first.</p>
            )}
            {result?.type === "budget" && (
              <>
                <BudgetResults data={result.data} />
                <button
                  className="sl-btn sl-btn--sm sl-save-fb"
                  onClick={() => saveFeedback("budget", budgetToText(result.data))}
                >
                  💾 Save feedback
                </button>
                {savedMsg && <span className="sl-save-fb__msg">{savedMsg}</span>}
              </>
            )}
          </div>
        )}

        {/* ── Prioritize mode ── */}
        {mode === "prioritize" && (
          <div className="sl-ai-section">
            <p className="sl-ai-hint">
              AI will rank your{" "}
              <strong>
                {activeCat?.emoji} {activeCat?.label}
              </strong>{" "}
              items by importance.
            </p>
            <div className="sl-ai-row">
              <input
                className="sl-ai-input"
                placeholder="Optional context: limited budget, going on vacation…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePrioritize()}
              />
              <button
                className="sl-btn sl-btn--ai"
                onClick={handlePrioritize}
                disabled={loading || catItems.length === 0}
              >
                {loading ? <span className="sl-spinner" /> : "Prioritize"}
              </button>
            </div>
            {catItems.length === 0 && (
              <p className="sl-ai-warn">Add some items to your list first.</p>
            )}
            {result?.type === "prioritize" && (
              <>
                <PrioritizeResults items={result.items} />
                <button
                  className="sl-btn sl-btn--sm sl-save-fb"
                  onClick={() => saveFeedback("prioritize", prioritizeToText(result.items))}
                >
                  💾 Save feedback
                </button>
                {savedMsg && <span className="sl-save-fb__msg">{savedMsg}</span>}
              </>
            )}
          </div>
        )}

        {result?.type === "error" && (
          <ApiErrorMessage className="sl-ai-error" message={result.message} />
        )}
      </div>

      {/* ── Saved feedback (all categories) — own centered modal, same
          pattern as Favorites/Saved Looks/Donation Sets elsewhere in the
          app, so it doesn't grow the chat panel inline. ── */}
      {savedOpen && (
        <div className="opp-saved__backdrop" onClick={() => setSavedOpen(false)}>
          <aside
            className="opp-saved"
            role="dialog"
            aria-modal="true"
            aria-label="Saved AI Feedback"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="opp-saved__head">
              <h4 className="opp-saved__title">{gender === "male" ? "👔" : "👗"} Saved Feedback</h4>
              <button className="opp__btn" onClick={() => setSavedOpen(false)} aria-label="Close">
                ✕
              </button>
            </header>
            <div className="opp-saved__content">
              {savedFeedback.length === 0 ? (
                <p className="sl-ai-hint">
                  No saved feedback yet. Run 💰 Budget, 🎯 Prioritize, or 💬 Chat,
                  then tap <strong>💾 Save feedback</strong> to keep it here —
                  across all your categories.
                </p>
              ) : (
                <div className="sl-saved-fb">
                  {savedFeedback.map((f) => (
                    <div key={f.id} className="sl-saved-fb__card">
                      <div className="sl-saved-fb__head">
                        <span className="sl-saved-fb__cat">
                          {f.catEmoji} {f.catLabel}
                        </span>
                        <span className="sl-saved-fb__kind">
                          {f.kind === "budget" ? "💰 Budget" : f.kind === "prioritize" ? "🎯 Prioritize" : f.kind === "suggest" ? "💡 Suggest" : "💬 Chat"}
                        </span>
                        <span className="sl-saved-fb__date">
                          {new Date(f.ts).toLocaleDateString()}
                        </span>
                        <button
                          className="sl-saved-fb__del"
                          onClick={() => deleteFeedback(f.id)}
                          title="Delete saved feedback"
                          aria-label="Delete saved feedback"
                        >
                          🗑️
                        </button>
                      </div>
                      <pre className="sl-saved-fb__body">{f.content}</pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function SuggestResults({ items, onAdd }) {
  const [selected, setSelected] = useState(new Set(items.map((_, i) => i)));

  const toggle = (i) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  return (
    <div className="sl-suggest">
      <div className="sl-suggest__header">
        <span className="sl-suggest__count">
          {selected.size} of {items.length} selected
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            className="sl-btn sl-btn--sm"
            onClick={() => setSelected(new Set(items.map((_, i) => i)))}
          >
            All
          </button>
          <button
            className="sl-btn sl-btn--sm"
            onClick={() => setSelected(new Set())}
          >
            None
          </button>
        </div>
      </div>
      <div className="sl-suggest__list">
        {items.map((it, i) => (
          <button
            key={i}
            className={`sl-suggest__item ${selected.has(i) ? "is-selected" : ""}`}
            onClick={() => toggle(i)}
          >
            <span className="sl-suggest__check">
              {selected.has(i) ? "✓" : ""}
            </span>
            <div>
              <div className="sl-suggest__name">{it.name}</div>
              {it.detail && (
                <div className="sl-suggest__detail">{it.detail}</div>
              )}
            </div>
          </button>
        ))}
      </div>
      <button
        className="sl-btn sl-btn--primary sl-btn--full"
        disabled={selected.size === 0}
        onClick={() => onAdd(Array.from(selected).map((i) => items[i]))}
      >
        Add {selected.size} Item{selected.size !== 1 ? "s" : ""} to List
      </button>
    </div>
  );
}

function BudgetResults({ data }) {
  return (
    <div className="sl-budget">
      {data.estimatedTotal && (
        <div className="sl-budget__total">
          Estimated total: <strong>{data.estimatedTotal}</strong>
        </div>
      )}
      {data.savingsTip && (
        <div className="sl-budget__tip">💡 {data.savingsTip}</div>
      )}
      {data.priority?.length > 0 && (
        <div className="sl-budget__section">
          <div className="sl-budget__label">🎯 Buy first</div>
          {data.priority.map((item, i) => (
            <div key={i} className="sl-budget__item sl-budget__item--high">
              {item}
            </div>
          ))}
        </div>
      )}
      {data.canSkip?.length > 0 && (
        <div className="sl-budget__section">
          <div className="sl-budget__label">⏭ Can skip for now</div>
          {data.canSkip.map((item, i) => (
            <div key={i} className="sl-budget__item sl-budget__item--low">
              {item}
            </div>
          ))}
        </div>
      )}
      {data.tips?.length > 0 && (
        <div className="sl-budget__section">
          <div className="sl-budget__label">📋 Tips</div>
          {data.tips.map((tip, i) => (
            <div key={i} className="sl-budget__item">
              • {tip}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PrioritizeResults({ items }) {
  const colors = { high: "#dcfce7", medium: "#fef9c3", low: "#fee2e2" };
  const labels = { high: "🔴 High", medium: "🟡 Medium", low: "🟢 Low" };
  return (
    <div className="sl-prioritize">
      {items.map((it, i) => (
        <div
          key={i}
          className="sl-prioritize__item"
          style={{ background: colors[it.priority] || "#f8fafc" }}
        >
          <div className="sl-prioritize__rank">#{i + 1}</div>
          <div className="sl-prioritize__body">
            <div className="sl-prioritize__name">{it.name}</div>
            <div className="sl-prioritize__reason">{it.reason}</div>
          </div>
          <div className="sl-prioritize__badge">
            {labels[it.priority] || it.priority}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ShoppingList() {
  const [collapsed, setCollapsed] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [activeCatId, setActiveCatId] = useState(DEFAULT_CATEGORIES[0].id);
  const [items, setItems] = useState([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemDetail, setNewItemDetail] = useState("");
  const [showAddCat, setShowAddCat] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [filter, setFilter] = useState("all"); // all | active | checked
  const [search, setSearch] = useState("");
  const [shareMsg, setShareMsg] = useState("");
  const [smsHref, setSmsHref] = useState("");
  const [sharing, setSharing] = useState(false);
  const [shareNote, setShareNote] = useState("");
  const [importUrl, setImportUrl] = useState("");
  const [importError, setImportError] = useState("");
  const [loadingImport, setLoadingImport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [lastCleared, setLastCleared] = useState(null); // undo clear
  const undoClearTimerRef = useRef(null);
  const inputRef = useRef(null);
  const hydratedRef = useRef(false);

  // ── Hydrate ──
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || "null");
      if (saved) {
        if (saved.categories) setCategories(saved.categories);
        if (saved.items) setItems(saved.items);
        if (saved.activeCatId) setActiveCatId(saved.activeCatId);
      }
    } catch {}
  }, []);

  // ── Persist ──
  useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      syncSetItem(
        LS_KEY,
        JSON.stringify({ categories, items, activeCatId }),
      );
    } catch {}
  }, [categories, items, activeCatId]);

  const activeCat =
    categories.find((c) => c.id === activeCatId) || categories[0];
  const catItems = items.filter((i) => i.categoryId === activeCatId);
  const checkedCount = catItems.filter((i) => i.checked).length;
  const totalCount = items.filter((i) => !i.checked).length;

  const filteredItems = catItems.filter((item) => {
    const matchFilter =
      filter === "all"
        ? true
        : filter === "active"
          ? !item.checked
          : filter === "checked"
            ? item.checked
            : true;
    const matchSearch =
      !search || item.name.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const addItem = () => {
    const name = newItemName.trim();
    if (!name) return;
    setItems((prev) => [
      ...prev,
      {
        id: uid(),
        name,
        detail: newItemDetail.trim(),
        categoryId: activeCatId,
        checked: false,
        aiSuggested: false,
        note: "",
      },
    ]);
    setNewItemName("");
    setNewItemDetail("");
    inputRef.current?.focus();
  };

  const toggleItem = (id) =>
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)),
    );
  const deleteItem = (id) =>
    setItems((prev) => prev.filter((i) => i.id !== id));
  const editNote = (id, note) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, note } : i)));
  const dismissMatch = (id) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, closetMatchDismissed: true } : i)));

  // ── "Already in your closet?" opt-in check ─────────────────────────────────
  const [closetChecking, setClosetChecking] = useState(false);
  const [closetCheckMsg, setClosetCheckMsg] = useState("");
  const checkAgainstCloset = async () => {
    // Scoped to the category currently being viewed — checking all
    // categories at once could flag matches on items in a different, hidden
    // tab, showing a "Found N matches" count with no visible badge anywhere.
    const unchecked = catItems.filter((i) => !i.checked);
    if (!unchecked.length || closetChecking) return;
    setClosetChecking(true);
    setClosetCheckMsg("");
    try {
      const gender = localStorage.getItem(CLOSET_GENDER_KEY) || "female";
      const { matchesById, checkedCount, totalCount, errored, errorMessage } = await checkShoppingListAgainstCloset(unchecked, gender);
      if (errored) {
        setClosetCheckMsg(errorMessage || "Couldn't complete the check. Please try again.");
      } else {
        const matchCount = Object.keys(matchesById).length;
        setItems((prev) =>
          prev.map((i) =>
            matchesById[i.id]
              ? { ...i, closetMatch: matchesById[i.id], closetMatchDismissed: false }
              : i,
          ),
        );
        const truncatedNote =
          totalCount > checkedCount ? ` (checked the first ${checkedCount} of ${totalCount} items)` : "";
        setClosetCheckMsg(
          (matchCount
            ? `Found ${matchCount} possible match${matchCount !== 1 ? "es" : ""} in your closet.`
            : "No likely matches found in your closet.") + truncatedNote,
        );
      }
    } catch {
      setClosetCheckMsg("Couldn't complete the check. Please try again.");
    } finally {
      setClosetChecking(false);
      setTimeout(() => setClosetCheckMsg(""), 5000);
    }
  };
  const clearChecked = () => {
    setItems((prev) => {
      const toRemove = prev.filter((i) => i.categoryId === activeCatId && i.checked);
      setLastCleared(toRemove);
      clearTimeout(undoClearTimerRef.current);
      undoClearTimerRef.current = setTimeout(() => setLastCleared(null), 6000);
      return prev.filter((i) => !(i.categoryId === activeCatId && i.checked));
    });
  };
  const undoClear = () => {
    if (!lastCleared) return;
    setItems((prev) => [...prev, ...lastCleared]);
    setLastCleared(null);
    clearTimeout(undoClearTimerRef.current);
  };

  const addCategory = (cat) => {
    setCategories((prev) => [...prev, cat]);
    setActiveCatId(cat.id);
  };

  const deleteCategory = (id) => {
    if (categories.length <= 1) return;
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setItems((prev) => prev.filter((i) => i.categoryId !== id));
    if (activeCatId === id)
      setActiveCatId(categories.find((c) => c.id !== id)?.id);
  };

  const addAIItems = useCallback((newItems) => {
    setItems((prev) => [...prev, ...newItems]);
  }, []);

  const buildPayload = () => ({
    kind: "wimc.shoppingList",
    version: 1,
    createdAt: new Date().toISOString(),
    note: shareNote,
    categories,
    items: items.map((i) => ({ ...i })),
    meta: { source: "WIMC Shopping List" },
  });

  const shareList = async (withEdit = false) => {
    setSharing(true);
    setShareMsg("");
    try {
      let url;
      if (withEdit) {
        url = await createCollabDoc("shoppinglist", buildPayload());
      } else {
        const res = await uploadRawJSON(buildPayload(), "wimc/shopping-lists");
        const cloudUrl = res?.secure_url || res?.url || res?.data?.secure_url || res?.data?.url;
        if (!cloudUrl) throw new Error("Upload failed");
        url = appShareUrl(cloudUrl, "shoppinglist");
      }
      const result = await shareAppLink({ title: "My Shopping List 🛒", text: shareNote ? `Check out my shopping list!\n\n📝 ${shareNote}` : "Check out my shopping list!", url });
      if (result === "clipboard" || result === "unsupported") {
        setSmsHref(smsShareUrl(url, "Check out my shopping list!"));
        setTimeout(() => setSmsHref(""), 6000);
      }
      setShareMsg(result === "clipboard" ? "📋 Link copied!" : "✅ Shared!");
    } catch { setShareMsg("❌ Share failed"); }
    finally { setSharing(false); setTimeout(() => setShareMsg(""), 3000); }
  };

  const copyAsText = () => {
    const text = categories
      .map((cat) => {
        const catItems = items.filter((i) => i.categoryId === cat.id);
        if (!catItems.length) return null;
        const lines = catItems.map(
          (i) =>
            `  ${i.checked ? "✓" : "○"} ${i.name}${i.detail ? ` (${i.detail})` : ""}${i.note ? ` — ${i.note}` : ""}`,
        );
        return `${cat.emoji} ${cat.label}\n${lines.join("\n")}`;
      })
      .filter(Boolean)
      .join("\n\n");
    navigator.clipboard.writeText(text).then(() => {
      setShareMsg("📋 Text copied!");
      setTimeout(() => setShareMsg(""), 2000);
    }).catch(() => {
      setShareMsg("⚠️ Could not copy — please copy manually.");
      setTimeout(() => setShareMsg(""), 3000);
    });
  };

  const importFromUrl = async () => {
    if (!importUrl.trim()) return;
    setLoadingImport(true);
    setImportError("");
    try {
      const res = await fetch(importUrl.trim());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.kind !== "wimc.shoppingList")
        throw new Error("Not a shopping list file.");
      // Merge categories (avoid duplicates by id)
      if (Array.isArray(data.categories)) {
        setCategories((prev) => {
          const existingIds = new Set(prev.map((c) => c.id));
          const newCats = data.categories.filter((c) => !existingIds.has(c.id));
          return [...prev, ...newCats];
        });
      }
      // Merge items (avoid duplicates by id)
      if (Array.isArray(data.items)) {
        setItems((prev) => {
          const existingIds = new Set(prev.map((i) => i.id));
          const newItems = data.items.filter((i) => !existingIds.has(i.id));
          return [...prev, ...newItems];
        });
      }
      setImportUrl("");
      setShowImport(false);
      setShareMsg("✅ List imported!");
      setTimeout(() => setShareMsg(""), 2500);
    } catch (e) {
      setImportError(e.message || "Could not load that link.");
    } finally {
      setLoadingImport(false);
    }
  };

  if (!isOpen) {
    return (
      <section className={`sl-stub ${collapsed ? "is-collapsed" : ""}`}>
        <header
          className="sl-stub__header"
          onClick={() => setCollapsed((v) => !v)}
        >
          <div className="sl-stub__left">
            <span className="sl-stub__icon">🛒</span>
            <h3 className="sl-stub__title">Shopping List</h3>
            {totalCount > 0 && (
              <span className="sl-stub__count">{totalCount}</span>
            )}
          </div>
          <div className="sl-stub__right" onClick={(e) => e.stopPropagation()}>
            <button className="sl-stub__open" onClick={() => setIsOpen(true)}>
              Open
            </button>
            <span className="sl-stub__caret">{collapsed ? "▸" : "▾"}</span>
          </div>
        </header>
        {!collapsed && (
          <div className="sl-stub__body">
            {categories.map((cat) => {
              const n = items.filter(
                (i) => i.categoryId === cat.id && !i.checked,
              ).length;
              return n > 0 ? (
                <div key={cat.id} className="sl-stub__cat">
                  <span>
                    {cat.emoji} {cat.label}
                  </span>
                  <span className="sl-stub__n">{n}</span>
                </div>
              ) : null;
            })}
            {totalCount === 0 && (
              <p className="sl-stub__empty">Nothing on your list yet.</p>
            )}
            <button
              className="sl-stub__open-full"
              onClick={() => setIsOpen(true)}
            >
              Open Shopping List →
            </button>
          </div>
        )}
      </section>
    );
  }

  return (
    <>
      <div className="sl-backdrop" onClick={() => setIsOpen(false)} />
      <aside
        className="sl-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Shopping List"
      >
        {/* Header */}
        <header className="sl-header">
          <div className="sl-header__left">
            <span className="sl-header__icon">🛒</span>
            <div>
              <h2 className="sl-header__title">Shopping List</h2>
              <p className="sl-header__sub">
                {totalCount} item{totalCount !== 1 ? "s" : ""} to buy
              </p>
            </div>
          </div>
          <div className="sl-header__actions">
            <button
              className={`sl-btn sl-btn--ai-toggle ${showAI ? "is-active" : ""}`}
              onClick={() => setShowAI((v) => !v)}
              title="AI Shopping Assistant"
            >
              ✨ AI
            </button>
            <button
              className="sl-btn"
              onClick={copyAsText}
              title="Copy list as plain text"
            >
              📋 Copy
            </button>
            <button
              className={`sl-btn ${showImport ? "is-active" : ""}`}
              onClick={() => setShowImport((v) => !v)}
              title="Import a shared list from a link"
            >
              📥 Import
            </button>
            {shareMsg && <span className="sl-share-msg">{shareMsg}</span>}
            {smsHref && (
              <a href={smsHref} className="sl-btn sl-btn--share" style={{ textDecoration: "none" }}>
                📱 Text
              </a>
            )}
            <button className="sl-close" onClick={() => setIsOpen(false)}>
              ×
            </button>
          </div>
        </header>

        {/* Share bar — share buttons left, note right */}
        <div className="sl-share-bar">
          <div className="sl-share-btns">
            <button
              className="sl-btn sl-btn--share"
              onClick={() => shareList(false)}
              disabled={sharing}
              title="Share list (view only)"
            >
              {sharing ? <span className="sl-spinner" /> : "Share (View Only)"}
            </button>
            <button
              className="sl-btn sl-btn--edit"
              onClick={() => shareList(true)}
              disabled={sharing}
              title="Share list with edit access"
            >
              ✏️ Share + Edit
            </button>
          </div>
          <input
            type="text"
            className="sl-share-note"
            placeholder="Add a note for the recipient, when sharing (optional)…"
            value={shareNote}
            onChange={(e) => setShareNote(e.target.value)}
          />
        </div>

        {showImport && (
          <div className="sl-import-bar">
            <span className="sl-import-bar__label">📥 Import from link:</span>
            <input
              className="sl-import-bar__input"
              type="url"
              placeholder="Paste a shared shopping list URL…"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && importFromUrl()}
            />
            <button
              className="sl-btn sl-btn--primary"
              onClick={importFromUrl}
              disabled={loadingImport || !importUrl.trim()}
            >
              {loadingImport ? <span className="sl-spinner" /> : "Load"}
            </button>
            <button
              className="sl-btn"
              onClick={() => {
                setShowImport(false);
                setImportError("");
              }}
            >
              Cancel
            </button>
            {importError && (
              <span className="sl-import-bar__error">{importError}</span>
            )}
          </div>
        )}
        <div className="sl-layout">
          {/* Left: categories + AI panel */}
          <nav className="sl-sidebar">
            <div className="sl-sidebar__cats">
              {categories.map((cat) => (
                <div key={cat.id} className="sl-tab-wrap">
                  <CategoryTab
                    cat={cat}
                    active={activeCatId === cat.id}
                    count={
                      items.filter((i) => i.categoryId === cat.id && !i.checked)
                        .length
                    }
                    onClick={() => setActiveCatId(cat.id)}
                  />
                  {categories.length > 1 && activeCatId === cat.id && (
                    <button
                      className="sl-tab-delete"
                      onClick={() => deleteCategory(cat.id)}
                      title="Delete category"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                className="sl-add-cat-btn"
                onClick={() => setShowAddCat(true)}
              >
                + Add Category
              </button>
            </div>

            {showAI && (
              <AIPanel
                categories={categories}
                items={items}
                activeCatId={activeCatId}
                onAddItems={addAIItems}
                onClose={() => setShowAI(false)}
              />
            )}
          </nav>

          {/* Right: list */}
          <div className="sl-main">
            {/* Category header */}
            <div
              className="sl-main__head"
              style={{ "--cat-color": activeCat?.color }}
            >
              <span className="sl-main__emoji">{activeCat?.emoji}</span>
              <h3 className="sl-main__cat-name">{activeCat?.label}</h3>
              <span className="sl-main__progress">
                {checkedCount}/{catItems.length} done
              </span>
            </div>

            {/* Add item row */}
            <div className="sl-add-row">
              <input
                ref={inputRef}
                className="sl-add-input"
                placeholder="Add item…"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addItem()}
              />
              <input
                className="sl-add-input sl-add-input--detail"
                placeholder="Size / color / brand (optional)"
                value={newItemDetail}
                onChange={(e) => setNewItemDetail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addItem()}
              />
              <button
                className="sl-btn sl-btn--primary"
                onClick={addItem}
                disabled={!newItemName.trim()}
              >
                Add
              </button>
            </div>
            <p className="sl-add-tip">
              💡 Tip: be specific (e.g. "black ankle boots" instead of "boots") — it helps the
              "Check my closet" tool below catch duplicates more accurately.
            </p>

            <div className="sl-dupe-check-row">
              <button
                className="sl-btn sl-btn--sm"
                onClick={checkAgainstCloset}
                disabled={closetChecking || !catItems.some((i) => !i.checked)}
              >
                {closetChecking ? "Checking your closet…" : "👀 Check my closet for duplicates"}
              </button>
              {closetCheckMsg && <span className="sl-dupe-check-msg">{closetCheckMsg}</span>}
            </div>

            {/* Filters + search */}
            <div className="sl-filters">
              <div className="sl-filter-btns">
                {["all", "active", "checked"].map((f) => (
                  <button
                    key={f}
                    className={`sl-filter-btn ${filter === f ? "is-active" : ""}`}
                    onClick={() => setFilter(f)}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
              <input
                className="sl-search"
                placeholder="🔍 Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {checkedCount > 0 && (
                <button
                  className="sl-btn sl-btn--sm sl-btn--danger"
                  onClick={clearChecked}
                >
                  Clear done ({checkedCount})
                </button>
              )}
              {lastCleared && lastCleared.length > 0 && (
                <button
                  className="sl-btn sl-btn--sm sl-btn--undo"
                  onClick={undoClear}
                >
                  ↩ Undo clear ({lastCleared.length})
                </button>
              )}
            </div>

            {/* Progress bar */}
            {catItems.length > 0 && (
              <div className="sl-progress">
                <div
                  className="sl-progress__bar"
                  style={{
                    width: `${(checkedCount / catItems.length) * 100}%`,
                    background: activeCat?.color,
                  }}
                />
              </div>
            )}

            {/* Items */}
            <div className="sl-items">
              {filteredItems.length === 0 ? (
                <div className="sl-empty">
                  {catItems.length === 0 ? (
                    <>
                      <p>Nothing here yet.</p>
                      <p>Add items above or use ✨ AI to get suggestions!</p>
                    </>
                  ) : (
                    <p>No items match your filter.</p>
                  )}
                </div>
              ) : (
                filteredItems.map((item) => (
                  <ShoppingItem
                    key={item.id}
                    item={item}
                    onToggle={toggleItem}
                    onDelete={deleteItem}
                    onEditNote={editNote}
                    onDismissMatch={dismissMatch}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </aside>

      {showAddCat && (
        <AddCategoryModal
          onAdd={addCategory}
          onClose={() => setShowAddCat(false)}
        />
      )}
    </>
  );
}

// import React, { useState, useEffect, useRef, useCallback } from "react";
// import { uploadRawJSON } from "../../utils/CloudinaryAPI";
// import "./ShoppingList.css";

// // ── Default categories ────────────────────────────────────────────────────────
// const DEFAULT_CATEGORIES = [
//   {
//     id: "clothing",
//     label: "Clothing & Accessories",
//     emoji: "👗",
//     color: "#7c3aed",
//   },
//   { id: "travel", label: "Travel Items", emoji: "✈️", color: "#0369a1" },
//   { id: "kids", label: "Kids Items", emoji: "🧸", color: "#d97706" },
// ];

// const LS_KEY = "wimc_shopping_list_v1";

// function uid() {
//   return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
// }

// // ── AI call via Anthropic API ─────────────────────────────────────────────────
// async function callAI(messages, systemPrompt) {
//   const res = await fetch(process.env.REACT_APP_ANTHROPIC_PROXY_URL, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({
//       model: "claude-sonnet-4-20250514",
//       max_tokens: 1000,
//       system: systemPrompt,
//       messages,
//     }),
//   });
//   const data = await res.json();
//   return data.content?.find((b) => b.type === "text")?.text || "";
// }

// // ── Sub-components ────────────────────────────────────────────────────────────

// function CategoryTab({ cat, active, count, onClick }) {
//   return (
//     <button
//       className={`sl-tab ${active ? "sl-tab--active" : ""}`}
//       style={{ "--tab-color": cat.color }}
//       onClick={onClick}
//     >
//       <span className="sl-tab__emoji">{cat.emoji}</span>
//       <span className="sl-tab__label">{cat.label}</span>
//       {count > 0 && <span className="sl-tab__badge">{count}</span>}
//     </button>
//   );
// }

// function ShoppingItem({ item, onToggle, onDelete, onEditNote }) {
//   const [editingNote, setEditingNote] = useState(false);
//   const [note, setNote] = useState(item.note || "");

//   const saveNote = () => {
//     onEditNote(item.id, note);
//     setEditingNote(false);
//   };

//   return (
//     <div className={`sl-item ${item.checked ? "sl-item--checked" : ""}`}>
//       <button
//         className="sl-item__check"
//         onClick={() => onToggle(item.id)}
//         aria-label={item.checked ? "Uncheck" : "Check"}
//       >
//         {item.checked ? "✓" : ""}
//       </button>
//       <div className="sl-item__body">
//         <span className="sl-item__name">{item.name}</span>
//         {item.detail && <span className="sl-item__detail">{item.detail}</span>}
//         {editingNote ? (
//           <div className="sl-item__note-edit">
//             <input
//               className="sl-item__note-input"
//               value={note}
//               onChange={(e) => setNote(e.target.value)}
//               onKeyDown={(e) => e.key === "Enter" && saveNote()}
//               autoFocus
//               placeholder="Add a note…"
//             />
//             <button className="sl-item__note-save" onClick={saveNote}>
//               ✓
//             </button>
//           </div>
//         ) : (
//           <span
//             className="sl-item__note"
//             onClick={() => setEditingNote(true)}
//             title="Click to add/edit note"
//           >
//             {item.note || <span className="sl-item__note--empty">+ note</span>}
//           </span>
//         )}
//         {item.aiSuggested && <span className="sl-item__ai-tag">✨ AI</span>}
//       </div>
//       <button
//         className="sl-item__delete"
//         onClick={() => onDelete(item.id)}
//         aria-label="Delete"
//       >
//         ×
//       </button>
//     </div>
//   );
// }

// // ── Add Category Modal ────────────────────────────────────────────────────────
// const PRESET_COLORS = [
//   "#7c3aed",
//   "#0369a1",
//   "#d97706",
//   "#059669",
//   "#dc2626",
//   "#db2777",
//   "#0891b2",
//   "#65a30d",
//   "#9333ea",
//   "#ea580c",
// ];
// const PRESET_EMOJIS = [
//   "🛒",
//   "🏠",
//   "💊",
//   "📚",
//   "🎁",
//   "🍎",
//   "🧴",
//   "🐾",
//   "🎮",
//   "💼",
// ];

// function AddCategoryModal({ onAdd, onClose }) {
//   const [label, setLabel] = useState("");
//   const [emoji, setEmoji] = useState("🛒");
//   const [color, setColor] = useState("#059669");
//   const [custom, setCustom] = useState("");

//   const handleAdd = () => {
//     const name = label.trim();
//     if (!name) return;
//     onAdd({ id: uid(), label: name, emoji: custom || emoji, color });
//     onClose();
//   };

//   return (
//     <div className="sl-cat-modal__overlay" onClick={onClose}>
//       <div className="sl-cat-modal" onClick={(e) => e.stopPropagation()}>
//         <h4 className="sl-cat-modal__title">New Category</h4>
//         <label className="sl-cat-modal__label">Name</label>
//         <input
//           className="sl-cat-modal__input"
//           placeholder="e.g. Groceries"
//           value={label}
//           onChange={(e) => setLabel(e.target.value)}
//           autoFocus
//         />
//         <label className="sl-cat-modal__label">Emoji</label>
//         <div className="sl-cat-modal__emojis">
//           {PRESET_EMOJIS.map((e) => (
//             <button
//               key={e}
//               className={`sl-cat-modal__emoji ${emoji === e && !custom ? "is-active" : ""}`}
//               onClick={() => {
//                 setEmoji(e);
//                 setCustom("");
//               }}
//             >
//               {e}
//             </button>
//           ))}
//         </div>
//         <input
//           className="sl-cat-modal__input"
//           placeholder="Or type any emoji…"
//           value={custom}
//           onChange={(e) => setCustom(e.target.value)}
//           maxLength={4}
//         />
//         <label className="sl-cat-modal__label">Color</label>
//         <div className="sl-cat-modal__colors">
//           {PRESET_COLORS.map((c) => (
//             <button
//               key={c}
//               className={`sl-cat-modal__color ${color === c ? "is-active" : ""}`}
//               style={{ background: c }}
//               onClick={() => setColor(c)}
//             />
//           ))}
//         </div>
//         <div className="sl-cat-modal__footer">
//           <button className="sl-btn" onClick={onClose}>
//             Cancel
//           </button>
//           <button
//             className="sl-btn sl-btn--primary"
//             onClick={handleAdd}
//             disabled={!label.trim()}
//           >
//             Add Category
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ── AI Panel ──────────────────────────────────────────────────────────────────
// function AIPanel({ categories, items, activeCatId, onAddItems, onClose }) {
//   const [mode, setMode] = useState("suggest"); // suggest | chat | budget | prioritize
//   const [input, setInput] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [result, setResult] = useState(null);
//   const [chatHistory, setChatHistory] = useState([]);
//   const chatEndRef = useRef(null);

//   const activeCat = categories.find((c) => c.id === activeCatId);
//   const catItems = items.filter(
//     (i) => i.categoryId === activeCatId && !i.checked,
//   );

//   useEffect(() => {
//     chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [chatHistory]);

//   // ── Suggest items ──
//   const handleSuggest = async () => {
//     setLoading(true);
//     setResult(null);
//     try {
//       const existing = catItems.map((i) => i.name).join(", ") || "none yet";
//       const raw = await callAI(
//         [
//           {
//             role: "user",
//             content: `Category: "${activeCat?.label}". Context: "${input || "general shopping"}". Already have: ${existing}. Suggest 8-12 shopping items.`,
//           },
//         ],
//         `You are a smart shopping assistant for a closet/lifestyle app called WIMC (What's In My Closet).
// Return ONLY a JSON array like: [{"name":"Item","detail":"optional size/color/brand hint"}]
// No markdown, no explanation, just the JSON array.`,
//       );
//       const parsed = JSON.parse(raw.trim());
//       setResult({ type: "suggest", items: parsed });
//     } catch {
//       setResult({
//         type: "error",
//         message: "Couldn't generate suggestions. Please try again.",
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ── Budget analysis ──
//   const handleBudget = async () => {
//     setLoading(true);
//     setResult(null);
//     try {
//       const list = catItems.map((i) => i.name).join(", ") || "empty list";
//       const raw = await callAI(
//         [
//           {
//             role: "user",
//             content: `Shopping list for "${activeCat?.label}": ${list}. Budget context: "${input || "general budget advice"}".${genderContext}`,
//           },
//         ],
//         `You are a budget-conscious shopping advisor for WIMC app.
// Analyze the shopping list and return ONLY a JSON object like:
// {"tips": ["tip1","tip2","tip3"], "priority": ["item1","item2"], "canSkip": ["item3"], "estimatedTotal": "$X-$Y", "savingsTip": "one key tip"}
// No markdown, no explanation, just the JSON.`,
//       );
//       const parsed = JSON.parse(raw.trim());
//       setResult({ type: "budget", data: parsed });
//     } catch {
//       setResult({
//         type: "error",
//         message: "Couldn't analyze budget. Please try again.",
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ── Prioritize ──
//   const handlePrioritize = async () => {
//     setLoading(true);
//     setResult(null);
//     try {
//       const list = catItems.map((i) => i.name).join(", ") || "empty list";
//       const raw = await callAI(
//         [
//           {
//             role: "user",
//             content: `Prioritize this shopping list for "${activeCat?.label}": ${list}. Context: "${input || "everyday use"}"${genderContext}`,
//           },
//         ],
//         `You are a smart shopping assistant for WIMC app.
// Prioritize the list and return ONLY a JSON array of objects sorted by priority:
// [{"name":"item","priority":"high|medium|low","reason":"brief reason"}]
// No markdown, no explanation, just the JSON array.`,
//       );
//       const parsed = JSON.parse(raw.trim());
//       setResult({ type: "prioritize", items: parsed });
//     } catch {
//       setResult({
//         type: "error",
//         message: "Couldn't prioritize. Please try again.",
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ── Chat ──
//   const handleChat = async () => {
//     if (!input.trim()) return;
//     const userMsg = input.trim();
//     setInput("");
//     const newHistory = [...chatHistory, { role: "user", content: userMsg }];
//     setChatHistory(newHistory);
//     setLoading(true);
//     try {
//       const catContext = `Current category: "${activeCat?.label}". Items on list: ${catItems.map((i) => i.name).join(", ") || "none"}.`;
//       const raw = await callAI(
//         newHistory,
//         `You are a helpful shopping assistant for WIMC (What's In My Closet), a closet and lifestyle app. ${catContext}
// Help the user with shopping decisions, outfit planning, packing lists, or anything shopping-related. Be concise and practical.
// If asked to add items to the list, respond with JSON at the end like: ITEMS:[{"name":"x","detail":"y"}]`,
//       );
//       const itemMatch = raw.match(/ITEMS:(\[.*?\])/s);
//       let addedItems = [];
//       let displayText = raw;
//       if (itemMatch) {
//         try {
//           addedItems = JSON.parse(itemMatch[1]);
//           displayText = raw.replace(/ITEMS:\[.*?\]/s, "").trim();
//         } catch {}
//       }
//       setChatHistory([
//         ...newHistory,
//         { role: "assistant", content: displayText, addedItems },
//       ]);
//       if (addedItems.length > 0) {
//         onAddItems(
//           addedItems.map((it) => ({
//             id: uid(),
//             name: it.name,
//             detail: it.detail || "",
//             categoryId: activeCatId,
//             checked: false,
//             aiSuggested: true,
//             note: "",
//           })),
//         );
//       }
//     } catch {
//       setChatHistory([
//         ...newHistory,
//         {
//           role: "assistant",
//           content: "Sorry, I couldn't process that. Please try again.",
//         },
//       ]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const addSuggestedItems = (selected) => {
//     onAddItems(
//       selected.map((it) => ({
//         id: uid(),
//         name: it.name,
//         detail: it.detail || "",
//         categoryId: activeCatId,
//         checked: false,
//         aiSuggested: true,
//         note: "",
//       })),
//     );
//     setResult(null);
//   };

//   return (
//     <div className="sl-ai-panel">
//       <div className="sl-ai-panel__header">
//         <div className="sl-ai-panel__title">
//           <span className="sl-ai-panel__icon">✨</span>
//           AI Shopping Assistant
//         </div>
//         <button className="sl-ai-panel__close" onClick={onClose}>
//           ×
//         </button>
//       </div>

//       {/* Mode tabs */}
//       <div className="sl-ai-modes">
//         {[
//           {
//             id: "suggest",
//             label: "💡 Suggest",
//             title: "Get AI item suggestions",
//           },
//           { id: "chat", label: "💬 Chat", title: "Ask anything" },
//           { id: "budget", label: "💰 Budget", title: "Budget analysis" },
//           { id: "prioritize", label: "🎯 Prioritize", title: "Rank your list" },
//         ].map((m) => (
//           <button
//             key={m.id}
//             className={`sl-ai-mode ${mode === m.id ? "is-active" : ""}`}
//             onClick={() => {
//               setMode(m.id);
//               setResult(null);
//             }}
//             title={m.title}
//           >
//             {m.label}
//           </button>
//         ))}
//       </div>

//       <div className="sl-ai-panel__body">
//         {/* ── Suggest mode ── */}
//         {mode === "suggest" && (
//           <div className="sl-ai-section">
//             <p className="sl-ai-hint">
//               Get personalized suggestions for{" "}
//               <strong>
//                 {activeCat?.emoji} {activeCat?.label}
//               </strong>
//               .
//             </p>
//             <div className="sl-ai-row">
//               <input
//                 className="sl-ai-input"
//                 placeholder="Optional context: trip to Paris, back to school, winter closet…"
//                 value={input}
//                 onChange={(e) => setInput(e.target.value)}
//                 onKeyDown={(e) => e.key === "Enter" && handleSuggest()}
//               />
//               <button
//                 className="sl-btn sl-btn--ai"
//                 onClick={handleSuggest}
//                 disabled={loading}
//               >
//                 {loading ? <span className="sl-spinner" /> : "Generate"}
//               </button>
//             </div>

//             {result?.type === "suggest" && (
//               <SuggestResults items={result.items} onAdd={addSuggestedItems} />
//             )}
//           </div>
//         )}

//         {/* ── Chat mode ── */}
//         {mode === "chat" && (
//           <div className="sl-ai-chat">
//             <div className="sl-ai-chat__messages">
//               {chatHistory.length === 0 && (
//                 <div className="sl-ai-chat__empty">
//                   Ask me anything about your shopping list — what to buy, where
//                   to shop, how to prioritize, or just say "add a winter coat"
//                   and I'll add it to your list.
//                 </div>
//               )}
//               {chatHistory.map((msg, i) => (
//                 <div key={i} className={`sl-chat-msg sl-chat-msg--${msg.role}`}>
//                   {msg.role === "assistant" && (
//                     <span className="sl-chat-msg__avatar">✨</span>
//                   )}
//                   <div className="sl-chat-msg__bubble">{msg.content}</div>
//                   {msg.addedItems?.length > 0 && (
//                     <div className="sl-chat-msg__added">
//                       ✓ Added {msg.addedItems.length} item
//                       {msg.addedItems.length > 1 ? "s" : ""} to your list
//                     </div>
//                   )}
//                 </div>
//               ))}
//               {loading && (
//                 <div className="sl-chat-msg sl-chat-msg--assistant">
//                   <span className="sl-chat-msg__avatar">✨</span>
//                   <div className="sl-chat-msg__bubble sl-chat-msg__bubble--loading">
//                     <span className="sl-dot" />
//                     <span className="sl-dot" />
//                     <span className="sl-dot" />
//                   </div>
//                 </div>
//               )}
//               <div ref={chatEndRef} />
//             </div>
//             <div className="sl-ai-row">
//               <input
//                 className="sl-ai-input"
//                 placeholder="Ask anything or say 'add [item]'…"
//                 value={input}
//                 onChange={(e) => setInput(e.target.value)}
//                 onKeyDown={(e) => e.key === "Enter" && !loading && handleChat()}
//               />
//               <button
//                 className="sl-btn sl-btn--ai"
//                 onClick={handleChat}
//                 disabled={loading || !input.trim()}
//               >
//                 Send
//               </button>
//             </div>
//           </div>
//         )}

//         {/* ── Budget mode ── */}
//         {mode === "budget" && (
//           <div className="sl-ai-section">
//             <p className="sl-ai-hint">
//               Get budget tips for your{" "}
//               <strong>
//                 {activeCat?.emoji} {activeCat?.label}
//               </strong>{" "}
//               list ({catItems.length} items).
//             </p>
//             <div className="sl-ai-row">
//               <input
//                 className="sl-ai-input"
//                 placeholder="Optional: my budget is $200, looking for deals…"
//                 value={input}
//                 onChange={(e) => setInput(e.target.value)}
//                 onKeyDown={(e) => e.key === "Enter" && handleBudget()}
//               />
//               <button
//                 className="sl-btn sl-btn--ai"
//                 onClick={handleBudget}
//                 disabled={loading || catItems.length === 0}
//               >
//                 {loading ? <span className="sl-spinner" /> : "Analyze"}
//               </button>
//             </div>
//             {catItems.length === 0 && (
//               <p className="sl-ai-warn">Add some items to your list first.</p>
//             )}
//             {result?.type === "budget" && <BudgetResults data={result.data} />}
//           </div>
//         )}

//         {/* ── Prioritize mode ── */}
//         {mode === "prioritize" && (
//           <div className="sl-ai-section">
//             <p className="sl-ai-hint">
//               AI will rank your{" "}
//               <strong>
//                 {activeCat?.emoji} {activeCat?.label}
//               </strong>{" "}
//               items by importance.
//             </p>
//             <div className="sl-ai-row">
//               <input
//                 className="sl-ai-input"
//                 placeholder="Optional context: limited budget, going on vacation…"
//                 value={input}
//                 onChange={(e) => setInput(e.target.value)}
//                 onKeyDown={(e) => e.key === "Enter" && handlePrioritize()}
//               />
//               <button
//                 className="sl-btn sl-btn--ai"
//                 onClick={handlePrioritize}
//                 disabled={loading || catItems.length === 0}
//               >
//                 {loading ? <span className="sl-spinner" /> : "Prioritize"}
//               </button>
//             </div>
//             {catItems.length === 0 && (
//               <p className="sl-ai-warn">Add some items to your list first.</p>
//             )}
//             {result?.type === "prioritize" && (
//               <PrioritizeResults items={result.items} />
//             )}
//           </div>
//         )}

//         {result?.type === "error" && (
//           <p className="sl-ai-error">{result.message}</p>
//         )}
//       </div>
//     </div>
//   );
// }

// function SuggestResults({ items, onAdd }) {
//   const [selected, setSelected] = useState(new Set(items.map((_, i) => i)));

//   const toggle = (i) => {
//     setSelected((prev) => {
//       const next = new Set(prev);
//       next.has(i) ? next.delete(i) : next.add(i);
//       return next;
//     });
//   };

//   return (
//     <div className="sl-suggest">
//       <div className="sl-suggest__header">
//         <span className="sl-suggest__count">
//           {selected.size} of {items.length} selected
//         </span>
//         <div style={{ display: "flex", gap: 6 }}>
//           <button
//             className="sl-btn sl-btn--sm"
//             onClick={() => setSelected(new Set(items.map((_, i) => i)))}
//           >
//             All
//           </button>
//           <button
//             className="sl-btn sl-btn--sm"
//             onClick={() => setSelected(new Set())}
//           >
//             None
//           </button>
//         </div>
//       </div>
//       <div className="sl-suggest__list">
//         {items.map((it, i) => (
//           <button
//             key={i}
//             className={`sl-suggest__item ${selected.has(i) ? "is-selected" : ""}`}
//             onClick={() => toggle(i)}
//           >
//             <span className="sl-suggest__check">
//               {selected.has(i) ? "✓" : ""}
//             </span>
//             <div>
//               <div className="sl-suggest__name">{it.name}</div>
//               {it.detail && (
//                 <div className="sl-suggest__detail">{it.detail}</div>
//               )}
//             </div>
//           </button>
//         ))}
//       </div>
//       <button
//         className="sl-btn sl-btn--primary sl-btn--full"
//         disabled={selected.size === 0}
//         onClick={() => onAdd(Array.from(selected).map((i) => items[i]))}
//       >
//         Add {selected.size} Item{selected.size !== 1 ? "s" : ""} to List
//       </button>
//     </div>
//   );
// }

// function BudgetResults({ data }) {
//   return (
//     <div className="sl-budget">
//       {data.estimatedTotal && (
//         <div className="sl-budget__total">
//           Estimated total: <strong>{data.estimatedTotal}</strong>
//         </div>
//       )}
//       {data.savingsTip && (
//         <div className="sl-budget__tip">💡 {data.savingsTip}</div>
//       )}
//       {data.priority?.length > 0 && (
//         <div className="sl-budget__section">
//           <div className="sl-budget__label">🎯 Buy first</div>
//           {data.priority.map((item, i) => (
//             <div key={i} className="sl-budget__item sl-budget__item--high">
//               {item}
//             </div>
//           ))}
//         </div>
//       )}
//       {data.canSkip?.length > 0 && (
//         <div className="sl-budget__section">
//           <div className="sl-budget__label">⏭ Can skip for now</div>
//           {data.canSkip.map((item, i) => (
//             <div key={i} className="sl-budget__item sl-budget__item--low">
//               {item}
//             </div>
//           ))}
//         </div>
//       )}
//       {data.tips?.length > 0 && (
//         <div className="sl-budget__section">
//           <div className="sl-budget__label">📋 Tips</div>
//           {data.tips.map((tip, i) => (
//             <div key={i} className="sl-budget__item">
//               • {tip}
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

// function PrioritizeResults({ items }) {
//   const colors = { high: "#dcfce7", medium: "#fef9c3", low: "#fee2e2" };
//   const labels = { high: "🔴 High", medium: "🟡 Medium", low: "🟢 Low" };
//   return (
//     <div className="sl-prioritize">
//       {items.map((it, i) => (
//         <div
//           key={i}
//           className="sl-prioritize__item"
//           style={{ background: colors[it.priority] || "#f8fafc" }}
//         >
//           <div className="sl-prioritize__rank">#{i + 1}</div>
//           <div className="sl-prioritize__body">
//             <div className="sl-prioritize__name">{it.name}</div>
//             <div className="sl-prioritize__reason">{it.reason}</div>
//           </div>
//           <div className="sl-prioritize__badge">
//             {labels[it.priority] || it.priority}
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// }

// ── Main component ────────────────────────────────────────────────────────────
// export default function ShoppingList() {
//   const [collapsed, setCollapsed] = useState(true);
//   const [isOpen, setIsOpen] = useState(false);
//   const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
//   const [activeCatId, setActiveCatId] = useState(DEFAULT_CATEGORIES[0].id);
//   const [items, setItems] = useState([]);
//   const [newItemName, setNewItemName] = useState("");
//   const [newItemDetail, setNewItemDetail] = useState("");
//   const [showAddCat, setShowAddCat] = useState(false);
//   const [showAI, setShowAI] = useState(false);
//   const [filter, setFilter] = useState("all"); // all | active | checked
//   const [search, setSearch] = useState("");
//   const [shareMsg, setShareMsg] = useState("");
//   const [sharing, setSharing] = useState(false);
//   const [importUrl, setImportUrl] = useState("");
//   const [importError, setImportError] = useState("");
//   const [loadingImport, setLoadingImport] = useState(false);
//   const [showImport, setShowImport] = useState(false);
//   const inputRef = useRef(null);
//   const hydratedRef = useRef(false);

//   // ── Hydrate ──
//   useEffect(() => {
//     if (hydratedRef.current) return;
//     hydratedRef.current = true;
//     try {
//       const saved = JSON.parse(localStorage.getItem(LS_KEY) || "null");
//       if (saved) {
//         if (saved.categories) setCategories(saved.categories);
//         if (saved.items) setItems(saved.items);
//         if (saved.activeCatId) setActiveCatId(saved.activeCatId);
//       }
//     } catch {}
//   }, []);

//   // ── Persist ──
//   useEffect(() => {
//     if (!hydratedRef.current) return;
//     try {
//       syncSetItem(
//         LS_KEY,
//         JSON.stringify({ categories, items, activeCatId }),
//       );
//     } catch {}
//   }, [categories, items, activeCatId]);

//   const activeCat =
//     categories.find((c) => c.id === activeCatId) || categories[0];
//   const catItems = items.filter((i) => i.categoryId === activeCatId);
//   const checkedCount = catItems.filter((i) => i.checked).length;
//   const totalCount = items.filter((i) => !i.checked).length;

//   const filteredItems = catItems.filter((item) => {
//     const matchFilter =
//       filter === "all"
//         ? true
//         : filter === "active"
//           ? !item.checked
//           : filter === "checked"
//             ? item.checked
//             : true;
//     const matchSearch =
//       !search || item.name.toLowerCase().includes(search.toLowerCase());
//     return matchFilter && matchSearch;
//   });

//   const addItem = () => {
//     const name = newItemName.trim();
//     if (!name) return;
//     setItems((prev) => [
//       ...prev,
//       {
//         id: uid(),
//         name,
//         detail: newItemDetail.trim(),
//         categoryId: activeCatId,
//         checked: false,
//         aiSuggested: false,
//         note: "",
//       },
//     ]);
//     setNewItemName("");
//     setNewItemDetail("");
//     inputRef.current?.focus();
//   };

//   const toggleItem = (id) =>
//     setItems((prev) =>
//       prev.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)),
//     );
//   const deleteItem = (id) =>
//     setItems((prev) => prev.filter((i) => i.id !== id));
//   const editNote = (id, note) =>
//     setItems((prev) => prev.map((i) => (i.id === id ? { ...i, note } : i)));
//   const clearChecked = () =>
//     setItems((prev) =>
//       prev.filter((i) => !(i.categoryId === activeCatId && i.checked)),
//     );

//   const addCategory = (cat) => {
//     setCategories((prev) => [...prev, cat]);
//     setActiveCatId(cat.id);
//   };

//   const deleteCategory = (id) => {
//     if (categories.length <= 1) return;
//     setCategories((prev) => prev.filter((c) => c.id !== id));
//     setItems((prev) => prev.filter((i) => i.categoryId !== id));
//     if (activeCatId === id)
//       setActiveCatId(categories.find((c) => c.id !== id)?.id);
//   };

//   const addAIItems = useCallback((newItems) => {
//     setItems((prev) => [...prev, ...newItems]);
//   }, []);

//   const buildPayload = () => ({
//     kind: "wimc.shoppingList",
//     version: 1,
//     createdAt: new Date().toISOString(),
//     categories,
//     items: items.map((i) => ({ ...i })),
//     meta: { source: "WIMC Shopping List" },
//   });

//   const shareList = async () => {
//     setSharing(true);
//     setShareMsg("");
//     try {
//       const res = await uploadRawJSON(buildPayload(), "wimc/shopping-lists");
//       const url =
//         res?.secure_url || res?.url || res?.data?.secure_url || res?.data?.url;
//       if (url) {
//         await navigator.clipboard.writeText(url);
//         setShareMsg("🔗 Link copied!");
//       } else {
//         // fallback: blob URL
//         const blob = new Blob([JSON.stringify(buildPayload(), null, 2)], {
//           type: "application/json",
//         });
//         const local = URL.createObjectURL(blob);
//         await navigator.clipboard.writeText(local);
//         setShareMsg("⚠️ Temp link copied (keep tab open)");
//       }
//     } catch {
//       setShareMsg("❌ Share failed");
//     } finally {
//       setSharing(false);
//       setTimeout(() => setShareMsg(""), 3000);
//     }
//   };

//   const downloadList = () => {
//     const blob = new Blob([JSON.stringify(buildPayload(), null, 2)], {
//       type: "application/json",
//     });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = `wimc-shopping-list-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
//     document.body.appendChild(a);
//     a.click();
//     document.body.removeChild(a);
//     URL.revokeObjectURL(url);
//   };

//   const copyAsText = () => {
//     const text = categories
//       .map((cat) => {
//         const catItems = items.filter((i) => i.categoryId === cat.id);
//         if (!catItems.length) return null;
//         const lines = catItems.map(
//           (i) =>
//             `  ${i.checked ? "✓" : "○"} ${i.name}${i.detail ? ` (${i.detail})` : ""}${i.note ? ` — ${i.note}` : ""}`,
//         );
//         return `${cat.emoji} ${cat.label}\n${lines.join("\n")}`;
//       })
//       .filter(Boolean)
//       .join("\n\n");
//     navigator.clipboard.writeText(text).then(() => {
//       setShareMsg("📋 Text copied!");
//       setTimeout(() => setShareMsg(""), 2000);
//     });
//   };

//   const importFromUrl = async () => {
//     if (!importUrl.trim()) return;
//     setLoadingImport(true);
//     setImportError("");
//     try {
//       const res = await fetch(importUrl.trim());
//       if (!res.ok) throw new Error(`HTTP ${res.status}`);
//       const data = await res.json();
//       if (data.kind !== "wimc.shoppingList")
//         throw new Error("Not a shopping list file.");
//       // Merge categories (avoid duplicates by id)
//       if (Array.isArray(data.categories)) {
//         setCategories((prev) => {
//           const existingIds = new Set(prev.map((c) => c.id));
//           const newCats = data.categories.filter((c) => !existingIds.has(c.id));
//           return [...prev, ...newCats];
//         });
//       }
//       // Merge items (avoid duplicates by id)
//       if (Array.isArray(data.items)) {
//         setItems((prev) => {
//           const existingIds = new Set(prev.map((i) => i.id));
//           const newItems = data.items.filter((i) => !existingIds.has(i.id));
//           return [...prev, ...newItems];
//         });
//       }
//       setImportUrl("");
//       setShowImport(false);
//       setShareMsg("✅ List imported!");
//       setTimeout(() => setShareMsg(""), 2500);
//     } catch (e) {
//       setImportError(e.message || "Could not load that link.");
//     } finally {
//       setLoadingImport(false);
//     }
//   };

//   if (!isOpen) {
//     return (
//       <section className={`sl-stub ${collapsed ? "is-collapsed" : ""}`}>
//         <header
//           className="sl-stub__header"
//           onClick={() => setCollapsed((v) => !v)}
//         >
//           <div className="sl-stub__left">
//             <span className="sl-stub__icon">🛒</span>
//             <h3 className="sl-stub__title">Shopping List</h3>
//             {totalCount > 0 && (
//               <span className="sl-stub__count">{totalCount}</span>
//             )}
//           </div>
//           <div className="sl-stub__right" onClick={(e) => e.stopPropagation()}>
//             <button className="sl-stub__open" onClick={() => setIsOpen(true)}>
//               Open
//             </button>
//             <span className="sl-stub__caret">{collapsed ? "▸" : "▾"}</span>
//           </div>
//         </header>
//         {!collapsed && (
//           <div className="sl-stub__body">
//             {categories.map((cat) => {
//               const n = items.filter(
//                 (i) => i.categoryId === cat.id && !i.checked,
//               ).length;
//               return n > 0 ? (
//                 <div key={cat.id} className="sl-stub__cat">
//                   <span>
//                     {cat.emoji} {cat.label}
//                   </span>
//                   <span className="sl-stub__n">{n}</span>
//                 </div>
//               ) : null;
//             })}
//             {totalCount === 0 && (
//               <p className="sl-stub__empty">Nothing on your list yet.</p>
//             )}
//             <button
//               className="sl-stub__open-full"
//               onClick={() => setIsOpen(true)}
//             >
//               Open Shopping List →
//             </button>
//           </div>
//         )}
//       </section>
//     );
//   }

//   return (
//     <>
//       <div className="sl-backdrop" onClick={() => setIsOpen(false)} />
//       <aside
//         className="sl-modal"
//         role="dialog"
//         aria-modal="true"
//         aria-label="Shopping List"
//       >
//         {/* Header */}
//         <header className="sl-header">
//           <div className="sl-header__left">
//             <span className="sl-header__icon">🛒</span>
//             <div>
//               <h2 className="sl-header__title">Shopping List</h2>
//               <p className="sl-header__sub">
//                 {totalCount} item{totalCount !== 1 ? "s" : ""} to buy
//               </p>
//             </div>
//           </div>
//           <div className="sl-header__actions">
//             <button
//               className={`sl-btn sl-btn--ai-toggle ${showAI ? "is-active" : ""}`}
//               onClick={() => setShowAI((v) => !v)}
//               title="AI Shopping Assistant"
//             >
//               ✨ AI
//             </button>
//             <button
//               className="sl-btn sl-btn--share"
//               onClick={shareList}
//               disabled={sharing}
//               title="Share list — uploads and copies link to clipboard"
//             >
//               {sharing ? <span className="sl-spinner" /> : "🔗 Share"}
//             </button>
//             <button
//               className="sl-btn"
//               onClick={downloadList}
//               title="Download as JSON file"
//             >
//               ⬇️ JSON
//             </button>
//             <button
//               className="sl-btn"
//               onClick={copyAsText}
//               title="Copy list as plain text"
//             >
//               📋 Copy
//             </button>
//             <button
//               className={`sl-btn ${showImport ? "is-active" : ""}`}
//               onClick={() => setShowImport((v) => !v)}
//               title="Import a shared list from a link"
//             >
//               📥 Import
//             </button>
//             {shareMsg && <span className="sl-share-msg">{shareMsg}</span>}
//             <button className="sl-close" onClick={() => setIsOpen(false)}>
//               ×
//             </button>
//           </div>
//         </header>

//         {showImport && (
//           <div className="sl-import-bar">
//             <span className="sl-import-bar__label">📥 Import from link:</span>
//             <input
//               className="sl-import-bar__input"
//               type="url"
//               placeholder="Paste a shared shopping list URL…"
//               value={importUrl}
//               onChange={(e) => setImportUrl(e.target.value)}
//               onKeyDown={(e) => e.key === "Enter" && importFromUrl()}
//             />
//             <button
//               className="sl-btn sl-btn--primary"
//               onClick={importFromUrl}
//               disabled={loadingImport || !importUrl.trim()}
//             >
//               {loadingImport ? <span className="sl-spinner" /> : "Load"}
//             </button>
//             <button
//               className="sl-btn"
//               onClick={() => {
//                 setShowImport(false);
//                 setImportError("");
//               }}
//             >
//               Cancel
//             </button>
//             {importError && (
//               <span className="sl-import-bar__error">{importError}</span>
//             )}
//           </div>
//         )}
//         <div className="sl-layout">
//           {/* Left: categories + AI panel */}
//           <nav className="sl-sidebar">
//             <div className="sl-sidebar__cats">
//               {categories.map((cat) => (
//                 <div key={cat.id} className="sl-tab-wrap">
//                   <CategoryTab
//                     cat={cat}
//                     active={activeCatId === cat.id}
//                     count={
//                       items.filter((i) => i.categoryId === cat.id && !i.checked)
//                         .length
//                     }
//                     onClick={() => setActiveCatId(cat.id)}
//                   />
//                   {categories.length > 1 && activeCatId === cat.id && (
//                     <button
//                       className="sl-tab-delete"
//                       onClick={() => deleteCategory(cat.id)}
//                       title="Delete category"
//                     >
//                       ×
//                     </button>
//                   )}
//                 </div>
//               ))}
//               <button
//                 className="sl-add-cat-btn"
//                 onClick={() => setShowAddCat(true)}
//               >
//                 + Add Category
//               </button>
//             </div>

//             {showAI && (
//               <AIPanel
//                 categories={categories}
//                 items={items}
//                 activeCatId={activeCatId}
//                 onAddItems={addAIItems}
//                 onClose={() => setShowAI(false)}
//               />
//             )}
//           </nav>

//           {/* Right: list */}
//           <div className="sl-main">
//             {/* Category header */}
//             <div
//               className="sl-main__head"
//               style={{ "--cat-color": activeCat?.color }}
//             >
//               <span className="sl-main__emoji">{activeCat?.emoji}</span>
//               <h3 className="sl-main__cat-name">{activeCat?.label}</h3>
//               <span className="sl-main__progress">
//                 {checkedCount}/{catItems.length} done
//               </span>
//             </div>

//             {/* Add item row */}
//             <div className="sl-add-row">
//               <input
//                 ref={inputRef}
//                 className="sl-add-input"
//                 placeholder="Add item…"
//                 value={newItemName}
//                 onChange={(e) => setNewItemName(e.target.value)}
//                 onKeyDown={(e) => e.key === "Enter" && addItem()}
//               />
//               <input
//                 className="sl-add-input sl-add-input--detail"
//                 placeholder="Size / color / brand (optional)"
//                 value={newItemDetail}
//                 onChange={(e) => setNewItemDetail(e.target.value)}
//                 onKeyDown={(e) => e.key === "Enter" && addItem()}
//               />
//               <button
//                 className="sl-btn sl-btn--primary"
//                 onClick={addItem}
//                 disabled={!newItemName.trim()}
//               >
//                 Add
//               </button>
//             </div>

//             {/* Filters + search */}
//             <div className="sl-filters">
//               <div className="sl-filter-btns">
//                 {["all", "active", "checked"].map((f) => (
//                   <button
//                     key={f}
//                     className={`sl-filter-btn ${filter === f ? "is-active" : ""}`}
//                     onClick={() => setFilter(f)}
//                   >
//                     {f.charAt(0).toUpperCase() + f.slice(1)}
//                   </button>
//                 ))}
//               </div>
//               <input
//                 className="sl-search"
//                 placeholder="🔍 Search…"
//                 value={search}
//                 onChange={(e) => setSearch(e.target.value)}
//               />
//               {checkedCount > 0 && (
//                 <button
//                   className="sl-btn sl-btn--sm sl-btn--danger"
//                   onClick={clearChecked}
//                 >
//                   Clear done ({checkedCount})
//                 </button>
//               )}
//             </div>

//             {/* Progress bar */}
//             {catItems.length > 0 && (
//               <div className="sl-progress">
//                 <div
//                   className="sl-progress__bar"
//                   style={{
//                     width: `${(checkedCount / catItems.length) * 100}%`,
//                     background: activeCat?.color,
//                   }}
//                 />
//               </div>
//             )}

//             {/* Items */}
//             <div className="sl-items">
//               {filteredItems.length === 0 ? (
//                 <div className="sl-empty">
//                   {catItems.length === 0 ? (
//                     <>
//                       <p>Nothing here yet.</p>
//                       <p>Add items above or use ✨ AI to get suggestions!</p>
//                     </>
//                   ) : (
//                     <p>No items match your filter.</p>
//                   )}
//                 </div>
//               ) : (
//                 filteredItems.map((item) => (
//                   <ShoppingItem
//                     key={item.id}
//                     item={item}
//                     onToggle={toggleItem}
//                     onDelete={deleteItem}
//                     onEditNote={editNote}
//                   />
//                 ))
//               )}
//             </div>
//           </div>
//         </div>
//       </aside>

//       {showAddCat && (
//         <AddCategoryModal
//           onAdd={addCategory}
//           onClose={() => setShowAddCat(false)}
//         />
//       )}
//     </>
//   );
// }

// import React, { useState, useEffect, useRef, useCallback } from "react";
// import "./ShoppingList.css";

// // ── Default categories ────────────────────────────────────────────────────────
// const DEFAULT_CATEGORIES = [
//   {
//     id: "clothing",
//     label: "Clothing & Accessories",
//     emoji: "👗",
//     color: "#7c3aed",
//   },
//   { id: "travel", label: "Travel Items", emoji: "✈️", color: "#0369a1" },
//   { id: "kids", label: "Kids Items", emoji: "🧸", color: "#d97706" },
// ];

// const LS_KEY = "wimc_shopping_list_v1";

// function uid() {
//   return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
// }

// // ── AI call via Anthropic API ─────────────────────────────────────────────────
// async function callAI(messages, systemPrompt) {
//   const res = await fetch(process.env.REACT_APP_ANTHROPIC_PROXY_URL, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({
//       model: "claude-sonnet-4-20250514",
//       max_tokens: 1000,
//       system: systemPrompt,
//       messages,
//     }),
//   });
//   const data = await res.json();
//   return data.content?.find((b) => b.type === "text")?.text || "";
// }

// // ── Sub-components ────────────────────────────────────────────────────────────

// function CategoryTab({ cat, active, count, onClick }) {
//   return (
//     <button
//       className={`sl-tab ${active ? "sl-tab--active" : ""}`}
//       style={{ "--tab-color": cat.color }}
//       onClick={onClick}
//     >
//       <span className="sl-tab__emoji">{cat.emoji}</span>
//       <span className="sl-tab__label">{cat.label}</span>
//       {count > 0 && <span className="sl-tab__badge">{count}</span>}
//     </button>
//   );
// }

// function ShoppingItem({ item, onToggle, onDelete, onEditNote }) {
//   const [editingNote, setEditingNote] = useState(false);
//   const [note, setNote] = useState(item.note || "");

//   const saveNote = () => {
//     onEditNote(item.id, note);
//     setEditingNote(false);
//   };

//   return (
//     <div className={`sl-item ${item.checked ? "sl-item--checked" : ""}`}>
//       <button
//         className="sl-item__check"
//         onClick={() => onToggle(item.id)}
//         aria-label={item.checked ? "Uncheck" : "Check"}
//       >
//         {item.checked ? "✓" : ""}
//       </button>
//       <div className="sl-item__body">
//         <span className="sl-item__name">{item.name}</span>
//         {item.detail && <span className="sl-item__detail">{item.detail}</span>}
//         {editingNote ? (
//           <div className="sl-item__note-edit">
//             <input
//               className="sl-item__note-input"
//               value={note}
//               onChange={(e) => setNote(e.target.value)}
//               onKeyDown={(e) => e.key === "Enter" && saveNote()}
//               autoFocus
//               placeholder="Add a note…"
//             />
//             <button className="sl-item__note-save" onClick={saveNote}>
//               ✓
//             </button>
//           </div>
//         ) : (
//           <span
//             className="sl-item__note"
//             onClick={() => setEditingNote(true)}
//             title="Click to add/edit note"
//           >
//             {item.note || <span className="sl-item__note--empty">+ note</span>}
//           </span>
//         )}
//         {item.aiSuggested && <span className="sl-item__ai-tag">✨ AI</span>}
//       </div>
//       <button
//         className="sl-item__delete"
//         onClick={() => onDelete(item.id)}
//         aria-label="Delete"
//       >
//         ×
//       </button>
//     </div>
//   );
// }

// // ── Add Category Modal ────────────────────────────────────────────────────────
// const PRESET_COLORS = [
//   "#7c3aed",
//   "#0369a1",
//   "#d97706",
//   "#059669",
//   "#dc2626",
//   "#db2777",
//   "#0891b2",
//   "#65a30d",
//   "#9333ea",
//   "#ea580c",
// ];
// const PRESET_EMOJIS = [
//   "🛒",
//   "🏠",
//   "💊",
//   "📚",
//   "🎁",
//   "🍎",
//   "🧴",
//   "🐾",
//   "🎮",
//   "💼",
// ];

// function AddCategoryModal({ onAdd, onClose }) {
//   const [label, setLabel] = useState("");
//   const [emoji, setEmoji] = useState("🛒");
//   const [color, setColor] = useState("#059669");
//   const [custom, setCustom] = useState("");

//   const handleAdd = () => {
//     const name = label.trim();
//     if (!name) return;
//     onAdd({ id: uid(), label: name, emoji: custom || emoji, color });
//     onClose();
//   };

//   return (
//     <div className="sl-cat-modal__overlay" onClick={onClose}>
//       <div className="sl-cat-modal" onClick={(e) => e.stopPropagation()}>
//         <h4 className="sl-cat-modal__title">New Category</h4>
//         <label className="sl-cat-modal__label">Name</label>
//         <input
//           className="sl-cat-modal__input"
//           placeholder="e.g. Groceries"
//           value={label}
//           onChange={(e) => setLabel(e.target.value)}
//           autoFocus
//         />
//         <label className="sl-cat-modal__label">Emoji</label>
//         <div className="sl-cat-modal__emojis">
//           {PRESET_EMOJIS.map((e) => (
//             <button
//               key={e}
//               className={`sl-cat-modal__emoji ${emoji === e && !custom ? "is-active" : ""}`}
//               onClick={() => {
//                 setEmoji(e);
//                 setCustom("");
//               }}
//             >
//               {e}
//             </button>
//           ))}
//         </div>
//         <input
//           className="sl-cat-modal__input"
//           placeholder="Or type any emoji…"
//           value={custom}
//           onChange={(e) => setCustom(e.target.value)}
//           maxLength={4}
//         />
//         <label className="sl-cat-modal__label">Color</label>
//         <div className="sl-cat-modal__colors">
//           {PRESET_COLORS.map((c) => (
//             <button
//               key={c}
//               className={`sl-cat-modal__color ${color === c ? "is-active" : ""}`}
//               style={{ background: c }}
//               onClick={() => setColor(c)}
//             />
//           ))}
//         </div>
//         <div className="sl-cat-modal__footer">
//           <button className="sl-btn" onClick={onClose}>
//             Cancel
//           </button>
//           <button
//             className="sl-btn sl-btn--primary"
//             onClick={handleAdd}
//             disabled={!label.trim()}
//           >
//             Add Category
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ── AI Panel ──────────────────────────────────────────────────────────────────
// function AIPanel({ categories, items, activeCatId, onAddItems, onClose }) {
//   const [mode, setMode] = useState("suggest"); // suggest | chat | budget | prioritize
//   const [input, setInput] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [result, setResult] = useState(null);
//   const [chatHistory, setChatHistory] = useState([]);
//   const chatEndRef = useRef(null);

//   const activeCat = categories.find((c) => c.id === activeCatId);
//   const catItems = items.filter(
//     (i) => i.categoryId === activeCatId && !i.checked,
//   );

//   useEffect(() => {
//     chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [chatHistory]);

//   // ── Suggest items ──
//   const handleSuggest = async () => {
//     setLoading(true);
//     setResult(null);
//     try {
//       const existing = catItems.map((i) => i.name).join(", ") || "none yet";
//       const raw = await callAI(
//         [
//           {
//             role: "user",
//             content: `Category: "${activeCat?.label}". Context: "${input || "general shopping"}". Already have: ${existing}. Suggest 8-12 shopping items.`,
//           },
//         ],
//         `You are a smart shopping assistant for a closet/lifestyle app called WIMC (What's In My Closet).
// Return ONLY a JSON array like: [{"name":"Item","detail":"optional size/color/brand hint"}]
// No markdown, no explanation, just the JSON array.`,
//       );
//       const parsed = JSON.parse(raw.trim());
//       setResult({ type: "suggest", items: parsed });
//     } catch {
//       setResult({
//         type: "error",
//         message: "Couldn't generate suggestions. Please try again.",
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ── Budget analysis ──
//   const handleBudget = async () => {
//     setLoading(true);
//     setResult(null);
//     try {
//       const list = catItems.map((i) => i.name).join(", ") || "empty list";
//       const raw = await callAI(
//         [
//           {
//             role: "user",
//             content: `Shopping list for "${activeCat?.label}": ${list}. Budget context: "${input || "general budget advice"}".${genderContext}`,
//           },
//         ],
//         `You are a budget-conscious shopping advisor for WIMC app.
// Analyze the shopping list and return ONLY a JSON object like:
// {"tips": ["tip1","tip2","tip3"], "priority": ["item1","item2"], "canSkip": ["item3"], "estimatedTotal": "$X-$Y", "savingsTip": "one key tip"}
// No markdown, no explanation, just the JSON.`,
//       );
//       const parsed = JSON.parse(raw.trim());
//       setResult({ type: "budget", data: parsed });
//     } catch {
//       setResult({
//         type: "error",
//         message: "Couldn't analyze budget. Please try again.",
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ── Prioritize ──
//   const handlePrioritize = async () => {
//     setLoading(true);
//     setResult(null);
//     try {
//       const list = catItems.map((i) => i.name).join(", ") || "empty list";
//       const raw = await callAI(
//         [
//           {
//             role: "user",
//             content: `Prioritize this shopping list for "${activeCat?.label}": ${list}. Context: "${input || "everyday use"}"${genderContext}`,
//           },
//         ],
//         `You are a smart shopping assistant for WIMC app.
// Prioritize the list and return ONLY a JSON array of objects sorted by priority:
// [{"name":"item","priority":"high|medium|low","reason":"brief reason"}]
// No markdown, no explanation, just the JSON array.`,
//       );
//       const parsed = JSON.parse(raw.trim());
//       setResult({ type: "prioritize", items: parsed });
//     } catch {
//       setResult({
//         type: "error",
//         message: "Couldn't prioritize. Please try again.",
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ── Chat ──
//   const handleChat = async () => {
//     if (!input.trim()) return;
//     const userMsg = input.trim();
//     setInput("");
//     const newHistory = [...chatHistory, { role: "user", content: userMsg }];
//     setChatHistory(newHistory);
//     setLoading(true);
//     try {
//       const catContext = `Current category: "${activeCat?.label}". Items on list: ${catItems.map((i) => i.name).join(", ") || "none"}.`;
//       const raw = await callAI(
//         newHistory,
//         `You are a helpful shopping assistant for WIMC (What's In My Closet), a closet and lifestyle app. ${catContext}
// Help the user with shopping decisions, outfit planning, packing lists, or anything shopping-related. Be concise and practical.
// If asked to add items to the list, respond with JSON at the end like: ITEMS:[{"name":"x","detail":"y"}]`,
//       );
//       const itemMatch = raw.match(/ITEMS:(\[.*?\])/s);
//       let addedItems = [];
//       let displayText = raw;
//       if (itemMatch) {
//         try {
//           addedItems = JSON.parse(itemMatch[1]);
//           displayText = raw.replace(/ITEMS:\[.*?\]/s, "").trim();
//         } catch {}
//       }
//       setChatHistory([
//         ...newHistory,
//         { role: "assistant", content: displayText, addedItems },
//       ]);
//       if (addedItems.length > 0) {
//         onAddItems(
//           addedItems.map((it) => ({
//             id: uid(),
//             name: it.name,
//             detail: it.detail || "",
//             categoryId: activeCatId,
//             checked: false,
//             aiSuggested: true,
//             note: "",
//           })),
//         );
//       }
//     } catch {
//       setChatHistory([
//         ...newHistory,
//         {
//           role: "assistant",
//           content: "Sorry, I couldn't process that. Please try again.",
//         },
//       ]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const addSuggestedItems = (selected) => {
//     onAddItems(
//       selected.map((it) => ({
//         id: uid(),
//         name: it.name,
//         detail: it.detail || "",
//         categoryId: activeCatId,
//         checked: false,
//         aiSuggested: true,
//         note: "",
//       })),
//     );
//     setResult(null);
//   };

//   return (
//     <div className="sl-ai-panel">
//       <div className="sl-ai-panel__header">
//         <div className="sl-ai-panel__title">
//           <span className="sl-ai-panel__icon">✨</span>
//           AI Shopping Assistant
//         </div>
//         <button className="sl-ai-panel__close" onClick={onClose}>
//           ×
//         </button>
//       </div>

//       {/* Mode tabs */}
//       <div className="sl-ai-modes">
//         {[
//           {
//             id: "suggest",
//             label: "💡 Suggest",
//             title: "Get AI item suggestions",
//           },
//           { id: "chat", label: "💬 Chat", title: "Ask anything" },
//           { id: "budget", label: "💰 Budget", title: "Budget analysis" },
//           { id: "prioritize", label: "🎯 Prioritize", title: "Rank your list" },
//         ].map((m) => (
//           <button
//             key={m.id}
//             className={`sl-ai-mode ${mode === m.id ? "is-active" : ""}`}
//             onClick={() => {
//               setMode(m.id);
//               setResult(null);
//             }}
//             title={m.title}
//           >
//             {m.label}
//           </button>
//         ))}
//       </div>

//       <div className="sl-ai-panel__body">
//         {/* ── Suggest mode ── */}
//         {mode === "suggest" && (
//           <div className="sl-ai-section">
//             <p className="sl-ai-hint">
//               Get personalized suggestions for{" "}
//               <strong>
//                 {activeCat?.emoji} {activeCat?.label}
//               </strong>
//               .
//             </p>
//             <div className="sl-ai-row">
//               <input
//                 className="sl-ai-input"
//                 placeholder="Optional context: trip to Paris, back to school, winter closet…"
//                 value={input}
//                 onChange={(e) => setInput(e.target.value)}
//                 onKeyDown={(e) => e.key === "Enter" && handleSuggest()}
//               />
//               <button
//                 className="sl-btn sl-btn--ai"
//                 onClick={handleSuggest}
//                 disabled={loading}
//               >
//                 {loading ? <span className="sl-spinner" /> : "Generate"}
//               </button>
//             </div>

//             {result?.type === "suggest" && (
//               <SuggestResults items={result.items} onAdd={addSuggestedItems} />
//             )}
//           </div>
//         )}

//         {/* ── Chat mode ── */}
//         {mode === "chat" && (
//           <div className="sl-ai-chat">
//             <div className="sl-ai-chat__messages">
//               {chatHistory.length === 0 && (
//                 <div className="sl-ai-chat__empty">
//                   Ask me anything about your shopping list — what to buy, where
//                   to shop, how to prioritize, or just say "add a winter coat"
//                   and I'll add it to your list.
//                 </div>
//               )}
//               {chatHistory.map((msg, i) => (
//                 <div key={i} className={`sl-chat-msg sl-chat-msg--${msg.role}`}>
//                   {msg.role === "assistant" && (
//                     <span className="sl-chat-msg__avatar">✨</span>
//                   )}
//                   <div className="sl-chat-msg__bubble">{msg.content}</div>
//                   {msg.addedItems?.length > 0 && (
//                     <div className="sl-chat-msg__added">
//                       ✓ Added {msg.addedItems.length} item
//                       {msg.addedItems.length > 1 ? "s" : ""} to your list
//                     </div>
//                   )}
//                 </div>
//               ))}
//               {loading && (
//                 <div className="sl-chat-msg sl-chat-msg--assistant">
//                   <span className="sl-chat-msg__avatar">✨</span>
//                   <div className="sl-chat-msg__bubble sl-chat-msg__bubble--loading">
//                     <span className="sl-dot" />
//                     <span className="sl-dot" />
//                     <span className="sl-dot" />
//                   </div>
//                 </div>
//               )}
//               <div ref={chatEndRef} />
//             </div>
//             <div className="sl-ai-row">
//               <input
//                 className="sl-ai-input"
//                 placeholder="Ask anything or say 'add [item]'…"
//                 value={input}
//                 onChange={(e) => setInput(e.target.value)}
//                 onKeyDown={(e) => e.key === "Enter" && !loading && handleChat()}
//               />
//               <button
//                 className="sl-btn sl-btn--ai"
//                 onClick={handleChat}
//                 disabled={loading || !input.trim()}
//               >
//                 Send
//               </button>
//             </div>
//           </div>
//         )}

//         {/* ── Budget mode ── */}
//         {mode === "budget" && (
//           <div className="sl-ai-section">
//             <p className="sl-ai-hint">
//               Get budget tips for your{" "}
//               <strong>
//                 {activeCat?.emoji} {activeCat?.label}
//               </strong>{" "}
//               list ({catItems.length} items).
//             </p>
//             <div className="sl-ai-row">
//               <input
//                 className="sl-ai-input"
//                 placeholder="Optional: my budget is $200, looking for deals…"
//                 value={input}
//                 onChange={(e) => setInput(e.target.value)}
//                 onKeyDown={(e) => e.key === "Enter" && handleBudget()}
//               />
//               <button
//                 className="sl-btn sl-btn--ai"
//                 onClick={handleBudget}
//                 disabled={loading || catItems.length === 0}
//               >
//                 {loading ? <span className="sl-spinner" /> : "Analyze"}
//               </button>
//             </div>
//             {catItems.length === 0 && (
//               <p className="sl-ai-warn">Add some items to your list first.</p>
//             )}
//             {result?.type === "budget" && <BudgetResults data={result.data} />}
//           </div>
//         )}

//         {/* ── Prioritize mode ── */}
//         {mode === "prioritize" && (
//           <div className="sl-ai-section">
//             <p className="sl-ai-hint">
//               AI will rank your{" "}
//               <strong>
//                 {activeCat?.emoji} {activeCat?.label}
//               </strong>{" "}
//               items by importance.
//             </p>
//             <div className="sl-ai-row">
//               <input
//                 className="sl-ai-input"
//                 placeholder="Optional context: limited budget, going on vacation…"
//                 value={input}
//                 onChange={(e) => setInput(e.target.value)}
//                 onKeyDown={(e) => e.key === "Enter" && handlePrioritize()}
//               />
//               <button
//                 className="sl-btn sl-btn--ai"
//                 onClick={handlePrioritize}
//                 disabled={loading || catItems.length === 0}
//               >
//                 {loading ? <span className="sl-spinner" /> : "Prioritize"}
//               </button>
//             </div>
//             {catItems.length === 0 && (
//               <p className="sl-ai-warn">Add some items to your list first.</p>
//             )}
//             {result?.type === "prioritize" && (
//               <PrioritizeResults items={result.items} />
//             )}
//           </div>
//         )}

//         {result?.type === "error" && (
//           <p className="sl-ai-error">{result.message}</p>
//         )}
//       </div>
//     </div>
//   );
// }

// function SuggestResults({ items, onAdd }) {
//   const [selected, setSelected] = useState(new Set(items.map((_, i) => i)));

//   const toggle = (i) => {
//     setSelected((prev) => {
//       const next = new Set(prev);
//       next.has(i) ? next.delete(i) : next.add(i);
//       return next;
//     });
//   };

//   return (
//     <div className="sl-suggest">
//       <div className="sl-suggest__header">
//         <span className="sl-suggest__count">
//           {selected.size} of {items.length} selected
//         </span>
//         <div style={{ display: "flex", gap: 6 }}>
//           <button
//             className="sl-btn sl-btn--sm"
//             onClick={() => setSelected(new Set(items.map((_, i) => i)))}
//           >
//             All
//           </button>
//           <button
//             className="sl-btn sl-btn--sm"
//             onClick={() => setSelected(new Set())}
//           >
//             None
//           </button>
//         </div>
//       </div>
//       <div className="sl-suggest__list">
//         {items.map((it, i) => (
//           <button
//             key={i}
//             className={`sl-suggest__item ${selected.has(i) ? "is-selected" : ""}`}
//             onClick={() => toggle(i)}
//           >
//             <span className="sl-suggest__check">
//               {selected.has(i) ? "✓" : ""}
//             </span>
//             <div>
//               <div className="sl-suggest__name">{it.name}</div>
//               {it.detail && (
//                 <div className="sl-suggest__detail">{it.detail}</div>
//               )}
//             </div>
//           </button>
//         ))}
//       </div>
//       <button
//         className="sl-btn sl-btn--primary sl-btn--full"
//         disabled={selected.size === 0}
//         onClick={() => onAdd(Array.from(selected).map((i) => items[i]))}
//       >
//         Add {selected.size} Item{selected.size !== 1 ? "s" : ""} to List
//       </button>
//     </div>
//   );
// }

// function BudgetResults({ data }) {
//   return (
//     <div className="sl-budget">
//       {data.estimatedTotal && (
//         <div className="sl-budget__total">
//           Estimated total: <strong>{data.estimatedTotal}</strong>
//         </div>
//       )}
//       {data.savingsTip && (
//         <div className="sl-budget__tip">💡 {data.savingsTip}</div>
//       )}
//       {data.priority?.length > 0 && (
//         <div className="sl-budget__section">
//           <div className="sl-budget__label">🎯 Buy first</div>
//           {data.priority.map((item, i) => (
//             <div key={i} className="sl-budget__item sl-budget__item--high">
//               {item}
//             </div>
//           ))}
//         </div>
//       )}
//       {data.canSkip?.length > 0 && (
//         <div className="sl-budget__section">
//           <div className="sl-budget__label">⏭ Can skip for now</div>
//           {data.canSkip.map((item, i) => (
//             <div key={i} className="sl-budget__item sl-budget__item--low">
//               {item}
//             </div>
//           ))}
//         </div>
//       )}
//       {data.tips?.length > 0 && (
//         <div className="sl-budget__section">
//           <div className="sl-budget__label">📋 Tips</div>
//           {data.tips.map((tip, i) => (
//             <div key={i} className="sl-budget__item">
//               • {tip}
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

// function PrioritizeResults({ items }) {
//   const colors = { high: "#dcfce7", medium: "#fef9c3", low: "#fee2e2" };
//   const labels = { high: "🔴 High", medium: "🟡 Medium", low: "🟢 Low" };
//   return (
//     <div className="sl-prioritize">
//       {items.map((it, i) => (
//         <div
//           key={i}
//           className="sl-prioritize__item"
//           style={{ background: colors[it.priority] || "#f8fafc" }}
//         >
//           <div className="sl-prioritize__rank">#{i + 1}</div>
//           <div className="sl-prioritize__body">
//             <div className="sl-prioritize__name">{it.name}</div>
//             <div className="sl-prioritize__reason">{it.reason}</div>
//           </div>
//           <div className="sl-prioritize__badge">
//             {labels[it.priority] || it.priority}
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// }

// // ── Main component ────────────────────────────────────────────────────────────
// export default function ShoppingList() {
//   const [collapsed, setCollapsed] = useState(true);
//   const [isOpen, setIsOpen] = useState(false);
//   const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
//   const [activeCatId, setActiveCatId] = useState(DEFAULT_CATEGORIES[0].id);
//   const [items, setItems] = useState([]);
//   const [newItemName, setNewItemName] = useState("");
//   const [newItemDetail, setNewItemDetail] = useState("");
//   const [showAddCat, setShowAddCat] = useState(false);
//   const [showAI, setShowAI] = useState(false);
//   const [filter, setFilter] = useState("all"); // all | active | checked
//   const [search, setSearch] = useState("");
//   const [shareMsg, setShareMsg] = useState("");
//   const inputRef = useRef(null);
//   const hydratedRef = useRef(false);

//   // ── Hydrate ──
//   useEffect(() => {
//     if (hydratedRef.current) return;
//     hydratedRef.current = true;
//     try {
//       const saved = JSON.parse(localStorage.getItem(LS_KEY) || "null");
//       if (saved) {
//         if (saved.categories) setCategories(saved.categories);
//         if (saved.items) setItems(saved.items);
//         if (saved.activeCatId) setActiveCatId(saved.activeCatId);
//       }
//     } catch {}
//   }, []);

//   // ── Persist ──
//   useEffect(() => {
//     if (!hydratedRef.current) return;
//     try {
//       syncSetItem(
//         LS_KEY,
//         JSON.stringify({ categories, items, activeCatId }),
//       );
//     } catch {}
//   }, [categories, items, activeCatId]);

//   const activeCat =
//     categories.find((c) => c.id === activeCatId) || categories[0];
//   const catItems = items.filter((i) => i.categoryId === activeCatId);
//   const checkedCount = catItems.filter((i) => i.checked).length;
//   const totalCount = items.filter((i) => !i.checked).length;

//   const filteredItems = catItems.filter((item) => {
//     const matchFilter =
//       filter === "all"
//         ? true
//         : filter === "active"
//           ? !item.checked
//           : filter === "checked"
//             ? item.checked
//             : true;
//     const matchSearch =
//       !search || item.name.toLowerCase().includes(search.toLowerCase());
//     return matchFilter && matchSearch;
//   });

//   const addItem = () => {
//     const name = newItemName.trim();
//     if (!name) return;
//     setItems((prev) => [
//       ...prev,
//       {
//         id: uid(),
//         name,
//         detail: newItemDetail.trim(),
//         categoryId: activeCatId,
//         checked: false,
//         aiSuggested: false,
//         note: "",
//       },
//     ]);
//     setNewItemName("");
//     setNewItemDetail("");
//     inputRef.current?.focus();
//   };

//   const toggleItem = (id) =>
//     setItems((prev) =>
//       prev.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)),
//     );
//   const deleteItem = (id) =>
//     setItems((prev) => prev.filter((i) => i.id !== id));
//   const editNote = (id, note) =>
//     setItems((prev) => prev.map((i) => (i.id === id ? { ...i, note } : i)));
//   const clearChecked = () =>
//     setItems((prev) =>
//       prev.filter((i) => !(i.categoryId === activeCatId && i.checked)),
//     );

//   const addCategory = (cat) => {
//     setCategories((prev) => [...prev, cat]);
//     setActiveCatId(cat.id);
//   };

//   const deleteCategory = (id) => {
//     if (categories.length <= 1) return;
//     setCategories((prev) => prev.filter((c) => c.id !== id));
//     setItems((prev) => prev.filter((i) => i.categoryId !== id));
//     if (activeCatId === id)
//       setActiveCatId(categories.find((c) => c.id !== id)?.id);
//   };

//   const addAIItems = useCallback((newItems) => {
//     setItems((prev) => [...prev, ...newItems]);
//   }, []);

//   const exportList = () => {
//     const text = categories
//       .map((cat) => {
//         const catItems = items.filter((i) => i.categoryId === cat.id);
//         if (!catItems.length) return null;
//         const lines = catItems.map(
//           (i) =>
//             `  ${i.checked ? "✓" : "○"} ${i.name}${i.detail ? ` (${i.detail})` : ""}${i.note ? ` — ${i.note}` : ""}`,
//         );
//         return `${cat.emoji} ${cat.label}\n${lines.join("\n")}`;
//       })
//       .filter(Boolean)
//       .join("\n\n");

//     navigator.clipboard.writeText(text).then(() => {
//       setShareMsg("List copied to clipboard!");
//       setTimeout(() => setShareMsg(""), 2000);
//     });
//   };

//   if (!isOpen) {
//     return (
//       <section className={`sl-stub ${collapsed ? "is-collapsed" : ""}`}>
//         <header
//           className="sl-stub__header"
//           onClick={() => setCollapsed((v) => !v)}
//         >
//           <div className="sl-stub__left">
//             <span className="sl-stub__icon">🛒</span>
//             <h3 className="sl-stub__title">Shopping List</h3>
//             {totalCount > 0 && (
//               <span className="sl-stub__count">{totalCount}</span>
//             )}
//           </div>
//           <div className="sl-stub__right" onClick={(e) => e.stopPropagation()}>
//             <button className="sl-stub__open" onClick={() => setIsOpen(true)}>
//               Open
//             </button>
//             <span className="sl-stub__caret">{collapsed ? "▸" : "▾"}</span>
//           </div>
//         </header>
//         {!collapsed && (
//           <div className="sl-stub__body">
//             {categories.map((cat) => {
//               const n = items.filter(
//                 (i) => i.categoryId === cat.id && !i.checked,
//               ).length;
//               return n > 0 ? (
//                 <div key={cat.id} className="sl-stub__cat">
//                   <span>
//                     {cat.emoji} {cat.label}
//                   </span>
//                   <span className="sl-stub__n">{n}</span>
//                 </div>
//               ) : null;
//             })}
//             {totalCount === 0 && (
//               <p className="sl-stub__empty">Nothing on your list yet.</p>
//             )}
//             <button
//               className="sl-stub__open-full"
//               onClick={() => setIsOpen(true)}
//             >
//               Open Shopping List →
//             </button>
//           </div>
//         )}
//       </section>
//     );
//   }

//   return (
//     <>
//       <div className="sl-backdrop" onClick={() => setIsOpen(false)} />
//       <aside
//         className="sl-modal"
//         role="dialog"
//         aria-modal="true"
//         aria-label="Shopping List"
//       >
//         {/* Header */}
//         <header className="sl-header">
//           <div className="sl-header__left">
//             <span className="sl-header__icon">🛒</span>
//             <div>
//               <h2 className="sl-header__title">Shopping List</h2>
//               <p className="sl-header__sub">
//                 {totalCount} item{totalCount !== 1 ? "s" : ""} to buy
//               </p>
//             </div>
//           </div>
//           <div className="sl-header__actions">
//             <button
//               className={`sl-btn sl-btn--ai-toggle ${showAI ? "is-active" : ""}`}
//               onClick={() => setShowAI((v) => !v)}
//               title="AI Shopping Assistant"
//             >
//               ✨ AI
//             </button>
//             <button
//               className="sl-btn"
//               onClick={exportList}
//               title="Copy list to clipboard"
//             >
//               📋 Copy
//             </button>
//             {shareMsg && <span className="sl-share-msg">{shareMsg}</span>}
//             <button className="sl-close" onClick={() => setIsOpen(false)}>
//               ×
//             </button>
//           </div>
//         </header>

//         <div className="sl-layout">
//           {/* Left: categories + AI panel */}
//           <nav className="sl-sidebar">
//             <div className="sl-sidebar__cats">
//               {categories.map((cat) => (
//                 <div key={cat.id} className="sl-tab-wrap">
//                   <CategoryTab
//                     cat={cat}
//                     active={activeCatId === cat.id}
//                     count={
//                       items.filter((i) => i.categoryId === cat.id && !i.checked)
//                         .length
//                     }
//                     onClick={() => setActiveCatId(cat.id)}
//                   />
//                   {categories.length > 1 && activeCatId === cat.id && (
//                     <button
//                       className="sl-tab-delete"
//                       onClick={() => deleteCategory(cat.id)}
//                       title="Delete category"
//                     >
//                       ×
//                     </button>
//                   )}
//                 </div>
//               ))}
//               <button
//                 className="sl-add-cat-btn"
//                 onClick={() => setShowAddCat(true)}
//               >
//                 + Add Category
//               </button>
//             </div>

//             {showAI && (
//               <AIPanel
//                 categories={categories}
//                 items={items}
//                 activeCatId={activeCatId}
//                 onAddItems={addAIItems}
//                 onClose={() => setShowAI(false)}
//               />
//             )}
//           </nav>

//           {/* Right: list */}
//           <div className="sl-main">
//             {/* Category header */}
//             <div
//               className="sl-main__head"
//               style={{ "--cat-color": activeCat?.color }}
//             >
//               <span className="sl-main__emoji">{activeCat?.emoji}</span>
//               <h3 className="sl-main__cat-name">{activeCat?.label}</h3>
//               <span className="sl-main__progress">
//                 {checkedCount}/{catItems.length} done
//               </span>
//             </div>

//             {/* Add item row */}
//             <div className="sl-add-row">
//               <input
//                 ref={inputRef}
//                 className="sl-add-input"
//                 placeholder="Add item…"
//                 value={newItemName}
//                 onChange={(e) => setNewItemName(e.target.value)}
//                 onKeyDown={(e) => e.key === "Enter" && addItem()}
//               />
//               <input
//                 className="sl-add-input sl-add-input--detail"
//                 placeholder="Size / color / brand (optional)"
//                 value={newItemDetail}
//                 onChange={(e) => setNewItemDetail(e.target.value)}
//                 onKeyDown={(e) => e.key === "Enter" && addItem()}
//               />
//               <button
//                 className="sl-btn sl-btn--primary"
//                 onClick={addItem}
//                 disabled={!newItemName.trim()}
//               >
//                 Add
//               </button>
//             </div>

//             {/* Filters + search */}
//             <div className="sl-filters">
//               <div className="sl-filter-btns">
//                 {["all", "active", "checked"].map((f) => (
//                   <button
//                     key={f}
//                     className={`sl-filter-btn ${filter === f ? "is-active" : ""}`}
//                     onClick={() => setFilter(f)}
//                   >
//                     {f.charAt(0).toUpperCase() + f.slice(1)}
//                   </button>
//                 ))}
//               </div>
//               <input
//                 className="sl-search"
//                 placeholder="🔍 Search…"
//                 value={search}
//                 onChange={(e) => setSearch(e.target.value)}
//               />
//               {checkedCount > 0 && (
//                 <button
//                   className="sl-btn sl-btn--sm sl-btn--danger"
//                   onClick={clearChecked}
//                 >
//                   Clear done ({checkedCount})
//                 </button>
//               )}
//             </div>

//             {/* Progress bar */}
//             {catItems.length > 0 && (
//               <div className="sl-progress">
//                 <div
//                   className="sl-progress__bar"
//                   style={{
//                     width: `${(checkedCount / catItems.length) * 100}%`,
//                     background: activeCat?.color,
//                   }}
//                 />
//               </div>
//             )}

//             {/* Items */}
//             <div className="sl-items">
//               {filteredItems.length === 0 ? (
//                 <div className="sl-empty">
//                   {catItems.length === 0 ? (
//                     <>
//                       <p>Nothing here yet.</p>
//                       <p>Add items above or use ✨ AI to get suggestions!</p>
//                     </>
//                   ) : (
//                     <p>No items match your filter.</p>
//                   )}
//                 </div>
//               ) : (
//                 filteredItems.map((item) => (
//                   <ShoppingItem
//                     key={item.id}
//                     item={item}
//                     onToggle={toggleItem}
//                     onDelete={deleteItem}
//                     onEditNote={editNote}
//                   />
//                 ))
//               )}
//             </div>
//           </div>
//         </div>
//       </aside>

//       {showAddCat && (
//         <AddCategoryModal
//           onAdd={addCategory}
//           onClose={() => setShowAddCat(false)}
//         />
//       )}
//     </>
//   );
// }
