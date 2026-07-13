import React, { useCallback, useState } from "react";
import "./AddClothingTrigger.css";

const DOOR_MS = 3000;

// Sits in the left sidebar next to Outfit of the Day / Travel Pack. Reuses
// the closet-door look Outfit Preview shows while opening — clicking plays
// the same door-slide animation, then opens the AddClothingModal once it
// finishes (matching Outfit of the Day's open transition).
export default function AddClothingTrigger({ onOpen }) {
  const [opening, setOpening] = useState(false);
  const [doorsArmed, setDoorsArmed] = useState(false);

  const startOpen = useCallback(() => {
    if (opening) return;
    setOpening(true);
    setDoorsArmed(false);
    requestAnimationFrame(() => setDoorsArmed(true));
    setTimeout(() => {
      setOpening(false);
      setDoorsArmed(false);
      onOpen?.();
    }, DOOR_MS);
  }, [opening, onOpen]);

  return (
    <section className="act-panel" aria-label="Add New Clothing Item">
      <header className="act__header">
        <h3 className="act__title">Add New Clothing Item</h3>
      </header>
      <div className={"act__closed" + (opening ? " act__closed--animating" : "")}>
        <div className={"act__doors" + (doorsArmed ? " act__doors--open" : "")}>
          <div className="act__door act__door--left" />
          <div className="act__door act__door--right" />
        </div>
        {!opening && (
          <button className="act__cta" onClick={startOpen}>
            Add New Clothing Item
          </button>
        )}
      </div>
    </section>
  );
}
