import React, { createContext, useContext, useState, useEffect } from "react";

const LS_KEY = "wimc_section_backgrounds";

const SECTIONS = [
  "dresses-skirts",
  "shoes-sneakers",
  "pants-jeans",
  "tops",
  "bags-accessories",
  "jackets-coats",
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

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(backgrounds));
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
