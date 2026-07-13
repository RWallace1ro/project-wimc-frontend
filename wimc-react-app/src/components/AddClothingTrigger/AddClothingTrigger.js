import React, { useCallback, useState } from "react";
import "./AddClothingTrigger.css";

const DOOR_MS = 3000;

// Sits in the left sidebar next to Outfit of the Day / Travel Pack. Clicking
// pops a centered, floating door panel (same position/size treatment as
// Outfit of the Day's floating state) that plays the door-slide-open
// animation, then hands off straight to the AddClothingModal the instant it
// finishes — so nothing "snaps" and no door is still visibly closing once
// the real modal is on screen.
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
    <>
      {opening && <div className="act-backdrop" />}
      {opening && (
        <section className="act-panel act--floating" aria-label="Add New Clothing Item">
          <header className="act__header">
            <h3 className="act__title">Add New Clothing Item</h3>
          </header>
          <div className="act__closed act__closed--animating">
            <div className={"act__doors" + (doorsArmed ? " act__doors--open" : "")}>
              <div className="act__door act__door--left" />
              <div className="act__door act__door--right" />
            </div>
          </div>
        </section>
      )}

      <section className="act-panel" aria-label="Add New Clothing Item">
        <header className="act__header">
          <h3 className="act__title">Add New Clothing Item</h3>
        </header>
        <div className="act__closed">
          <div className="act__doors">
            <div className="act__door act__door--left" />
            <div className="act__door act__door--right" />
          </div>
          <button className="act__cta" onClick={startOpen}>
            Add New Clothing Item
          </button>
        </div>
      </section>
    </>
  );
}
