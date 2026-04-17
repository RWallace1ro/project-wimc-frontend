import React, { useEffect, useRef, useState } from "react";
import {
  fetchImagesByTag,
  fetchVideosByTag,
  uploadRawJSON,
  videoPoster,
} from "../../utils/CloudinaryAPI";
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
}) {
  const [collapsed, setCollapsed] = useState(true);
  const [floating, setFloating] = useState(false);
  const [doors, setDoors] = useState({ opening: false, armed: false });

  const [packPlan, setPackPlan] = useState(emptyPlan());
  const [selectedDay, setSelectedDay] = useState("Friday");

  // text + inline picker
  const [textItem, setTextItem] = useState("");
  const [pickerSection, setPickerSection] = useState(SECTION_OPTIONS[0].value);
  const [choices, setChoices] = useState([]);
  const [choicesLoading, setChoicesLoading] = useState(false);
  const [choicesError, setChoicesError] = useState("");

  // export (week + day)
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareError, setShareError] = useState("");
  const [daySharing, setDaySharing] = useState(false);
  const [dayShareUrl, setDayShareUrl] = useState("");
  const [dayShareError, setDayShareError] = useState("");

  const hydratedRef = useRef(false);

  // load persisted (migrate from legacy) once
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    try {
      const v2 = JSON.parse(localStorage.getItem(LS_KEY) || "null");
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
  }, [selectedDay]);

  // persist on change
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(packPlan));
    } catch {}
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

  // add items
  function addTextItem() {
    const v = textItem.trim();
    if (!v) return;
    setPackPlan((prev) => ({
      ...prev,
      [selectedDay]: [...prev[selectedDay], { name: v, kind: "text" }],
    }));
    setTextItem("");
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

  // sync to planner (selected day)
  function syncToPlanner() {
    if (!onSyncToPlanner) return;
    onSyncToPlanner(selectedDay, packPlan[selectedDay]);
  }

  // export pack (all days)
  async function exportPack() {
    setSharing(true);
    setShareUrl("");
    setShareError("");
    try {
      const payload = {
        kind: "wimc.travelPack",
        version: 1,
        createdAt: new Date().toISOString(),
        days: packPlan,
      };
      const res = await uploadRawJSON(payload, "wimc/travel-packs");
      if (res?.secure_url) setShareUrl(res.secure_url);
      else setShareError("Export failed (no URL returned).");
    } catch (e) {
      console.error(e);
      setShareError("Export failed. Please try again.");
    } finally {
      setSharing(false);
    }
  }
  async function copyPackUrl() {
    try {
      if (shareUrl) await navigator.clipboard.writeText(shareUrl);
    } catch {}
  }

  // export a single day
  async function exportPackDay(day) {
    setDaySharing(true);
    setDayShareError("");
    setDayShareUrl("");
    try {
      const payload = {
        kind: "wimc.travelPackDay",
        version: 1,
        createdAt: new Date().toISOString(),
        day,
        items: packPlan[day],
      };
      const res = await uploadRawJSON(payload, "wimc/travel-pack-days");
      if (res?.secure_url) setDayShareUrl(res.secure_url);
      else setDayShareError("Day export failed (no URL returned).");
    } catch (e) {
      console.error(e);
      setDayShareError("Day export failed. Please try again.");
    } finally {
      setDaySharing(false);
    }
  }
  async function copyPackDayUrl() {
    try {
      if (dayShareUrl) await navigator.clipboard.writeText(dayShareUrl);
    } catch {}
  }

  // inline picker load
  useEffect(() => {
    let ignore = false;
    async function loadChoices() {
      if (!floating || doors.opening || !pickerSection) return;
      setChoicesLoading(true);
      setChoicesError("");
      try {
        const imgs = await fetchImagesByTag(pickerSection);
        const vids = await fetchVideosByTag(pickerSection);
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
          <div>
            <button className="tp__toggle" onClick={collapsed ? open : close}>
              {collapsed ? "Open" : "Minimize"}
            </button>
          </div>
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
            {/* Export controls INSIDE the open panel */}
            <div className="tp__exportbar">
              <button
                className="tp__toggle"
                onClick={exportPack}
                disabled={sharing}
              >
                {sharing ? "Exporting…" : "Export Pack"}
              </button>
              <label style={{ marginLeft: 8 }}>
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
                className="tp__toggle"
                onClick={() => exportPackDay(selectedDay)}
                disabled={
                  daySharing || (packPlan[selectedDay]?.length || 0) === 0
                }
                title={`Export ${selectedDay} only`}
              >
                {daySharing ? "Exporting…" : `Export ${selectedDay}`}
              </button>
            </div>

            {(shareUrl || shareError) && (
              <div className="tp__share">
                {shareUrl ? (
                  <>
                    <a
                      className="tp__share-link"
                      href={shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View travel pack
                    </a>
                    <button className="tp__btn" onClick={copyPackUrl}>
                      Copy link
                    </button>
                  </>
                ) : (
                  <span className="tp__error">{shareError}</span>
                )}
              </div>
            )}
            {(dayShareUrl || dayShareError) && (
              <div className="tp__share">
                {dayShareUrl ? (
                  <>
                    <a
                      className="tp__share-link"
                      href={dayShareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View {selectedDay}
                    </a>
                    <button className="tp__btn" onClick={copyPackDayUrl}>
                      Copy link
                    </button>
                  </>
                ) : (
                  <span className="tp__error">{dayShareError}</span>
                )}
              </div>
            )}

            <div className="tp__row" style={{ alignItems: "center" }}>
              <label>
                Pack for day:{" "}
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
              <button onClick={addTextItem}>Add</button>
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
                      {it.mediaType === "video" ? (
                        <img
                          className="tp__choice-img"
                          src={it.mediaPoster || ""}
                          alt="video"
                        />
                      ) : (
                        <img
                          className="tp__choice-img"
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
            <div className="tp__grid-week">
              {DAYS.map((d) => (
                <section key={d} className="tp__day">
                  <header className="tp__daytop">
                    <h4>{d}</h4>
                    <div style={{ display: "flex", gap: 6 }}>
                      {d === selectedDay && (
                        <span className="tp__badge">Selected</span>
                      )}
                      <button
                        className="tp__mini"
                        title="Clear day"
                        onClick={() =>
                          setPackPlan((prev) => ({ ...prev, [d]: [] }))
                        }
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
                            ×
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
                title="Copy this pack day into the Planner’s same day"
              >
                Sync to Planner
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
