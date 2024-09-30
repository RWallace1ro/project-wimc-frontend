import React, { useState, useEffect } from "react";
import { fetchClosetItems } from "../../utils/CloudinaryAPI";
import "./ClosetTabs.css";

function ClosetTabs({ selectedTab, onSelectTab }) {
  const tabs = [
    "Evening Wear",
    "Shoes",
    "Pants/Jeans",
    "Tops",
    "Bags",
    "Jackets/Coats",
  ];

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);

  useEffect(() => {
    setLoading(true);
    fetchClosetItems(selectedTab)
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching closet items:", error);
        setLoading(false);
      });
  }, [selectedTab]);

  return (
    <div className="closet-tabs">
      <div className="closet-tabs__container">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`closet-tabs__tab ${
              selectedTab === tab ? "active" : ""
            }`}
            onClick={() => onSelectTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading && <div className="preloader">Loading...</div>}

      <div className="closet-tabs__items">
        {!loading && items.length > 0
          ? items.map((item, index) => (
              <div key={index} className="closet-tabs__item">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="closet-tabs__image"
                />
                <h3>{item.name}</h3>
              </div>
            ))
          : !loading && <p>No items found.</p>}
      </div>
    </div>
  );
}

export default ClosetTabs;
