import React, { createContext, useContext, useState } from "react";

const ClosetContext = createContext(null);

export function ClosetProvider({ children }) {
  const [items, setItems] = useState([]); //closet items array

  function addItem(item) {
    setItems((prev) => [item, ...prev]);
  }
  function removeItem(id) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <ClosetContext.Provider value={{ items, addItem, removeItem }}>
      {children}
    </ClosetContext.Provider>
  );
}

export function useCloset() {
  const ctx = useContext(ClosetContext);
  if (!ctx) throw new Error("useCloset must be used within ClosetProvider");
  return ctx;
}
