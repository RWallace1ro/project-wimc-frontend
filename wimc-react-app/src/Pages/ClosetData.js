import React, { useState, useEffect, useCallback } from "react";
import ClosetSectionCard from "../components/ClosetSectionCard/ClosetSectionCard";
import ClosetSectionModal from "../components/ClosetSectionModal/ClosetSectionModal";
import DonateBin from "../components/DonateBin/DonateBin";
import WishList from "../components/WishList/WishList";
import ChangeUserInfoModal from "../components/ChangeUserInfoModal/ChangeUserInfoModal";
import AddClothingModal from "../components/AddClothingModal/AddClothingModal";
import { fetchImagesByTag, fetchVideosByTag } from "../utils/CloudinaryAPI";
import VideoBin from "../components/VideoBin/VideoBin";
import OutfitPreviewPanel from "../components/OutfitPreviewPanel/OutfitPreviewPanel";
import OutfitPlanner from "../components/OutfitPlanner/OutfitPlanner";
import TravelPackPanel from "../components/TravelPackPanel/TravelPackPanel";
import TryOnStudio from "../components/TryOnStudio/TryOnStudio";
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

function ClosetData({
  selectedTab,
  isLoggedIn,
  userData,
  onUserUpdate,
  onRegisterOpenSection,
  onClearTab,
}) {
  const [previewSelection, setPreviewSelection] = useState([]);
  const [closetItems, setClosetItems] = useState([]);
  const [sectionVideos, setSectionVideos] = useState([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTryOnOpen, setIsTryOnOpen] = useState(false);
  const [tryOnImageUrl, setTryOnImageUrl] = useState(null);
  const [tryOnSection, setTryOnSection] = useState(null);
  const [weekPlan, setWeekPlan] = useState({
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: [],
  });

  // ── Fetch helpers ────────────────────────────────────────────────────────
  const fetchSectionItems = async (tag) => {
    setIsLoading(true);
    setError(null);
    try {
      const [imgs, vids] = await Promise.all([
        fetchImagesByTag(tag),
        fetchVideosByTag(tag),
      ]);
      setClosetItems(imgs || []);
      setSectionVideos(vids || []);
    } catch {
      setError("Failed to load closet items.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Register openSection with App so tab clicks open the modal ───────────
  const openSection = useCallback((tag) => {
    setSelectedSection(tag);
    setIsModalOpen(true);
    fetchSectionItems(tag);
  }, []);

  useEffect(() => {
    if (typeof onRegisterOpenSection === "function") {
      onRegisterOpenSection(openSection);
    }
  }, [onRegisterOpenSection, openSection]);

  // ── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoggedIn && selectedTab) {
      fetchSectionItems(selectedTab);
    }
  }, [isLoggedIn, selectedTab]);

  // ── Merge helper (dedupes by key) ────────────────────────────────────────
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

  // ── Modal handlers ───────────────────────────────────────────────────────
  const openAddForSection = (tag) => {
    setIsModalOpen(false);
    setSelectedSection(tag);
    setIsAddModalOpen(true);
  };

  const handleCardClick = (section) => {
    setSelectedSection(section);
    setIsModalOpen(true);
  };

  // ✅ Clear active tab highlight when modal closes
  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedSection(null);
    onClearTab?.();
  };

  const resetModals = () => {
    setIsModalOpen(false);
    setIsUserModalOpen(false);
    setIsAddModalOpen(false);
    setSelectedSection(null);
  };

  const handleAddClothing = (item) => {
    if (item?.mediaType === "video") {
      setSectionVideos((prev) => [...prev, item]);
    } else {
      const url = item?.mediaThumb || item?.mediaUrl || item?.imageUrl || item;
      if (url) setClosetItems((prev) => [...prev, url]);
    }
    setIsAddModalOpen(false);
  };

  const handleUserUpdate = (updatedUser) => {
    onUserUpdate?.(updatedUser);
    setIsUserModalOpen(false);
  };

  const handleTryOnFromCard = (section) => {
    const firstImg = closetItems.find((url) => url.includes(section)) || null;
    setTryOnImageUrl(firstImg);
    setTryOnSection(section);
    setIsTryOnOpen(true);
  };

  // ── Render ───────────────────────────────────────────────────────────────
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
        {/* Left sidebar */}
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
              onSyncToPlanner={(day, items) => {
                setWeekPlan((prev) => {
                  const seen = new Set();
                  const uniq = [...(prev[day] || []), ...items].filter((it) => {
                    const key =
                      it.mediaUrl || it.imageUrl || JSON.stringify(it);
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                  });
                  return { ...prev, [day]: uniq };
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
                onTryOn={() => handleTryOnFromCard(section.tag)}
              />
            );
          })}
        </div>

        {/* Right sidebar */}
        <aside className="closet-data__side-right">
          <WishList userId="123" />
          <VideoBin videos={sectionVideos} />
        </aside>

        {/* Modals */}
        <ChangeUserInfoModal
          isOpen={isUserModalOpen}
          onClose={resetModals}
          userData={userData}
          onUserUpdate={handleUserUpdate}
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

      {/* Try-On Studio */}
      <TryOnStudio
        isOpen={isTryOnOpen}
        onClose={() => setIsTryOnOpen(false)}
        initialImageUrl={tryOnImageUrl}
        initialSection={tryOnSection}
      />
    </main>
  );
}

export default ClosetData;
