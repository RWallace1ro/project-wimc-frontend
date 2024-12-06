import React, { useState, useEffect } from "react";
import ClosetSectionCard from "../components/ClosetSectionCard/ClosetSectionCard";
import ClosetSectionModal from "../components/ClosetSectionModal/ClosetSectionModal";
import DonateBin from "../components/DonateBin/DonateBin";
import WishList from "../components/WishList/WishList";
import ChangeUserInfoModal from "../components/ChangeUserInfoModal/ChangeUserInfoModal";
import AddClothingModal from "../components/AddClothingModal/AddClothingModal";
import { fetchImagesByTag } from "../utils/CloudinaryAPI";
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

function ClosetData({ selectedTab, isLoggedIn }) {
  const [closetItems, setClosetItems] = useState([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState(selectedTab || null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSectionItems = async (tag) => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedImages = await fetchImagesByTag(tag);
      console.log("Fetched Images:", fetchedImages);
      setClosetItems(fetchedImages || []);
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
    setClosetItems((prevItems) => [...prevItems, newClothingItem]);
    setIsAddModalOpen(false);
  };

  const updateUser = (updatedUser) => {
    console.log("User updated:", updatedUser);
    setIsUserModalOpen(false);
  };

  return (
    <div className="closet-data-page">
      <div className="closet-data__buttons">
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
      </div>

      {error && <p className="error-message">{error}</p>}
      {isLoading && <p className="loading-message">Loading...</p>}

      <div className="closet-data">
        <div className="closet-data__cards-container">
          {closetSections.map((section) => {
            const imageUrl =
              closetItems.length > 0
                ? closetItems.find((item) => item.includes(section.tag)) ||
                  section.placeholderUrl
                : section.placeholderUrl;

            console.log(`Image URL for ${section.name}:`, imageUrl);

            return (
              <ClosetSectionCard
                key={section.name}
                sectionName={sectionTagToDisplayName[section.name]}
                imageUrl={imageUrl}
                placeholderUrl={section.placeholderUrl}
                onClick={() => handleCardClick(section.tag)}
              />
            );
          })}
        </div>

        <div className="closet-data__side-container">
          <WishList userId="123" />
          <DonateBin clothingItems={closetItems} />
        </div>

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
        />

        <AddClothingModal
          isOpen={isAddModalOpen}
          onClose={resetModals}
          onClothingAdded={handleAddClothing}
        />
      </div>
    </div>
  );
}

export default ClosetData;
