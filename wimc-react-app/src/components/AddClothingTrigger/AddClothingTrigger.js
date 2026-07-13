import React from "react";
import "./AddClothingTrigger.css";

// Sits in the left sidebar next to Outfit of the Day / Travel Pack. Reuses
// the closet-door look Outfit Preview used to show while collapsed — always
// "closed," since clicking it just opens the AddClothingModal rather than
// expanding inline like the other panels.
export default function AddClothingTrigger({ onOpen }) {
  return (
    <section className="act-panel" aria-label="Add New Clothing Item">
      <header className="act__header">
        <h3 className="act__title">Add New Clothing Item</h3>
      </header>
      <div className="act__closed">
        <div className="act__doors">
          <div className="act__door act__door--left" />
          <div className="act__door act__door--right" />
        </div>
        <button className="act__cta" onClick={onOpen}>
          Add New Clothing Item
        </button>
      </div>
    </section>
  );
}
