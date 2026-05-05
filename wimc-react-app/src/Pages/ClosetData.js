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
import BackgroundPicker from "../components/BackgroundPicker/BackgroundPicker";
import ClosetSearch from "../components/ClosetSearch/ClosetSearch";
import { useBackground } from "../context/BackgroundContext";
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

// Special key for the overall closet page background
const PAGE_BG_KEY = "closet-page";

function ClosetData({
  selectedTab,
  isLoggedIn,
  userData,
  onUserUpdate,
  onRegisterOpenSection,
  onClearTab,
}) {
  // ✅ Read ALL backgrounds from context so component re-renders on any change
  const { getBackground, backgrounds } = useBackground();

  // Page background
  const pageBg = backgrounds[PAGE_BG_KEY] || null;

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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isBgPickerOpen, setIsBgPickerOpen] = useState(false);
  const [bgPickerSection, setBgPickerSection] = useState(null);
  const [weekPlan, setWeekPlan] = useState({
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: [],
  });

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

  const openSection = useCallback((tag) => {
    setSelectedSection(tag);
    setIsModalOpen(true);
    fetchSectionItems(tag);
  }, []);

  useEffect(() => {
    if (typeof onRegisterOpenSection === "function")
      onRegisterOpenSection(openSection);
  }, [onRegisterOpenSection, openSection]);

  useEffect(() => {
    if (isLoggedIn && selectedTab) fetchSectionItems(selectedTab);
  }, [isLoggedIn, selectedTab]);

  const openAddForSection = (tag) => {
    setIsModalOpen(false);
    setSelectedSection(tag);
    setIsAddModalOpen(true);
  };
  const handleCardClick = (section) => {
    setSelectedSection(section);
    setIsModalOpen(true);
  };
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
    setTryOnImageUrl(closetItems.find((url) => url.includes(section)) || null);
    setTryOnSection(section);
    setIsTryOnOpen(true);
  };

  return (
    <main
      className="closet-data-page"
      style={
        pageBg
          ? {
              backgroundImage: `url(${pageBg})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : {}
      }
    >
      <header className="closet-data__header-actions">
        <button
          className="add-clothing-button"
          onClick={() => setIsSearchOpen(true)}
        >
          🔍 Search My Closet
        </button>
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

        {/* Center cards — ✅ sectionBackground passed as prop */}
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
                onCustomizeBg={() => {
                  setBgPickerSection(section.tag);
                  setIsBgPickerOpen(true);
                }}
                sectionBackground={backgrounds[section.tag] || null}
              />
            );
          })}
        </div>

        <aside className="closet-data__side-right">
          <WishList userId="123" />
          <VideoBin videos={sectionVideos} />
        </aside>

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

      <TryOnStudio
        isOpen={isTryOnOpen}
        onClose={() => setIsTryOnOpen(false)}
        initialImageUrl={tryOnImageUrl}
        initialSection={tryOnSection}
      />

      <BackgroundPicker
        isOpen={isBgPickerOpen}
        onClose={() => {
          setIsBgPickerOpen(false);
          setBgPickerSection(null);
        }}
        section={bgPickerSection}
      />

      <ClosetSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSectionSelect={(tag) => openSection(tag)}
      />
    </main>
  );
}

export default ClosetData;
