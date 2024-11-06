import React, { useState, useEffect } from "react";
import { fetchImage } from "../../utils/CloudinaryAPI";
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
    const fetchItemsByPublicId = async () => {
      if (!selectedTab) return;

      setLoading(true);
      setError(null);

      try {
        const publicId = `closet-items/${selectedTab}`;
        const response = await fetchImage(publicId);

        if (response && !response.error) {
          setItems([
            // {
            //   imageUrl:
            //     response.secure_url ||
            //     "https://res.cloudinary.com/djoh2vfhd/image/upload/v1730849371/photo-1708397016786-8916880649b8_ryvylu.jpg",
            //   name: response.public_id || "Fallback Image",
            // },
          ]);
        } else {
          throw new Error(`Failed to fetch items for ${selectedTab}`);
        }
      } catch (error) {
        console.error("Error fetching closet items:", error);
        setError("Failed to load items.");
      } finally {
        setLoading(false);
      }
    };

    fetchItemsByPublicId();
  }, [selectedTab]);

  return (
    <div className="closet-tabs">
      <div className="closet-tabs__container fixed">
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
              <h3>{displayNames[selectedTab] || selectedTab}</h3>
            </div>
          ))}
      </div>
    </div>
  );
}

export default ClosetTabs;

