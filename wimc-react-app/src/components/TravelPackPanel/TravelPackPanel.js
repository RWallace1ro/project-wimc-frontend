import { syncSetItem } from '../../utils/syncStore';
﻿import React, { useEffect, useRef, useState } from "react";
import {
  fetchImagesByTag,
  fetchVideosByTag,
  uploadRawJSON,
  videoPoster,
} from "../../utils/CloudinaryAPI";
import { appShareUrl, createCollabDoc, shareAppLink, smsShareUrl } from "../../utils/shareUtils";
import AIPackingAssistant from "../AIPackingAssistant/AIPackingAssistant";
import "./TravelPackPanel.css";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const LS_KEY = "wimc_travel_pack_v2";
const LEGACY_LS_KEY = "wimc_travel_pack_v1";

const SECTION_OPTIONS = [
  { value: "dresses-skirts", label: "Dresses/Skirts" },
  { value: "shoes-sneakers", label: "Shoes/Sneakers" },
  { value: "pants-jeans", label: "Pants/Jeans" },
  { value: "tops", label: "Tops" },
  { value: "bags-accessories", label: "Bags/Accessories" },
  { value: "jackets-coats", label: "Jackets/Coats" },
];

function emptyPlan() {
  // eslint-disable-next-line no-sequences
  return DAYS.reduce((acc, d) => ((acc[d] = []), acc), {});
}

function normalizeMedia(x, section) {
  if (!x) return null;
  const to = (url) =>
    url?.replace("/upload/", "/upload/f_auto,q_auto,w_600,c_limit/");
  const isV = (u) => /\.(mp4|mov|webm|mkv|m4v)(\?.*)?$/i.test(u || "");
  if (typeof x === "string") {
    return isV(x)
      ? {
          mediaType: "video",
          mediaUrl: x,
          mediaPoster: videoPoster(x),
          name: "",
          section,
        }
      : {
          mediaType: "image",
          mediaUrl: x,
          mediaThumb: to(x),
          name: "",
          section,
        };
  }
  const u = x.mediaUrl || x.imageUrl || "";
  return {
    mediaType: x.mediaType || (isV(u) ? "video" : "image"),
    mediaUrl: u,
    mediaThumb: x.mediaThumb || (!isV(u) ? to(u) : ""),
    mediaPoster: x.mediaPoster || (isV(u) ? videoPoster(u) : ""),
    name: x.name || "",
    section: x.section || section || "",
    kind: x.kind,
  };
}

export default function TravelPackPanel({
  currentPreview = [],
  onSyncToPlanner,
  // tagPrefix — e.g. "kid-abc123". When set, section items are fetched from
  // "kid-abc123-tops" etc. and plan state is stored under a child-specific key.
  tagPrefix = "",
}) {
  // Child-specific localStorage key so each child has their own travel pack
  const lsKey = tagPrefix ? `wimc_travel_pack_${tagPrefix}_v2` : LS_KEY;

  const [collapsed, setCollapsed] = useState(true);
  const [floating, setFloating] = useState(false);
  const [doors, setDoors] = useState({ opening: false, armed: false });
  const [packPlan, setPackPlan] = useState(emptyPlan());
  const [selectedDay, setSelectedDay] = useState("Friday");
  const [isAIPackOpen, setIsAIPackOpen] = useState(false);
  const [textItem, setTextItem] = useState("");
  const [pickerSection, setPickerSection] = useState(SECTION_OPTIONS[0].value);
  const [choices, setChoices] = useState([]);
  const [choicesLoading, setChoicesLoading] = useState(false);
  const [choicesError, setChoicesError] = useState("");
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareError, setShareError] = useState("");
  const [smsHref, setSmsHref] = useState("");
  const [daySharing, setDaySharing] = useState(false);
  const [dayShareUrl, setDayShareUrl] = useState("");
  const [dayShareError, setDayShareError] = useState("");
  const [shareNote, setShareNote] = useState("");

  // per-day expand/collapse
  const [expandedDays, setExpandedDays] = useState(() => new Set(DAYS));
  const toggleDay = (d) =>
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });

  // per-day undo after Clear
  const [packUndo, setPackUndo] = useState(null); // { day, items }
  const packUndoTimerRef = useRef(null);

  const hydratedRef = useRef(false);

  // Hydrate from localStorage
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    try {
      const v2 = JSON.parse(localStorage.getItem(lsKey) || "null");
      if (v2 && typeof v2 === "object") {
        const norm = emptyPlan();
        for (const d of DAYS) {
          norm[d] = (v2[d] || [])
            .map((it) => normalizeMedia(it, it?.section))
            .filter(Boolean);
        }
        setPackPlan(norm);
        return;
      }
      const v1 = JSON.parse(localStorage.getItem(LEGACY_LS_KEY) || "null");
      if (Array.isArray(v1)) {
        setPackPlan((prev) => ({
          ...prev,
          [selectedDay]: v1.map((it) => normalizeMedia(it)).filter(Boolean),
        }));
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay]);

  // Persist on change
  useEffect(() => {
    try {
      syncSetItem(lsKey, JSON.stringify(packPlan));
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packPlan]);

  function open() {
    setFloating(true);
    setCollapsed(false);
    setDoors({ opening: true, armed: false });
    requestAnimationFrame(() => setDoors({ opening: true, armed: true }));
    setTimeout(() => setDoors({ opening: false, armed: false }), 3000);
  }
  function close() {
    setCollapsed(true);
    setFloating(false);
    setDoors({ opening: false, armed: false });
  }

  function addTextItem(nameOverride) {
    const v = (nameOverride ?? textItem).trim();
    if (!v) return;
    setPackPlan((prev) => ({
      ...prev,
      [selectedDay]: [...prev[selectedDay], { name: v, kind: "text" }],
    }));
    if (!nameOverride) setTextItem("");
  }

  // ✅ Defined INSIDE the component so it can access setPackPlan and selectedDay
  function handleAIItem(item) {
    const v = (item?.name || "").trim();
    if (!v) return;
    setPackPlan((prev) => ({
      ...prev,
      [selectedDay]: [...prev[selectedDay], { name: v, kind: "text" }],
    }));
  }

  function addFromPreview() {
    if (!currentPreview?.length) return;
    const toAdd = currentPreview
      .map((it) => normalizeMedia(it, it?.section))
      .filter(Boolean);
    setPackPlan((prev) => {
      const seen = new Set(prev[selectedDay].map((p) => p.mediaUrl || p.name));
      const unique = toAdd.filter((it) => {
        const key = it.mediaUrl || it.name;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return { ...prev, [selectedDay]: [...prev[selectedDay], ...unique] };
    });
  }

  function addChoiceToDay(it) {
    const norm = normalizeMedia(it, it?.section);
    if (!norm) return;
    setPackPlan((prev) => {
      const dayArr = prev[selectedDay];
      const key = norm.mediaUrl || norm.name;
      if (dayArr.some((p) => (p.mediaUrl || p.name) === key)) return prev;
      return { ...prev, [selectedDay]: [...dayArr, norm] };
    });
  }

  function removeAt(day, i) {
    setPackPlan((prev) => {
      const arr = prev[day].slice();
      arr.splice(i, 1);
      return { ...prev, [day]: arr };
    });
  }

  function syncToPlanner() {
    if (!onSyncToPlanner) return;
    onSyncToPlanner(selectedDay, packPlan[selectedDay]);
  }

  async function exportPack(withEdit = false) {
    setSharing(true);
    setShareUrl("");
    setShareError("");
    const payload = { kind: "wimc.travelPack", version: 1, createdAt: new Date().toISOString(), note: shareNote, days: packPlan };
    try {
      let url;
      if (withEdit) {
        url = await createCollabDoc("travelpack", payload);
      } else {
        const res = await uploadRawJSON(payload, "wimc/travel-packs");
        const cloudUrl = res?.secure_url;
        if (!cloudUrl) throw new Error("no url");
        url = appShareUrl(cloudUrl, "travelpack");
      }
      const result = await shareAppLink({ title: "My Travel Pack 🧳", text: shareNote ? `Check out my packing list!\n\n📝 ${shareNote}` : "Check out my packing list!", url });
      if (result === "clipboard" || result === "unsupported") {
        setSmsHref(smsShareUrl(url, "Check out my packing list!"));
        setTimeout(() => setSmsHref(""), 5000);
      }
      setShareUrl(result === "aborted" ? "" : result === "clipboard" ? "📋 Link copied!" : "✅ Shared!");
      setTimeout(() => setShareUrl(""), 3500);
    } catch { setShareError("Export failed. Please try again."); }
    finally { setSharing(false); }
  }

  async function exportPackDay(day) {
    setDaySharing(true);
    setDayShareError("");
    setDayShareUrl("");
    const payload = { kind: "wimc.travelPackDay", version: 1, createdAt: new Date().toISOString(), note: shareNote, day, items: packPlan[day] };
    try {
      const res = await uploadRawJSON(payload, "wimc/travel-pack-days");
      const cloudUrl = res?.secure_url;
      if (!cloudUrl) throw new Error("no url");
      const url = appShareUrl(cloudUrl, "travelpack");
      const result = await shareAppLink({ title: `Travel Pack - Day ${Number(day)+1}`, text: shareNote ? `Packing list for today!\n\n📝 ${shareNote}` : "Packing list for today", url });
      setDayShareUrl(result === "clipboard" ? "📋 Link copied!" : "✅ Shared!");
      setTimeout(() => setDayShareUrl(""), 3500);
    } catch { setDayShareError("Day export failed. Please try again."); }
    finally { setDaySharing(false); }
  }

  // Load inline picker choices
  useEffect(() => {
    let ignore = false;
    async function loadChoices() {
      if (!floating || doors.opening || !pickerSection) return;
      setChoicesLoading(true);
      setChoicesError("");
      try {
        const effectiveSection = tagPrefix
          ? `${tagPrefix}-${pickerSection}`
          : pickerSection;
        const imgs = await fetchImagesByTag(effectiveSection);
        const vids = await fetchVideosByTag(effectiveSection);
        const norm = [
          ...(imgs || []).map((u) => normalizeMedia(u, pickerSection)),
          ...(vids || []).map((u) =>
            normalizeMedia(
              { mediaType: "video", mediaUrl: u, mediaPoster: videoPoster(u) },
              pickerSection,
            ),
          ),
        ].filter(Boolean);
        if (!ignore) setChoices(norm);
      } catch {
        if (!ignore) {
          setChoices([]);
          setChoicesError("Couldn't load items for this section.");
        }
      } finally {
        if (!ignore) setChoicesLoading(false);
      }
    }
    loadChoices();
    return () => {
      ignore = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floating, doors.opening, pickerSection]);

  const totalCount = DAYS.reduce((n, d) => n + (packPlan[d]?.length || 0), 0);

  return (
    <>
      {floating && <div className="tp__backdrop" onClick={close} />}

      <section
        className={
          "tp" +
          (floating ? " tp--floating" : "") +
          (collapsed ? " tp--collapsed" : "")
        }
      >
        <header className="tp__header">
          <h3 className="tp__title">Travel Pack</h3>
          <button className="tp__toggle tp__close-toggle" onClick={collapsed ? open : close} aria-label={collapsed ? "Open" : "Close"}>
            {collapsed ? "Open" : "✕"}
          </button>
        </header>

        {collapsed ? (
          <div className="tp__collapsed-row">{totalCount} items</div>
        ) : doors.opening ? (
          <div
            className={"tp__doors" + (doors.armed ? " tp__doors--open" : "")}
          >
            <div className="tp__door tp__door--left" />
            <div className="tp__door tp__door--right" />
          </div>
        ) : (
          <div className="tp__body">
            {/* Share bar — buttons left, note right */}
            <div className="tp__share-bar">
              <div className="tp__share-btns">
                <label>
                  Pack for the Day:{" "}
                  <select
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value)}
                  >
                    {DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="tp__toggle"
                  onClick={() => exportPackDay(selectedDay)}
                  disabled={
                    daySharing || (packPlan[selectedDay]?.length || 0) === 0
                  }
                >
                  {daySharing ? "Exporting…" : `Export ${selectedDay}`}
                </button>
                <button
                  className="tp__toggle"
                  onClick={() => exportPack(false)}
                  disabled={sharing}
                >
                  {sharing ? "Sharing…" : "Share Pack (View Only)"}
                </button>
                <button
                  className="tp__toggle tp__toggle--edit"
                  onClick={() => exportPack(true)}
                  disabled={sharing}
                >
                  ✏️ Share + Edit
                </button>
                <button
                  className="tp__toggle tp__toggle--ai"
                  onClick={() => setIsAIPackOpen(true)}
                >
                  ✨ AI Pack
                </button>
              </div>
              <textarea
                className="tp__share-note"
                placeholder="Add a note for the recipient, when sharing (optional)…"
                value={shareNote}
                onChange={(e) => setShareNote(e.target.value)}
                rows={2}
              />
            </div>

            {(shareUrl || shareError || smsHref) && (
              <div className="tp__share">
                {shareUrl && <span className="tp__share-link">{shareUrl}</span>}
                {smsHref && (
                  <a href={smsHref} className="tp__toggle" style={{ textDecoration: "none" }}>
                    📱 Text
                  </a>
                )}
                {shareError && <span className="tp__error">{shareError}</span>}
              </div>
            )}
            {(dayShareUrl || dayShareError) && (
              <div className="tp__share">
                {dayShareUrl
                  ? <span className="tp__share-link">{dayShareUrl}</span>
                  : <span className="tp__error">{dayShareError}</span>
                }
              </div>
            )}

            <div className="tp__row" style={{ alignItems: "center" }}>
              <button
                onClick={addFromPreview}
                disabled={!currentPreview?.length}
              >
                Add from current preview
              </button>
            </div>

            <div className="tp__row">
              <input
                className="tp__input"
                placeholder="Add item (text)…"
                value={textItem}
                onChange={(e) => setTextItem(e.target.value)}
              />
              <button onClick={() => addTextItem()}>Add</button>
            </div>

            {/* Inline picker */}
            <div className="tp__picker">
              <div className="tp__picker-top">
                <label>
                  Section:{" "}
                  <select
                    value={pickerSection}
                    onChange={(e) => setPickerSection(e.target.value)}
                  >
                    {SECTION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <span className="tp__picker-tip">
                  Click an item to add to <strong>{selectedDay}</strong>
                </span>
              </div>
              {choicesLoading ? (
                <div className="tp__loading">Loading…</div>
              ) : choicesError ? (
                <div className="tp__error">{choicesError}</div>
              ) : (
                <div className="tp__choices">
                  {choices.map((it, i) => (
                    <button
                      key={(it.mediaUrl || "i") + i}
                      className="tp__choice-btn"
                      onClick={() => addChoiceToDay(it)}
                    >
                      <img
                        className="tp__choice-img"
                        src={
                          it.mediaType === "video"
                            ? it.mediaPoster || ""
                            : it.mediaThumb || it.mediaUrl
                        }
                        alt={it.mediaType === "video" ? "video" : "item"}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Week grid */}
            <div className="tp__grid-week">
              {DAYS.map((d) => (
                <section
                  key={d}
                  className={
                    "tp__day" +
                    (expandedDays.has(d) ? "" : " tp__day--collapsed")
                  }
                >
                  <header className="tp__daytop">
                    <button
                      className="tp__day-caret"
                      onClick={() => toggleDay(d)}
                      title={expandedDays.has(d) ? "Collapse" : "Expand"}
                      aria-label={expandedDays.has(d) ? "Collapse" : "Expand"}
                    >
                      {expandedDays.has(d) ? "▾" : "▸"}
                    </button>
                    <h4>{d}</h4>
                    <div style={{ display: "flex", gap: 6 }}>
                      {packUndo?.day === d && (
                        <button
                          className="tp__mini"
                          onClick={() => {
                            clearTimeout(packUndoTimerRef.current);
                            setPackPlan((prev) => ({
                              ...prev,
                              [packUndo.day]: packUndo.items,
                            }));
                            setPackUndo(null);
                          }}
                        >
                          Undo
                        </button>
                      )}
                      <button
                        className="tp__mini tp__mini--danger"
                        onClick={() => {
                          const items = packPlan[d] || [];
                          if (packUndoTimerRef.current)
                            clearTimeout(packUndoTimerRef.current);
                          setPackUndo({ day: d, items });
                          setPackPlan((prev) => ({ ...prev, [d]: [] }));
                          packUndoTimerRef.current = setTimeout(
                            () => setPackUndo(null),
                            5000
                          );
                        }}
                        disabled={(packPlan[d]?.length || 0) === 0}
                      >
                        Clear
                      </button>
                    </div>
                  </header>
                  <ul className="tp__list">
                    {(packPlan[d] || []).length === 0 ? (
                      <li className="tp__empty">No items</li>
                    ) : (
                      packPlan[d].map((it, i) => (
                        <li
                          key={(it.mediaUrl || it.name || "i") + i}
                          className="tp__li"
                        >
                          {it.kind === "text" ? (
                            <span className="tp__text">{it.name}</span>
                          ) : (
                            <img
                              className="tp__thumb"
                              src={it.mediaThumb || it.mediaUrl}
                              alt={it.name || "item"}
                            />
                          )}
                          <button
                            className="tp__remove"
                            onClick={() => removeAt(d, i)}
                          >
                            🗑️
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </section>
              ))}
            </div>

            <div className="tp__sync">
              <label>
                Sync day to Planner:{" "}
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <button
                onClick={syncToPlanner}
                title="Copy this pack day into the Planner's same day"
              >
                Sync to Planner
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ✅ AIPackingAssistant rendered outside <section> so it overlays correctly */}
      <AIPackingAssistant
        isOpen={isAIPackOpen}
        onClose={() => setIsAIPackOpen(false)}
        onAddItem={handleAIItem}
        selectedDay={selectedDay}
      />
    </>
  );
}
