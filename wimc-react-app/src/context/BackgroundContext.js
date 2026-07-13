import { syncSetItem } from '../utils/syncStore';
import React, { createContext, useContext, useState, useEffect, useRef } from "react";

const LS_KEY = "wimc_section_backgrounds";

const SECTIONS = [
  "dresses-skirts",
  "dress-shirts-suits",
  "shoes-sneakers",
  "pants-jeans",
  "tops",
  "bags-accessories",
  "jackets-coats",
  "blazers",
];

function load() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "{}");
  } catch {
    return {};
  }
}

const BackgroundContext = createContext(null);

export function BackgroundProvider({ children }) {
  const [backgrounds, setBackgrounds] = useState(load);
  // Skip the first persist so we never overwrite cloud data with the initial
  // (possibly empty) localStorage value before Firestore hydration completes.
  const skipPersist = useRef(true);

  // When SyncProvider finishes pulling cloud data into localStorage, re-read it
  // so the user's saved card backgrounds/colors are restored (after a deploy,
  // cache clear, or on a new device).
  useEffect(() => {
    const onHydrated = () => {
      const fromCloud = load();
      if (fromCloud && Object.keys(fromCloud).length > 0) {
        skipPersist.current = true; // don't echo this back as a user change
        setBackgrounds(fromCloud);
      }
    };
    window.addEventListener("wimc-hydrated", onHydrated);
    return () => window.removeEventListener("wimc-hydrated", onHydrated);
  }, []);

  useEffect(() => {
    if (skipPersist.current) {
      skipPersist.current = false;
      return;
    }
    try {
      syncSetItem(LS_KEY, JSON.stringify(backgrounds));
    } catch {}
  }, [backgrounds]);

  const setBackground = (section, url) => {
    setBackgrounds((prev) => ({ ...prev, [section]: url }));
  };

  const resetBackground = (section) => {
    setBackgrounds((prev) => {
      const next = { ...prev };
      delete next[section];
      return next;
    });
  };

  const resetAll = () => setBackgrounds({});

  const getBackground = (section) => backgrounds[section] || null;

  return (
    <BackgroundContext.Provider
      value={{
        backgrounds,
        setBackground,
        resetBackground,
        resetAll,
        getBackground,
        SECTIONS,
      }}
    >
      {children}
    </BackgroundContext.Provider>
  );
}

export function useBackground() {
  const ctx = useContext(BackgroundContext);
  if (!ctx)
    throw new Error("useBackground must be used within BackgroundProvider");
  return ctx;
}
