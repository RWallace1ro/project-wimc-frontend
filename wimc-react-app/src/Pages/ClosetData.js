import React, { useState, useEffect } from "react";
import ClosetSectionCard from "../components/ClosetSectionCard/ClosetSectionCard";
import ClosetSectionModal from "../components/ClosetSectionModal/ClosetSectionModal";
import DonateBin from "../components/DonateBin/DonateBin";
import WishList from "../components/WishList/WishList";
import ChangeUserInfoModal from "../components/ChangeUserInfoModal/ChangeUserInfoModal";
import AddClothingModal from "../components/AddClothingModal/AddClothingModal";
import { fetchImagesByTag } from "../utils/CloudinaryAPI";
import { fetchVideosByTag } from "../utils/CloudinaryAPI";
import VideoBin from "../components/VideoBin/VideoBin";
import OutfitPreviewPanel from "../components/OutfitPreviewPanel/OutfitPreviewPanel";
import OutfitPlanner from "../components/OutfitPlanner/OutfitPlanner";
import TravelPackPanel from "../components/TravelPackPanel/TravelPackPanel";
import "./ClosetData.css";

import dressesSkirtsImg from "../assets/images/dresses-skirts.jpg";
import shoesSneakersImg from "../assets/images/shoes-sneakers.jpg";
import pantsJeansImg from "../assets/images/pants-jeans.jpg";
import topsImg from "../assets/images/tops.jpg";
import bagsAccessoriesImg from "../assets/images/bags-accessories.jpg";
import jacketsCoatsImg from "../assets/images/jackets-coats.jpg";

const sectionTagToDisplayName = {
  "dresses-skirts": "Dresses/Skirts",
  "shoes-sneakers": "Shoes/Sneakers",
  "pants-jeans": "Pants/Jeans",
  tops: "Tops",
  "bags-accessories": "Bags/Accessories",
  "jackets-coats": "Jackets/Coats",
};

const closetSections = [
  {
    name: "dresses-skirts",
    tag: "dresses-skirts",
    placeholderUrl: dressesSkirtsImg,
  },
  {
    name: "shoes-sneakers",
    tag: "shoes-sneakers",
    placeholderUrl: shoesSneakersImg,
  },
  { name: "pants-jeans", tag: "pants-jeans", placeholderUrl: pantsJeansImg },
  { name: "tops", tag: "tops", placeholderUrl: topsImg },
  {
    name: "bags-accessories",
    tag: "bags-accessories",
    placeholderUrl: bagsAccessoriesImg,
  },
  {
    name: "jackets-coats",
    tag: "jackets-coats",
    placeholderUrl: jacketsCoatsImg,
  },
];

const defaultWeekPlan = {
  Monday: [],
  Tuesday: [],
  Wednesday: [],
  Thursday: [],
  Friday: [],
  Saturday: [],
  Sunday: [],
};

function ClosetData({ selectedTab, isLoggedIn }) {
  const [previewSelection, setPreviewSelection] = useState([]);
  const [closetItems, setClosetItems] = useState([]);
  const [sectionVideos, setSectionVideos] = useState([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState(selectedTab || null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [weekPlan, setWeekPlan] = useState({
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: [],
  });

  // Small merge util (dedupe by mediaUrl/imageUrl/name blob)
  const mergeDayItems = (existing = [], incoming = []) => {
    const out = [...existing];
    const seen = new Set(
      existing.map(
        (it) => it.mediaUrl || it.imageUrl || it.name || JSON.stringify(it),
      ),
    );
    for (const it of incoming) {
      const key = it.mediaUrl || it.imageUrl || it.name || JSON.stringify(it);
      if (!seen.has(key)) {
        seen.add(key);
        out.push(it);
      }
    }
    return out;
  };

  const handleSyncToPlanner = (day, items) => {
    setWeekPlan((prev) => ({
      ...prev,
      [day]: mergeDayItems(prev[day], items || []),
    }));
  };

  const openAddForSection = (tag) => {
    setIsModalOpen(false);

    setSelectedSection(tag);

    setIsAddModalOpen(true);
  };

  const fetchSectionItems = async (tag) => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedImages = await fetchImagesByTag(tag);
      console.log("Fetched Images:", fetchedImages);
      setClosetItems(fetchedImages || []);

      const fetchedVideos = await fetchVideosByTag(tag);
      console.log("Fetched Videos:", fetchedVideos);
      setSectionVideos(fetchedVideos || []);
    } catch (err) {
      console.error("Error fetching closet items:", err);
      setError("Failed to load closet items.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn && selectedTab) {
      setSelectedSection(selectedTab);
      fetchSectionItems(selectedTab);
    }
  }, [isLoggedIn, selectedTab]);

  const handleCardClick = (section) => {
    setSelectedSection(section);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedSection("");
  };

  const resetModals = () => {
    setIsModalOpen(false);
    setIsUserModalOpen(false);
    setIsAddModalOpen(false);
    setSelectedSection(null);
  };

  const handleAddClothing = (newClothingItem) => {
    if (newClothingItem?.mediaType === "video") {
      setSectionVideos((prev) => [...prev, newClothingItem]);
    } else {
      if (typeof newClothingItem === "string") {
        setClosetItems((prev) => [...prev, newClothingItem]);
      } else {
        const url =
          newClothingItem.mediaThumb ||
          newClothingItem.mediaUrl ||
          newClothingItem.imageUrl ||
          "";
        if (url) setClosetItems((prev) => [...prev, url]);
      }
    }
    setIsAddModalOpen(false);
  };

  const updateUser = (updatedUser) => {
    console.log("User updated:", updatedUser);
    setIsUserModalOpen(false);
  };

  return (
    <main className="closet-data-page">
      <header className="closet-data__header-actions">
        <button
          onClick={() => {
            resetModals();
            setIsAddModalOpen(true);
          }}
          className="add-clothing-button"
        >
          Add New Clothing Item
        </button>
        <button
          onClick={() => {
            resetModals();
            setIsUserModalOpen(true);
          }}
          className="change-user-info-button"
        >
          Change User Info
        </button>
      </header>
      {error && <p className="error-message">{error}</p>}
      {isLoading && <p className="loading-message">Loading...</p>}

      <section className="closet-data">
        <aside className="closet-data__side-left">
          <OutfitPreviewPanel onSelectionChange={setPreviewSelection} />

          <aside className="closet-data__side-container">
            <OutfitPlanner
              weekPlan={weekPlan}
              onChange={setWeekPlan}
              currentPreview={previewSelection}
            />

            <TravelPackPanel
              currentPreview={previewSelection}
              onSyncToPlanner={(day, items, handleSyncToPlanner) => {
                setWeekPlan((prev) => {
                  const uniq = (arr) => {
                    const seen = new Set();
                    return arr.filter((it) => {
                      const key =
                        it.mediaUrl || it.imageUrl || JSON.stringify(it);
                      if (seen.has(key)) return false;
                      seen.add(key);
                      return true;
                    });
                  };
                  const nextDayItems = uniq([...(prev[day] || []), ...items]);
                  return { ...prev, [day]: nextDayItems };
                });
              }}
            />
          </aside>

          <DonateBin clothingItems={closetItems} />
        </aside>

        {/* Center cards */}
        <div className="closet-data__cards-container">
          {closetSections.map((section) => {
            const imageUrl =
              closetItems.length > 0
                ? closetItems.find((item) => item.includes(section.tag)) ||
                  section.placeholderUrl
                : section.placeholderUrl;

            return (
              <ClosetSectionCard
                key={section.name}
                sectionName={sectionTagToDisplayName[section.name]}
                imageUrl={imageUrl}
                placeholderUrl={section.placeholderUrl}
                onClick={() => handleCardClick(section.tag)}
                onAdd={() => {
                  resetModals();
                  setSelectedSection(section.tag);
                  setIsAddModalOpen(true);
                }}
              />
            );
          })}
        </div>

        {/* Right sidebar (unchanged) */}
        <aside className="closet-data__side-right">
          <WishList userId="123" />
          <VideoBin videos={sectionVideos} />
        </aside>
        <ChangeUserInfoModal
          isOpen={isUserModalOpen}
          onClose={resetModals}
          userData={{ username: "", email: "", avatarUrl: "" }}
          onUserUpdate={updateUser}
        />

        <ClosetSectionModal
          isOpen={isModalOpen}
          sectionName={selectedSection}
          placeholderUrl={topsImg}
          onClose={handleModalClose}
          onAddItem={openAddForSection}
        />

        <AddClothingModal
          isOpen={isAddModalOpen}
          onClose={resetModals}
          onClothingAdded={handleAddClothing}
          initialCategory={selectedSection}
        />
      </section>
    </main>
  );
}

export default ClosetData;
