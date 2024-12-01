import React, { useState, useEffect } from "react";
import { fetchImagesByTag } from "../../utils/CloudinaryAPI";
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

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchItemsByTag = async () => {
      if (!selectedTab) return;

      setLoading(true);
      setError(null);

      try {
        const formattedTab = selectedTab.replace(/\s+/g, "-").toLowerCase();
        const fetchedImages = await fetchImagesByTag(formattedTab);

        if (fetchedImages && fetchedImages.length > 0) {
          setItems(fetchedImages);
        } else {
          setItems([]);
        }
      } catch (error) {
        console.error("Error fetching closet items:", error);
        setError("Failed to load items for this tab.");
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
            {displayNames[tab]}
          </button>
        ))}
      </div>

      <div className="closet-tabs__modal">
        {loading && <div className="preloader">Loading...</div>}
        {error && !loading && <p className="error-message">{error}</p>}
        {!loading && items.length === 0 && !error && (
          <p className="closet-tabs__no-items">
            No items found for this section.
          </p>
        )}

        {!loading && items.length > 0 && (
          <div className="closet-tabs__gallery">
            {items.map((item, index) => (
              <div key={item?.public_id || index} className="closet-tabs__item">
                {item?.secure_url && (
                  <img
                    src={item.secure_url}
                    alt={`Closet item ${index + 1}`}
                    className="closet-tabs__image"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ClosetTabs;
