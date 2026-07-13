import React, { useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ScrollHintArrows from "../common/ScrollHintArrows";
import "./ClosetTabs.css";

// Unisex closet: 8 fixed tabs, same for everyone — no more gender toggle.
const TABS = [
  { tag: "dresses-skirts",      label: "Dresses/Skirts" },
  { tag: "dress-shirts-suits",  label: "Dress Shirts/Suits" },
  { tag: "shoes-sneakers",      label: "Shoes/Sneakers" },
  { tag: "pants-jeans",         label: "Pants/Jeans" },
  { tag: "tops",                label: "Tops" },
  { tag: "bags-accessories",    label: "Bags/Accessories" },
  { tag: "jackets-coats",       label: "Jackets/Coats" },
  { tag: "blazers",             label: "Blazers" },
];

function ClosetTabs({ selectedTab, onSelectTab }) {
  const navigate = useNavigate();
  const location = useLocation();
  const scrollRef = useRef(null);

  const handleTabClick = (tag) => {
    if (typeof onSelectTab === "function") onSelectTab(tag);
    if (location.pathname !== "/closet-data") navigate("/closet-data");
  };

  return (
    <section className="closet-tabs">
      <nav className="closet-tabs__container" ref={scrollRef}>
        {TABS.map(({ tag, label }) => (
          <button
            key={tag}
            className={`closet-tabs__tab ${selectedTab === tag ? "active" : ""}`}
            onClick={() => handleTabClick(tag)}
            aria-label={`Select ${label}`}
          >
            {label}
          </button>
        ))}
      </nav>
      <ScrollHintArrows scrollRef={scrollRef} />
    </section>
  );
}

export default ClosetTabs;
