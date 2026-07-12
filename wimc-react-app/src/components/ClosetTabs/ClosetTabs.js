import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./ClosetTabs.css";

// Unisex closet: 7 fixed tabs, same for everyone — no more gender toggle.
const TABS = [
  { tag: "dresses-skirts",      label: "Dresses/Skirts" },
  { tag: "dress-shirts-suits",  label: "Dress Shirts/Suits" },
  { tag: "shoes-sneakers",      label: "Shoes/Sneakers" },
  { tag: "pants-jeans",         label: "Pants/Jeans" },
  { tag: "tops",                label: "Tops" },
  { tag: "bags-accessories",    label: "Bags/Accessories" },
  { tag: "jackets-coats",       label: "Jackets/Coats" },
];

function ClosetTabs({ selectedTab, onSelectTab }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleTabClick = (tag) => {
    if (typeof onSelectTab === "function") onSelectTab(tag);
    if (location.pathname !== "/closet-data") navigate("/closet-data");
  };

  return (
    <section className="closet-tabs">
      <nav className="closet-tabs__container">
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
    </section>
  );
}

export default ClosetTabs;
