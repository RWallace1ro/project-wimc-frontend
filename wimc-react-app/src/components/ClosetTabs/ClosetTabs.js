import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./ClosetTabs.css";

const CLOSET_GENDER_KEY = "wimc_closet_gender";

// Build the gender-aware tab list. Male sections use a "male-" tag prefix so
// they map to the same gender-specific Cloudinary tags the closet cards use.
function getTabs(gender) {
  const p = gender === "male" ? "male-" : "";
  const first =
    gender === "male"
      ? { tag: "male-dress-shirts-suits", label: "Dress Shirts/Suits" }
      : { tag: "dresses-skirts", label: "Dresses/Skirts" };
  return [
    first,
    { tag: `${p}shoes-sneakers`,   label: "Shoes/Sneakers" },
    { tag: `${p}pants-jeans`,      label: "Pants/Jeans" },
    { tag: `${p}tops`,             label: "Tops" },
    { tag: `${p}bags-accessories`, label: "Bags/Accessories" },
    { tag: `${p}jackets-coats`,    label: "Jackets/Coats" },
  ];
}

function ClosetTabs({ selectedTab, onSelectTab }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [gender, setGender] = useState(
    () => localStorage.getItem(CLOSET_GENDER_KEY) || "female"
  );

  // Keep tabs in sync when the gender toggle changes (same tab or another)
  useEffect(() => {
    const sync = () =>
      setGender(localStorage.getItem(CLOSET_GENDER_KEY) || "female");
    window.addEventListener("wimc-gender-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("wimc-gender-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const tabs = getTabs(gender);

  const handleTabClick = (tag) => {
    if (typeof onSelectTab === "function") onSelectTab(tag);
    if (location.pathname !== "/closet-data") navigate("/closet-data");
  };

  return (
    <section className="closet-tabs">
      <nav className="closet-tabs__container">
        {tabs.map(({ tag, label }) => (
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
