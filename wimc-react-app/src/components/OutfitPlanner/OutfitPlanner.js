import { syncSetItem } from '../../utils/syncStore';
﻿import React, { useEffect, useRef, useState } from "react";
import {
  fetchImagesByTag,
  fetchVideosByTag,
  uploadRawJSON,
  videoPoster,
} from "../../utils/CloudinaryAPI";
import { appShareUrl, createCollabDoc, shareAppLink } from "../../utils/shareUtils";
import Lightbox from "../Lightbox/Lightbox";
import "./OutfitPlanner.css";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const LS_KEY = "wimc_week_plan_v1";
function getPlannerLsKey(tagPrefix) {
  return tagPrefix ? `wimc_week_plan_${tagPrefix}_v1` : LS_KEY;
}

const SECTION_OPTIONS = [
  { value: "dresses-skirts", label: "Dresses/Skirts" },
  { value: "shoes-sneakers", label: "Shoes/Sneakers" },
  { value: "pants-jeans", label: "Pants/Jeans" },
  { value: "tops", label: "Tops" },
  { value: "bags-accessories", label: "Bags/Accessories" },
  { value: "jackets-coats", label: "Jackets/Coats" },
];

// helpers
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
  };
}
function emptyWeek() {
  // eslint-disable-next-line no-sequences
  return DAYS.reduce((acc, d) => ((acc[d] = []), acc), {});
}

export default function OutfitPlanner({
  weekPlan,
  onChange,
  currentPreview = [],
  tagPrefix = "",
}) {
  const plannerLsKey = getPlannerLsKey(tagPrefix);
  const [internalPlan, setInternalPlan] = useState(emptyWeek());
  const plan = weekPlan ?? internalPlan;
  const setPlan = onChange ?? setInternalPlan;

  const [collapsed, setCollapsed] = useState(true);
  const [floating, setFloating] = useState(false);
  const [doors, setDoors] = useState({ opening: false, armed: false });
  const [selectedDay, setSelectedDay] = useState("Monday");

  // import/export UI state
  const [importUrl, setImportUrl] = useState("");
  const [loadingImport, setLoadingImport] = useState(false);
  const [importError, setImportError] = useState("");
  const [smsHref, setSmsHref] = useState(""); // eslint-disable-line no-unused-vars
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareError, setShareError] = useState("");
  const [daySharing, setDaySharing] = useState(false);
  const [dayShareUrl, setDayShareUrl] = useState("");
  const [dayShareError, setDayShareError] = useState("");
  const [shareNote, setShareNote] = useState("");

  // inline picker
  const [pickerSection, setPickerSection] = useState(SECTION_OPTIONS[0].value);
  const [choices, setChoices] = useState([]);
  const [choicesLoading, setChoicesLoading] = useState(false);
  const [choicesError, setChoicesError] = useState("");

  // lightbox
  const [lbImages, setLbImages] = useState([]);
  const [lbIndex, setLbIndex] = useState(0);
  const openLightbox = (images, idx) => { setLbImages(images); setLbIndex(idx); };
  const closeLightbox = () => setLbImages([]);

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
  const [plannerUndo, setPlannerUndo] = useState(null); // { day, items }
  const plannerUndoTimerRef = useRef(null);

  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    try {
      const saved = JSON.parse(localStorage.getItem(plannerLsKey) || "null");
      if (saved && typeof saved === "object") {
        const norm = emptyWeek();
        for (const d of DAYS) {
          norm[d] = (saved[d] || [])
            .map((it) => normalizeMedia(it, it?.section))
            .filter(Boolean);
        }
        setPlan(norm);
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!plan) return;
    try {
      syncSetItem(plannerLsKey, JSON.stringify(plan));
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  // open/close
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

  // merge helper
  function mergePlans(a, b) {
    const uniqMerge = (arrA = [], arrB = []) => {
      const out = [...arrA];
      const seen = new Set(
        arrA.map(
          (it) => it.mediaUrl || it.imageUrl || it.name || JSON.stringify(it),
        ),
      );
      for (const it of arrB) {
        const key = it.mediaUrl || it.imageUrl || it.name || JSON.stringify(it);
        if (!seen.has(key)) {
          seen.add(key);
          out.push(it);
        }
      }
      return out;
    };
    const next = {};
    for (const d of DAYS) next[d] = uniqMerge(a?.[d], b?.[d]);
    return next;
  }

  // import week
  async function importWeek(mode) {
    if (!importUrl) return;
    setLoadingImport(true);
    setImportError("");
    try {
      const res = await fetch(importUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const src = data.days || data;
      const normalized = emptyWeek();
      for (const d of DAYS) {
        const arr = Array.isArray(src?.[d]) ? src[d] : [];
        normalized[d] = arr
          .map((it) => normalizeMedia(it, it?.section))
          .filter(Boolean);
      }
      setPlan(mode === "replace" ? normalized : mergePlans(plan, normalized));
    } catch (e) {
      console.error(e);
      setImportError("Could not import week plan. Check the link format.");
    } finally {
      setLoadingImport(false);
    }
  }

  // export week
  async function exportWeek(withEdit = false) {
    setSharing(true);
    setShareError("");
    setShareUrl("");
    const payload = { kind: "wimc.weekPlan", version: 1, createdAt: new Date().toISOString(), note: shareNote, days: plan || {} };
    try {
      let url;
      if (withEdit) {
        url = await createCollabDoc("outfit", payload);
      } else {
        const res = await uploadRawJSON(payload, "wimc/week-plans");
        const cloudUrl = res?.secure_url;
        if (!cloudUrl) throw new Error("no url");
        url = appShareUrl(cloudUrl, "outfit");
      }
      const result = await shareAppLink({ title: "My Outfit Plan 👗", text: shareNote ? `Check out my weekly outfit plan!\n\n📝 ${shareNote}` : "Check out my weekly outfit plan!", url });
      setShareUrl(result === "clipboard" ? "📋 Link copied!" : "✅ Shared!");
      setTimeout(() => setShareUrl(""), 3500);
    } catch { setShareError("Export failed. Please try again."); }
    finally { setSharing(false); }
  }

  // export one day
  async function exportDay(day) {
    setDaySharing(true);
    setDayShareError("");
    setDayShareUrl("");
    try {
      const items = (plan?.[day] || []).map((it) =>
        normalizeMedia(it, it?.section),
      );
      const payload = {
        kind: "wimc.weekDay",
        version: 1,
        createdAt: new Date().toISOString(),
        note: shareNote,
        day,
        items,
      };
      const res = await uploadRawJSON(payload, "wimc/week-days");
      const cloudUrl = res?.secure_url;
      if (!cloudUrl) throw new Error("no url");
      const url = appShareUrl(cloudUrl, "outfit");
      const result = await shareAppLink({ title: `Outfit Plan - ${day}`, text: shareNote ? `Check out my outfit for the day!\n\n📝 ${shareNote}` : "Check out my outfit for the day!", url });
      setDayShareUrl(result === "clipboard" ? "📋 Link copied!" : "✅ Shared!");
      setTimeout(() => setDayShareUrl(""), 3500);
    } catch { setDayShareError("Day export failed. Please try again."); }
    finally { setDaySharing(false); }
  }

  // apply current preview
  function applyPreviewToDay(day) {
    if (!currentPreview?.length) return;
    const normalized = currentPreview
      .map((it) => normalizeMedia(it, it?.section))
      .filter(Boolean);
    setPlan(mergePlans(plan, { [day]: normalized }));
  }

  // inline picker
  useEffect(() => {
    let ignore = false;
    async function loadChoices() {
      if (!floating || doors.opening || !pickerSection) return;
      setChoicesLoading(true);
      setChoicesError("");
      try {
        const effectiveSection = tagPrefix ? `${tagPrefix}-${pickerSection}` : pickerSection;
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
      } catch (e) {
        console.error(e);
        if (!ignore) {
          setChoices([]);
          setChoicesError("Couldn’t load items for this section.");
        }
      } finally {
        if (!ignore) setChoicesLoading(false);
      }
    }
    loadChoices();
    return () => {
      ignore = true;
    };
  }, [floating, doors.opening, pickerSection]);

  function addChoiceToDay(it, day) {
    const norm = normalizeMedia(it, it?.section);
    if (!norm) return;
    setPlan(mergePlans(plan, { [day]: [norm] }));
  }
  function removeFromDay(day, index) {
    const next = { ...(plan || {}) };
    const arr = [...(next[day] || [])];
    arr.splice(index, 1);
    next[day] = arr;
    setPlan(next);
  }

  const daysSetCount = DAYS.filter((d) => (plan?.[d] || []).length > 0).length;

  return (
    <>
      {lbImages.length > 0 && (
        <Lightbox images={lbImages} index={lbIndex} onClose={closeLightbox} onChange={setLbIndex} />
      )}
      {floating && <div className="planner__backdrop" onClick={close} />}

      <section
        className={
          "planner" +
          (floating ? " planner--floating" : "") +
          (collapsed ? " planner--collapsed" : "")
        }
        aria-label="Outfit Planner"
      >
        <header className="planner__header">
          <h3 className="planner__title">Outfit of the Day</h3>
          <div className="planner__header-actions">
            <button
              className="planner__toggle planner__close-toggle"
              onClick={collapsed ? open : close}
              aria-label={collapsed ? "Open" : "Close"}
            >
              {collapsed ? "Open" : "✕"}
            </button>
          </div>
        </header>

        {collapsed ? (
          <div className="planner__collapsed-row">
            Plan your week • {daysSetCount}/7 days set
          </div>
        ) : doors.opening ? (
          <div
            className={
              "planner__doors" + (doors.armed ? " planner__doors--open" : "")
            }
          >
            <div className="planner__door planner__door--left" />
            <div className="planner__door planner__door--right" />
          </div>
        ) : (
          <div className="planner__body">
            <div className="planner__share-bar">
              <div className="planner__share-btns">
                <label>
                  Day:{" "}
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
                  className="planner__export"
                  onClick={() => exportDay(selectedDay)}
                  disabled={
                    !plan ||
                    daySharing ||
                    (plan?.[selectedDay]?.length || 0) === 0
                  }
                  title={`Export ${selectedDay} only`}
                >
                  {daySharing ? "Exporting…" : `Export ${selectedDay}`}
                </button>
                <button
                  className="planner__export"
                  onClick={() => exportWeek(false)}
                  disabled={!plan || sharing}
                  title="Share Week Plan (view only)"
                >
                  {sharing ? "Sharing…" : "Share Plan (View Only)"}
                </button>
                <button
                  className="planner__export planner__export--edit"
                  onClick={() => exportWeek(true)}
                  disabled={!plan || sharing}
                  title="Share Week Plan with edit access"
                >
                  ✏️ Share + Edit
                </button>
              </div>
              <textarea
                className="planner__share-note"
                placeholder="Add a note for the recipient, when sharing (optional)…"
                value={shareNote}
                onChange={(e) => setShareNote(e.target.value)}
                rows={2}
              />
            </div>

            {(shareUrl || shareError || smsHref) && (
              <div className="planner__share">
                {shareUrl && <span className="planner__share-link">{shareUrl}</span>}
                {smsHref && (
                  <a href={smsHref} className="planner__export" style={{ textDecoration: "none" }}>
                    📱 Text
                  </a>
                )}
                {shareError && <span className="planner__error">{shareError}</span>}
              </div>
            )}
            {(dayShareUrl || dayShareError) && (
              <div className="planner__share">
                {dayShareUrl
                  ? <span className="planner__share-link">{dayShareUrl}</span>
                  : <span className="planner__error">{dayShareError}</span>
                }
              </div>
            )}

            {/* Import */}
            <div className="planner__import">
              <input
                className="planner__input"
                type="url"
                placeholder='Import Week Plan URL (expects {"days":{...}} or flat {Monday:[...]})'
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
              />
              <div className="planner__import-actions">
                <button
                  disabled={!importUrl || loadingImport}
                  onClick={() => importWeek("replace")}
                >
                  {loadingImport ? "Loading…" : "Load"}
                </button>
                <button
                  disabled={!importUrl || loadingImport}
                  onClick={() => importWeek("merge")}
                >
                  Merge
                </button>
              </div>
              {importError && (
                <div className="planner__error">{importError}</div>
              )}
            </div>

            {/* Apply current preview */}
            <div className="planner__apply">
              <button
                className="planner__btn"
                disabled={!currentPreview?.length}
                onClick={() => applyPreviewToDay(selectedDay)}
                title="Copy current Outfit Preview into selected day"
              >
                Use current preview →
              </button>
            </div>

            {/* Inline picker */}
            <div className="planner__picker">
              <div className="planner__picker-top">
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
                <span className="planner__picker-tip">
                  Click an item to add to <strong>{selectedDay}</strong>
                </span>
              </div>
              {choicesLoading ? (
                <div className="planner__loading">Loading…</div>
              ) : choicesError ? (
                <div className="planner__error">{choicesError}</div>
              ) : (
                <div className="planner__choices">
                  {choices.map((it, i) => (
                    <button
                      key={(it.mediaUrl || "i") + i}
                      className="planner__choice-btn"
                      onClick={() => addChoiceToDay(it, selectedDay)}
                    >
                      {it.mediaType === "video" ? (
                        <img
                          className="planner__choice-img"
                          src={it.mediaPoster || ""}
                          alt="video"
                        />
                      ) : (
                        <img
                          className="planner__choice-img"
                          src={it.mediaThumb || it.mediaUrl}
                          alt="item"
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Week grid */}
            <div className="planner__grid">
              {DAYS.map((d) => (
                <section
                  key={d}
                  className={
                    "planner__day" +
                    (expandedDays.has(d) ? "" : " planner__day--collapsed")
                  }
                >
                  <header className="planner__day-head">
                    <button
                      className="planner__day-caret"
                      onClick={() => toggleDay(d)}
                      title={expandedDays.has(d) ? "Collapse" : "Expand"}
                      aria-label={expandedDays.has(d) ? "Collapse" : "Expand"}
                    >
                      {expandedDays.has(d) ? "▾" : "▸"}
                    </button>
                    {d}
                    <div style={{ display: "flex", gap: 6 }}>
                      {plannerUndo?.day === d && (
                        <button
                          className="planner__mini"
                          onClick={() => {
                            clearTimeout(plannerUndoTimerRef.current);
                            setPlan({
                              ...(plan || {}),
                              [plannerUndo.day]: plannerUndo.items,
                            });
                            setPlannerUndo(null);
                          }}
                        >
                          Undo
                        </button>
                      )}
                      <button
                        className="planner__mini planner__mini--danger"
                        title="Remove all from day"
                        onClick={() => {
                          const items = plan?.[d] || [];
                          if (plannerUndoTimerRef.current)
                            clearTimeout(plannerUndoTimerRef.current);
                          setPlannerUndo({ day: d, items });
                          setPlan({ ...(plan || {}), [d]: [] });
                          plannerUndoTimerRef.current = setTimeout(
                            () => setPlannerUndo(null),
                            5000
                          );
                        }}
                        disabled={(plan?.[d]?.length || 0) === 0}
                      >
                        Clear
                      </button>
                    </div>
                  </header>
                  <div className="planner__items">
                    {(plan?.[d] || []).length === 0 ? (
                      <div className="planner__empty">No items</div>
                    ) : (
                      (plan?.[d] || []).map((it, i) => {
                        const dayImgs = (plan?.[d] || [])
                          .filter((x) => x.mediaType !== "video")
                          .map((x) => ({ src: x.mediaThumb || x.mediaUrl, alt: x.name || "" }));
                        const imgIdx = (plan?.[d] || [])
                          .filter((x) => x.mediaType !== "video")
                          .findIndex((_, fi) => {
                            const nonVid = (plan?.[d] || []).filter(x => x.mediaType !== "video");
                            return nonVid[fi] === (plan?.[d] || [])[i];
                          });
                        return (
                          <figure
                            key={`${it.mediaUrl || it.imageUrl}-${i}`}
                            className="planner__thumb"
                          >
                            {it.mediaType === "video" ? (
                              <img
                                className="planner__img"
                                src={it.mediaPoster || ""}
                                alt="video poster"
                              />
                            ) : (
                              <img
                                className="planner__img planner__img--zoomable"
                                src={it.mediaThumb || it.mediaUrl}
                                alt={it.name || "item"}
                                title="Click to enlarge"
                                onClick={() => openLightbox(dayImgs, Math.max(0, imgIdx))}
                              />
                            )}
                            <button
                              className="planner__remove"
                              title="Remove"
                              onClick={() => removeFromDay(d, i)}
                            >
                              🗑️
                            </button>
                          </figure>
                        );
                      })
                    )}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
