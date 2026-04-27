import React, { useState, useEffect, useRef } from "react";
import "./WeatherModal.css";

const WMO_CODES = {
  0: { label: "Clear sky", icon: "☀️" },
  1: { label: "Mainly clear", icon: "🌤️" },
  2: { label: "Partly cloudy", icon: "⛅" },
  3: { label: "Overcast", icon: "☁️" },
  45: { label: "Fog", icon: "🌫️" },
  48: { label: "Icy fog", icon: "🌫️" },
  51: { label: "Light drizzle", icon: "🌦️" },
  53: { label: "Drizzle", icon: "🌦️" },
  55: { label: "Heavy drizzle", icon: "🌧️" },
  61: { label: "Light rain", icon: "🌧️" },
  63: { label: "Rain", icon: "🌧️" },
  65: { label: "Heavy rain", icon: "🌧️" },
  71: { label: "Light snow", icon: "🌨️" },
  73: { label: "Snow", icon: "❄️" },
  75: { label: "Heavy snow", icon: "❄️" },
  80: { label: "Rain showers", icon: "🌦️" },
  81: { label: "Rain showers", icon: "🌧️" },
  82: { label: "Violent showers", icon: "⛈️" },
  95: { label: "Thunderstorm", icon: "⛈️" },
  99: { label: "Thunderstorm", icon: "⛈️" },
};

function wmo(code) {
  return WMO_CODES[code] || { label: "Unknown", icon: "🌡️" };
}

function fmtTemp(c) {
  return `${Math.round(c)}°F`;
}
function cToF(c) {
  return (c * 9) / 5 + 32;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function WeatherModal({ isOpen, onClose }) {
  const [status, setStatus] = useState("idle");
  const [errMsg, setErrMsg] = useState("");
  const [location, setLocation] = useState(null); // { lat, lon, city }
  const [weather, setWeather] = useState(null);

  // Location search
  const [searchInput, setSearchInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchErr, setSearchErr] = useState("");
  const searchTimerRef = useRef(null);

  const modalRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setSearchInput("");
      setSuggestions([]);
      setSearchErr("");
    }
  }, [isOpen]);

  // Debounced location search via Nominatim
  useEffect(() => {
    if (!searchInput.trim()) {
      setSuggestions([]);
      return;
    }
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      setSearchLoading(true);
      setSearchErr("");
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchInput)}&format=json&limit=5&addressdetails=1`,
        );
        const data = await res.json();
        setSuggestions(
          data.map((p) => ({
            label: p.display_name,
            city:
              p.address?.city ||
              p.address?.town ||
              p.address?.village ||
              p.address?.county ||
              p.display_name.split(",")[0],
            lat: parseFloat(p.lat),
            lon: parseFloat(p.lon),
          })),
        );
        if (!data.length)
          setSearchErr("No places found. Try a different search.");
      } catch {
        setSearchErr("Search failed. Please try again.");
      } finally {
        setSearchLoading(false);
      }
    }, 400);
    return () => clearTimeout(searchTimerRef.current);
  }, [searchInput]);

  const selectSuggestion = (s) => {
    setLocation({ lat: s.lat, lon: s.lon, city: s.city });
    setWeather(null);
    setSearchInput("");
    setSuggestions([]);
    setSearchErr("");
  };

  const resetToCurrentLocation = () => {
    setLocation(null);
    setWeather(null);
    setStatus("locating");
    setSearchInput("");
    setSuggestions([]);
  };

  // Auto-detect location when modal opens
  useEffect(() => {
    if (!isOpen || location) return;
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        // Reverse geocode with Open-Meteo's free endpoint
        let city = "Your Location";
        try {
          const geo = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
          );
          const geoData = await geo.json();
          city =
            geoData.address?.city ||
            geoData.address?.town ||
            geoData.address?.village ||
            geoData.address?.county ||
            "Your Location";
        } catch {}
        setLocation({ lat, lon, city });
      },
      () => {
        setStatus("error");
        setErrMsg(
          "Location access denied. Please enable location in your browser.",
        );
      },
    );
  }, [isOpen, location]);

  // Fetch weather when location is ready
  useEffect(() => {
    if (!location) return;
    setStatus("loading");
    const { lat, lon } = location;
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weathercode,windspeed_10m` +
        `&hourly=temperature_2m,weathercode,precipitation_probability` +
        `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
        `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto&forecast_days=7`,
    )
      .then((r) => r.json())
      .then((data) => {
        setWeather(data);
        setStatus("done");
      })
      .catch(() => {
        setStatus("error");
        setErrMsg("Failed to load weather data.");
      });
  }, [location]);

  if (!isOpen) return null;

  const overlayClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
  };

  // ---- Clothing suggestion based on current temp ----
  const suggest = (tempF) => {
    if (tempF >= 85) return "🩳 Light clothing — shorts, tank tops, sandals";
    if (tempF >= 70) return "👕 Comfortable — t-shirt, light trousers";
    if (tempF >= 55) return "🧥 Light jacket or sweater recommended";
    if (tempF >= 40) return "🧣 Warm layers — jacket, scarf";
    return "🧤 Bundle up — heavy coat, gloves, hat";
  };

  return (
    <div className="weather-overlay" onClick={overlayClick}>
      <div
        className="weather-modal"
        ref={modalRef}
        role="dialog"
        aria-label="Weather forecast"
      >
        <header className="weather-modal__head">
          <h2 className="weather-modal__title">
            🌤️ Weather {location ? `— ${location.city}` : ""}
          </h2>
          <button
            className="weather-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        {/* ✅ Location search bar */}
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
              <button
                className="weather-search__reset"
                onClick={resetToCurrentLocation}
                title="Back to my location"
              >
                📍 My Location
              </button>
            )}
          </div>
          {searchLoading && (
            <div className="weather-search__hint">Searching…</div>
          )}
          {searchErr && <div className="weather-search__err">{searchErr}</div>}
          {suggestions.length > 0 && (
            <ul className="weather-search__suggestions">
              {suggestions.map((s, i) => (
                <li key={i}>
                  <button
                    className="weather-search__suggestion"
                    onClick={() => selectSuggestion(s)}
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="weather-modal__body">
          {(status === "locating" || status === "loading") && (
            <div className="weather-modal__loading">
              {status === "locating"
                ? "📍 Detecting your location…"
                : "⛅ Loading forecast…"}
            </div>
          )}

          {status === "error" && (
            <div className="weather-modal__error">{errMsg}</div>
          )}

          {status === "done" &&
            weather &&
            (() => {
              const c = weather.current;
              const hr = weather.hourly;
              const dy = weather.daily;
              const now = new Date();
              const nowH = now.getHours();

              // Today card
              const tempF = Math.round(c.temperature_2m);
              const feelF = Math.round(c.apparent_temperature);
              const humidity = c.relative_humidity_2m;
              const wind = Math.round(c.windspeed_10m);
              const todayWmo = wmo(c.weathercode);

              // Hourly — next 24h starting from current hour
              const startIdx = hr.time.findIndex((t) => {
                const h = new Date(t).getHours();
                return h >= nowH;
              });
              const hourSlice = hr.time.slice(startIdx, startIdx + 24);
              const tempSlice = hr.temperature_2m.slice(
                startIdx,
                startIdx + 24,
              );
              const codeSlice = hr.weathercode.slice(startIdx, startIdx + 24);
              const precipSlice = hr.precipitation_probability.slice(
                startIdx,
                startIdx + 24,
              );

              return (
                <>
                  {/* TODAY */}
                  <section className="weather-today">
                    <div className="weather-today__icon">{todayWmo.icon}</div>
                    <div className="weather-today__info">
                      <div className="weather-today__temp">{tempF}°F</div>
                      <div className="weather-today__label">
                        {todayWmo.label}
                      </div>
                      <div className="weather-today__meta">
                        Feels like {feelF}°F &nbsp;·&nbsp; 💧 {humidity}%
                        humidity &nbsp;·&nbsp; 💨 {wind} mph
                      </div>
                      <div className="weather-today__meta">
                        🌧️ Rain chance: {dy.precipitation_probability_max[0]}%
                      </div>
                    </div>
                    <div className="weather-today__suggest">
                      {suggest(tempF)}
                    </div>
                  </section>

                  {/* HOURLY */}
                  <section className="weather-section">
                    <h3 className="weather-section__title">Hourly Forecast</h3>
                    <div className="weather-hourly">
                      {hourSlice.map((t, i) => {
                        const d = new Date(t);
                        const h = d.getHours();
                        const label =
                          h === 0
                            ? "12am"
                            : h < 12
                              ? `${h}am`
                              : h === 12
                                ? "12pm"
                                : `${h - 12}pm`;
                        return (
                          <div key={t} className="weather-hour">
                            <div className="weather-hour__time">{label}</div>
                            <div className="weather-hour__icon">
                              {wmo(codeSlice[i]).icon}
                            </div>
                            <div className="weather-hour__temp">
                              {Math.round(tempSlice[i])}°
                            </div>
                            <div className="weather-hour__precip">
                              💧{precipSlice[i]}%
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {/* 7-DAY */}
                  <section className="weather-section">
                    <h3 className="weather-section__title">7-Day Forecast</h3>
                    <div className="weather-daily">
                      {dy.time.map((t, i) => {
                        const d = new Date(t + "T12:00:00");
                        const lbl =
                          i === 0
                            ? "Today"
                            : i === 1
                              ? "Tomorrow"
                              : `${DAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}`;
                        return (
                          <div key={t} className="weather-day">
                            <div className="weather-day__label">{lbl}</div>
                            <div className="weather-day__icon">
                              {wmo(dy.weathercode[i]).icon}
                            </div>
                            <div className="weather-day__desc">
                              {wmo(dy.weathercode[i]).label}
                            </div>
                            <div className="weather-day__temps">
                              <span className="weather-day__high">
                                {Math.round(dy.temperature_2m_max[i])}°
                              </span>
                              <span className="weather-day__low">
                                {Math.round(dy.temperature_2m_min[i])}°
                              </span>
                            </div>
                            <div className="weather-day__precip">
                              💧 {dy.precipitation_probability_max[i]}%
                            </div>
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
