import React, { useState, useEffect, useRef } from "react";
import "./WeatherModal.css";

// ── WMO weather code lookup ───────────────────────────────────────────────────
const WMO_CODES = {
  0:  { label: "Clear sky",        icon: "☀️" },
  1:  { label: "Mainly clear",     icon: "🌤️" },
  2:  { label: "Partly cloudy",    icon: "⛅" },
  3:  { label: "Overcast",         icon: "☁️" },
  45: { label: "Fog",              icon: "🌫️" },
  48: { label: "Icy fog",          icon: "🌫️" },
  51: { label: "Light drizzle",    icon: "🌦️" },
  53: { label: "Drizzle",          icon: "🌦️" },
  55: { label: "Heavy drizzle",    icon: "🌧️" },
  61: { label: "Light rain",       icon: "🌧️" },
  63: { label: "Rain",             icon: "🌧️" },
  65: { label: "Heavy rain",       icon: "🌧️" },
  71: { label: "Light snow",       icon: "🌨️" },
  73: { label: "Snow",             icon: "❄️" },
  75: { label: "Heavy snow",       icon: "❄️" },
  80: { label: "Rain showers",     icon: "🌦️" },
  81: { label: "Rain showers",     icon: "🌧️" },
  82: { label: "Violent showers",  icon: "⛈️" },
  95: { label: "Thunderstorm",     icon: "⛈️" },
  99: { label: "Thunderstorm",     icon: "⛈️" },
};
function wmo(code) { return WMO_CODES[code] || { label: "Unknown", icon: "🌡️" }; }

const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ── Heat / Cold advisory ──────────────────────────────────────────────────────
function heatAdvisory(feelF) {
  if (feelF >= 125) return { level: "Extreme Danger",  color: "#ef4444", bg: "#450a0a", icon: "🚨" };
  if (feelF >= 103) return { level: "Danger",          color: "#f97316", bg: "#431407", icon: "🔴" };
  if (feelF >= 91)  return { level: "Extreme Caution", color: "#facc15", bg: "#422006", icon: "⚠️" };
  if (feelF >= 80)  return { level: "Caution",         color: "#fde047", bg: "#3b2800", icon: "⚡" };
  return null;
}
function coldAdvisory(feelF) {
  if (feelF <= 0)  return { level: "Extreme Cold",         color: "#93c5fd", bg: "#0c1a2e", icon: "🥶" };
  if (feelF <= 15) return { level: "Wind Chill Warning",   color: "#bfdbfe", bg: "#0c1a2e", icon: "❄️" };
  if (feelF <= 32) return { level: "Freezing Temperatures",color: "#e0f2fe", bg: "#0c1a2e", icon: "🌨️" };
  return null;
}

// ── Pollen level ──────────────────────────────────────────────────────────────
function pollenLevel(v) {
  if (v == null || v < 0)  return { label: "No Data",   dot: "⚫", color: "#64748b" };
  if (v === 0)             return { label: "None",      dot: "⚪", color: "#94a3b8" };
  if (v < 15)              return { label: "Low",       dot: "🟢", color: "#16a34a" };
  if (v < 50)              return { label: "Moderate",  dot: "🟡", color: "#ca8a04" };
  if (v < 100)             return { label: "High",      dot: "🟠", color: "#ea580c" };
  return                          { label: "Very High", dot: "🔴", color: "#dc2626" };
}

// ── Clothing suggestion ───────────────────────────────────────────────────────
function suggest(tempF) {
  if (tempF >= 85) return "🩳 Light clothing — shorts, tank tops, sandals";
  if (tempF >= 70) return "👕 Comfortable — t-shirt, light trousers";
  if (tempF >= 55) return "🧥 Light jacket or sweater recommended";
  if (tempF >= 40) return "🧣 Warm layers — jacket, scarf";
  return "🧤 Bundle up — heavy coat, gloves, hat";
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtHour(isoStr) {
  const h = new Date(isoStr).getHours();
  if (h === 0)  return "12am";
  if (h === 12) return "12pm";
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}
function getHourlyForDay(hr, dateStr) {
  return hr.time.reduce((acc, t, i) => {
    if (t.startsWith(dateStr)) {
      acc.push({
        time:   t,
        temp:   hr.temperature_2m[i],
        feel:   hr.apparent_temperature?.[i],
        code:   hr.weathercode[i],
        precip: hr.precipitation_probability[i],
      });
    }
    return acc;
  }, []);
}

// ── Alert severity color ──────────────────────────────────────────────────────
function alertColor(severity) {
  if (!severity) return { bg: "#1e293b", border: "#475569", text: "#e2e8f0" };
  const s = severity.toLowerCase();
  if (s === "extreme")  return { bg: "#450a0a", border: "#ef4444", text: "#fca5a5" };
  if (s === "severe")   return { bg: "#431407", border: "#f97316", text: "#fdba74" };
  if (s === "moderate") return { bg: "#422006", border: "#facc15", text: "#fef08a" };
  return                       { bg: "#1e2e3b", border: "#60a5fa", text: "#bfdbfe" };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function WeatherModal({ isOpen, onClose }) {
  const [status,       setStatus]       = useState("idle");
  const [errMsg,       setErrMsg]       = useState("");
  const [location,     setLocation]     = useState(null);
  const [weather,      setWeather]      = useState(null);
  const [pollen,       setPollen]       = useState(null);
  const [pollenDone,   setPollenDone]   = useState(false);  // true once pollen fetch settled
  const [alerts,       setAlerts]       = useState([]);
  const [alertsDone,   setAlertsDone]   = useState(false);  // true once alerts fetch settled
  const [isUSLocation, setIsUSLocation] = useState(false);
  const [selectedDay,  setSelectedDay]  = useState(null);

  const [searchInput,   setSearchInput]   = useState("");
  const [suggestions,   setSuggestions]   = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchErr,     setSearchErr]     = useState("");
  const searchTimerRef = useRef(null);
  const modalRef       = useRef(null);

  // ── Keyboard close ──
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // ── Reset on close ──
  useEffect(() => {
    if (!isOpen) {
      setSearchInput(""); setSuggestions([]); setSearchErr("");
      setSelectedDay(null);
    }
  }, [isOpen]);

  // ── Debounced Nominatim search ──
  useEffect(() => {
    if (!searchInput.trim()) { setSuggestions([]); return; }
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      setSearchLoading(true); setSearchErr("");
      try {
        const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchInput)}&format=json&limit=5&addressdetails=1`);
        const data = await res.json();
        setSuggestions(data.map((p) => ({
          label: p.display_name,
          city:  p.address?.city || p.address?.town || p.address?.village || p.address?.county || p.display_name.split(",")[0],
          lat:   parseFloat(p.lat),
          lon:   parseFloat(p.lon),
        })));
        if (!data.length) setSearchErr("No places found. Try a different search.");
      } catch { setSearchErr("Search failed. Please try again."); }
      finally  { setSearchLoading(false); }
    }, 400);
    return () => clearTimeout(searchTimerRef.current);
  }, [searchInput]);

  const resetSideData = () => {
    setPollen(null); setPollenDone(false);
    setAlerts([]); setAlertsDone(false); setIsUSLocation(false);
    setSelectedDay(null);
  };

  const selectSuggestion = (s) => {
    setLocation({ lat: s.lat, lon: s.lon, city: s.city });
    setWeather(null);
    resetSideData();
    setSearchInput(""); setSuggestions([]); setSearchErr("");
  };

  const resetToCurrentLocation = () => {
    setLocation(null); setWeather(null);
    resetSideData();
    setStatus("locating"); setSearchInput(""); setSuggestions([]);
  };

  // ── Auto-detect location on open ──
  useEffect(() => {
    if (!isOpen || location) return;
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        let city = "Your Location";
        try {
          const geo  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
          const geoD = await geo.json();
          city = geoD.address?.city || geoD.address?.town || geoD.address?.village || geoD.address?.county || "Your Location";
        } catch {}
        setLocation({ lat, lon, city });
      },
      () => { setStatus("error"); setErrMsg("Location access denied. Please enable location in your browser."); },
    );
  }, [isOpen, location]);

  // ── Fetch weather + pollen + alerts when location is ready ──
  useEffect(() => {
    if (!location) return;
    const { lat, lon } = location;
    setStatus("loading");

    // 1. Main weather forecast
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weathercode,windspeed_10m` +
      `&hourly=temperature_2m,apparent_temperature,weathercode,precipitation_probability` +
      `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,apparent_temperature_max` +
      `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto&forecast_days=7`,
    )
      .then((r) => r.json())
      .then((data) => { setWeather(data); setStatus("done"); })
      .catch(() => { setStatus("error"); setErrMsg("Failed to load weather data."); });

    // 2. Pollen — Open-Meteo air quality (best-effort; pollen coverage is primarily Europe)
    fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}` +
      `&hourly=grass_pollen,ragweed_pollen,birch_pollen&timezone=auto&forecast_days=1`,
    )
      .then((r) => r.json())
      .then((data) => { setPollen(data); setPollenDone(true); })
      .catch(() => { setPollenDone(true); });

    // 3. NWS severe weather alerts — US only
    const isUS = lat >= 18 && lat <= 72 && lon >= -168 && lon <= -66;
    setIsUSLocation(isUS);
    if (isUS) {
      fetch(`https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`, {
        headers: { Accept: "application/geo+json" },
      })
        .then((r) => r.json())
        .then((data) => { setAlerts(data.features || []); setAlertsDone(true); })
        .catch(() => { setAlertsDone(true); });
    } else {
      setAlertsDone(true); // non-US: mark done immediately so we can show "not available" msg
    }
  }, [location]);

  if (!isOpen) return null;

  const overlayClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
  };

  // ── Derive today's pollen values (noon reading, or first non-null) ──
  const todayPollen = (() => {
    if (!pollen?.hourly) return null;
    // prefer the noon reading; fall back to first entry
    const noonIdx = pollen.hourly.time.findIndex((t) => t.includes("T12:00"));
    const idx = noonIdx >= 0 ? noonIdx : 0;
    return {
      grass:   pollen.hourly.grass_pollen?.[idx]   ?? null,
      ragweed: pollen.hourly.ragweed_pollen?.[idx] ?? null,
      birch:   pollen.hourly.birch_pollen?.[idx]   ?? null,
    };
  })();

  // Pollen is "available" if at least one value came back non-null
  const pollenAvailable = todayPollen != null &&
    (todayPollen.grass != null || todayPollen.ragweed != null || todayPollen.birch != null);

  return (
    <div className="weather-overlay" onClick={overlayClick}>
      <div className="weather-modal" ref={modalRef} role="dialog" aria-label="Weather forecast">

        {/* Header */}
        <header className="weather-modal__head">
          <h2 className="weather-modal__title">
            🌤️ Weather {location ? `— ${location.city}` : ""}
          </h2>
          <button className="weather-modal__close" onClick={onClose} aria-label="Close">✕</button>
        </header>

        {/* Search */}
        <div className="weather-search">
          <div className="weather-search__row">
            <input
              className="weather-search__input"
              type="text"
              placeholder="🔍 Search another city or place…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search location"
            />
            {location && (
              <button className="weather-search__reset" onClick={resetToCurrentLocation} title="Back to my location">
                📍 My Location
              </button>
            )}
          </div>
          {searchLoading && <div className="weather-search__hint">Searching…</div>}
          {searchErr     && <div className="weather-search__err">{searchErr}</div>}
          {suggestions.length > 0 && (
            <ul className="weather-search__suggestions">
              {suggestions.map((s, i) => (
                <li key={i}>
                  <button className="weather-search__suggestion" onClick={() => selectSuggestion(s)}>
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Body */}
        <div className="weather-modal__body">
          {(status === "locating" || status === "loading") && (
            <div className="weather-modal__loading">
              {status === "locating" ? "📍 Detecting your location…" : "⛅ Loading forecast…"}
            </div>
          )}
          {status === "error" && <div className="weather-modal__error">{errMsg}</div>}

          {status === "done" && weather && (() => {
            const c  = weather.current;
            const hr = weather.hourly;
            const dy = weather.daily;
            const nowH = new Date().getHours();

            const tempF    = Math.round(c.temperature_2m);
            const feelF    = Math.round(c.apparent_temperature);
            const humidity = c.relative_humidity_2m;
            const wind     = Math.round(c.windspeed_10m);
            const todayWmo = wmo(c.weathercode);

            // Next-24h slice
            const startIdx   = hr.time.findIndex((t) => new Date(t).getHours() >= nowH);
            const hourSlice  = hr.time.slice(startIdx, startIdx + 24);
            const tempSlice  = hr.temperature_2m.slice(startIdx, startIdx + 24);
            const codeSlice  = hr.weathercode.slice(startIdx, startIdx + 24);
            const precipSlice = hr.precipitation_probability.slice(startIdx, startIdx + 24);

            const heatAdv = heatAdvisory(feelF);
            const coldAdv = coldAdvisory(feelF);
            const advisory = heatAdv || coldAdv;

            return (
              <>
                {/* ── Severe weather alerts — always shown when main data is ready ── */}
                <section className="weather-section weather-alerts-section">
                  <h3 className="weather-section__title">🚨 Severe Weather Alerts</h3>

                  {!alertsDone && (
                    <div className="weather-status-pill weather-status-pill--loading">Checking for alerts…</div>
                  )}

                  {alertsDone && !isUSLocation && (
                    <div className="weather-status-pill">
                      ℹ️ Live alerts are available for <strong>US locations</strong> only via the National Weather Service.
                    </div>
                  )}

                  {alertsDone && isUSLocation && alerts.length === 0 && (
                    <div className="weather-status-pill weather-status-pill--ok">
                      ✅ No active severe weather alerts for your area.
                    </div>
                  )}

                  {alertsDone && alerts.length > 0 && alerts.map((a, i) => {
                    const p   = a.properties || {};
                    const col = alertColor(p.severity);
                    return (
                      <details key={i} className="weather-alert" style={{ background: col.bg, borderColor: col.border }}>
                        <summary className="weather-alert__summary" style={{ color: col.text }}>
                          🚨 <strong>{p.event || "Weather Alert"}</strong>
                          {p.severity && <span className="weather-alert__sev"> · {p.severity}</span>}
                          <span className="weather-alert__expand-hint"> — tap to expand</span>
                        </summary>
                        <div className="weather-alert__body" style={{ color: col.text }}>
                          {p.headline && <p className="weather-alert__headline">{p.headline}</p>}
                          {p.description && (
                            <p className="weather-alert__desc">
                              {p.description.slice(0, 600)}{p.description.length > 600 ? "…" : ""}
                            </p>
                          )}
                          {p.expires && (
                            <p className="weather-alert__exp">
                              ⏱ Expires: {new Date(p.expires).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </details>
                    );
                  })}
                </section>

                {/* ── Today ── */}
                <section className="weather-today">
                  <div className="weather-today__icon">{todayWmo.icon}</div>
                  <div className="weather-today__info">
                    <div className="weather-today__temp">{tempF}°F</div>
                    <div className="weather-today__label">{todayWmo.label}</div>
                    <div className="weather-today__meta">
                      Feels like {feelF}°F &nbsp;·&nbsp; 💧 {humidity}% humidity &nbsp;·&nbsp; 💨 {wind} mph
                    </div>
                    <div className="weather-today__meta">
                      🌧️ Rain chance: {dy.precipitation_probability_max[0]}%
                    </div>
                  </div>
                  <div className="weather-today__suggest">{suggest(tempF)}</div>
                </section>

                {/* ── Heat / Cold advisory ── */}
                {advisory && (
                  <div className="weather-advisory" style={{ background: advisory.bg, borderColor: advisory.color }}>
                    <span className="weather-advisory__icon">{advisory.icon}</span>
                    <div>
                      <span className="weather-advisory__level" style={{ color: advisory.color }}>
                        {advisory.level}
                      </span>
                      <span className="weather-advisory__detail">
                        {heatAdv
                          ? ` — Feels like ${feelF}°F. Stay hydrated and limit outdoor exertion.`
                          : ` — Feels like ${feelF}°F. Dress warmly and limit exposure.`}
                      </span>
                    </div>
                  </div>
                )}

                {/* ── Pollen — always shown once fetch settles ── */}
                <section className="weather-section">
                  <h3 className="weather-section__title">🌿 Pollen Activity — Today</h3>

                  {!pollenDone && (
                    <div className="weather-status-pill weather-status-pill--loading">Loading pollen data…</div>
                  )}

                  {pollenDone && !pollenAvailable && (
                    <div className="weather-status-pill">
                      🌿 Pollen data is not available for your current location.
                    </div>
                  )}

                  {pollenDone && pollenAvailable && (
                    <div className="weather-pollen">
                      {[
                        { name: "Grass",   value: todayPollen.grass   },
                        { name: "Ragweed", value: todayPollen.ragweed },
                        { name: "Birch",   value: todayPollen.birch   },
                      ].map(({ name, value }) => {
                        const lvl = pollenLevel(value);
                        return (
                          <div key={name} className="weather-pollen-row">
                            <span className="weather-pollen-name">{name}</span>
                            <span className="weather-pollen-dot">{lvl.dot}</span>
                            <span className="weather-pollen-label" style={{ color: lvl.color }}>{lvl.label}</span>
                            {value != null && value > 0 && (
                              <span className="weather-pollen-val">{Math.round(value)} gr/m³</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* ── Hourly — next 24h ── */}
                <section className="weather-section">
                  <h3 className="weather-section__title">Hourly Forecast — Next 24h</h3>
                  <div className="weather-hourly">
                    {hourSlice.map((t, i) => (
                      <div key={t} className="weather-hour">
                        <div className="weather-hour__time">{fmtHour(t)}</div>
                        <div className="weather-hour__icon">{wmo(codeSlice[i]).icon}</div>
                        <div className="weather-hour__temp">{Math.round(tempSlice[i])}°</div>
                        <div className="weather-hour__precip">💧{precipSlice[i]}%</div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* ── 7-Day — click any day for full hourly ── */}
                <section className="weather-section">
                  <h3 className="weather-section__title">
                    7-Day Forecast
                  </h3>
                  <p className="weather-day-hint">👆 Click any day to see its full hour-by-hour forecast</p>
                  <div className="weather-daily">
                    {dy.time.map((t, i) => {
                      const d   = new Date(t + "T12:00:00");
                      const lbl = i === 0 ? "Today"
                        : i === 1 ? "Tomorrow"
                        : `${DAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}`;
                      const isExpanded = selectedDay === i;
                      const dayHours   = isExpanded ? getHourlyForDay(hr, t) : [];

                      return (
                        <div key={t} className={`weather-day-wrap${isExpanded ? " weather-day-wrap--open" : ""}`}>
                          <button
                            className={`weather-day${isExpanded ? " weather-day--active" : ""}`}
                            onClick={() => setSelectedDay(isExpanded ? null : i)}
                            aria-expanded={isExpanded}
                            aria-label={`${lbl} forecast — ${isExpanded ? "collapse" : "expand"} hourly detail`}
                          >
                            <div className="weather-day__label">{lbl}</div>
                            <div className="weather-day__icon">{wmo(dy.weathercode[i]).icon}</div>
                            <div className="weather-day__desc">{wmo(dy.weathercode[i]).label}</div>
                            <div className="weather-day__temps">
                              <span className="weather-day__high">{Math.round(dy.temperature_2m_max[i])}°</span>
                              <span className="weather-day__low">{Math.round(dy.temperature_2m_min[i])}°</span>
                            </div>
                            <div className="weather-day__precip">💧 {dy.precipitation_probability_max[i]}%</div>
                            <span className="weather-day__chevron" aria-hidden="true">
                              {isExpanded ? "▲" : "▼"}
                            </span>
                          </button>

                          {/* Per-day hourly accordion */}
                          {isExpanded && (
                            <div className="weather-day-detail">
                              <p className="weather-day-detail__heading">
                                {lbl} — Hour by Hour
                              </p>
                              <div className="weather-hourly weather-hourly--detail">
                                {dayHours.length === 0 ? (
                                  <p className="weather-day-detail__empty">No hourly data for this day.</p>
                                ) : dayHours.map((h) => {
                                  const fAdv = heatAdvisory(Math.round(h.feel ?? 999)) || coldAdvisory(Math.round(h.feel ?? 999));
                                  return (
                                    <div
                                      key={h.time}
                                      className="weather-hour weather-hour--detail"
                                      style={fAdv ? { borderColor: fAdv.color } : undefined}
                                    >
                                      <div className="weather-hour__time">{fmtHour(h.time)}</div>
                                      <div className="weather-hour__icon">{wmo(h.code).icon}</div>
                                      <div className="weather-hour__temp">{Math.round(h.temp)}°</div>
                                      {h.feel != null && (
                                        <div className="weather-hour__feel">feels {Math.round(h.feel)}°</div>
                                      )}
                                      <div className="weather-hour__precip">💧{h.precip}%</div>
                                      {fAdv && (
                                        <div className="weather-hour__adv" style={{ color: fAdv.color }} title={fAdv.level}>
                                          {fAdv.icon}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
