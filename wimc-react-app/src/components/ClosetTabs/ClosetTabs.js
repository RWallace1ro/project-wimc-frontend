import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./ClosetTabs.css";

function ClosetTabs({ selectedTab, onSelectTab }) {
  const tabs = [
    "dresses-skirts",
    "shoes-sneakers",
    "pants-jeans",
    "tops",
    "bags-accessories",
    "jackets-coats",
  ];

  const displayNames = {
    "dresses-skirts": "Dresses/Skirts",
    "shoes-sneakers": "Shoes/Sneakers",
    "pants-jeans": "Pants/Jeans",
    tops: "Tops",
    "bags-accessories": "Bags/Accessories",
    "jackets-coats": "Jackets/Coats",
  };

  const navigate = useNavigate();
  const location = useLocation();

  const handleTabClick = (tab) => {
    console.log("[ClosetTabs] Tab clicked:", tab);
    console.log("[ClosetTabs] onSelectTab is:", typeof onSelectTab);
    console.log("[ClosetTabs] Current path:", location.pathname);

    if (typeof onSelectTab === "function") {
      onSelectTab(tab);
      console.log("[ClosetTabs] onSelectTab called with:", tab);
    } else {
      console.warn(
        "[ClosetTabs] onSelectTab is NOT a function — prop not passed correctly",
      );
    }

    if (location.pathname !== "/closet-data") {
      console.log("[ClosetTabs] Navigating to /closet-data");
      navigate("/closet-data");
    } else {
      console.log(
        "[ClosetTabs] Already on /closet-data — no navigation needed",
      );
    }
  };

  return (
    <section className="closet-tabs">
      <nav className="closet-tabs__container">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`closet-tabs__tab ${selectedTab === tab ? "active" : ""}`}
            onClick={() => handleTabClick(tab)}
            aria-label={`Select ${displayNames[tab]}`}
          >
            {displayNames[tab]}
          </button>
        ))}
      </nav>
    </section>
  );
}

export default ClosetTabs;
