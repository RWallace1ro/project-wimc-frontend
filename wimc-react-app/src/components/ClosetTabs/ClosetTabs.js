import React, { useState, useEffect } from "react";
import "./ClosetTabs.css";

function ClosetTabs({ selectedTab, onSelectTab }) {
  const tabs = [
    "Dresses/Skirts",
    "Shoes/Sneakers",
    "Pants/Jeans",
    "Tops",
    "Bags",
    "Jackets/Coats",
  ];

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchItemsByTag = async () => {
      if (!selectedTab) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `https://res.cloudinary.com/${process.env.REACT_APP_CLOUD_NAME}/image/list/${selectedTab}.json`
        );

        if (!response.ok) {
          throw new Error(`Error fetching items for ${selectedTab}`);
        }

        const data = await response.json();

        const itemsList = data.resources.map((item) => ({
          imageUrl: item.secure_url,
          name: item.public_id,
        }));

        setItems(itemsList);
      } catch (error) {
        console.error("Error fetching closet items:", error);
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    fetchItemsByTag();
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

      {!loading && error && <p className="error-message">{error}</p>}

      <div className="closet-tabs__items">
        {!loading &&
          items.length > 0 &&
          items.map((item, index) => (
            <div key={index} className="closet-tabs__item">
              <img
                src={item.imageUrl}
                alt={item.name}
                className="closet-tabs__image"
              />
              <h3>{item.name}</h3>
            </div>
          ))}
      </div>
    </div>
  );
}

export default ClosetTabs;
