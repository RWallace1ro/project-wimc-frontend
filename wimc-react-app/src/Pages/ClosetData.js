import React, { useState, useEffect } from "react";
import ClosetSectionCard from "../components/ClosetSectionCard/ClosetSectionCard";
import ClosetSectionModal from "../components/ClosetSectionModal/ClosetSectionModal";
import DonateBin from "../components/DonateBin/DonateBin";
import WishList from "../components/WishList/WishList";
import ChangeUserInfoModal from "../components/ChangeUserInfoModal/ChangeUserInfoModal";
import SearchForm from "../components/SearchForm/SearchForm";
import AddClothingModal from "../components/AddClothingModal/AddClothingModal";
import { api } from "../utils/CloudinaryAPI";
import "./ClosetData.css";

const closetSections = [
  { name: "Dresses/Skirts", imageUrl: "./assets/images/dresses-skirts.jpg" },
  {
    name: "Shoes/Sneakers",
    imageUrl: "../../assets/images/shoes-sneakers.jpg",
  },
  { name: "Pants/Jeans", imageUrl: "../../assets/images/pants.jpg" },
  { name: "Tops", imageUrl: "../../assets/images/tops.jpg" },
  { name: "Bags", imageUrl: "../../assets/images/bags.jpg" },
  { name: "Jackets/Coats", imageUrl: "../../assets/images/jackets.jpg" },
];

function ClosetData({ selectedTab }) {
  const [closetItems, setClosetItems] = useState([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [images, setImages] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [error, setError] = useState(null);

  const initialUserData = {
    username: "Your Name",
    email: "example@example.com",
    avatarUrl: "/assets/images/default-avatar.jpg",
  };

  useEffect(() => {
    api
      .fetchClosetItems()
      .then((items) => {
        setClosetItems(items.resources);
        setError(null);
      })
      .catch((error) => {
        console.error("Error fetching closet items:", error);
        setError(null);
      });
  }, []);

  useEffect(() => {
    if (selectedTab) {
      setSelectedSection(selectedTab);
      setIsModalOpen(true);
    } else {
      setIsModalOpen(false);
    }
  }, [selectedTab]);

  const handleCardClick = (sectionName) => {
    if (selectedSection !== sectionName) {
      setSelectedSection(sectionName);
      setIsModalOpen(true);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedSection(null);
  };

  const resetModals = () => {
    setIsModalOpen(false);
    setIsUserModalOpen(false);
    setIsAddModalOpen(false);
    setSelectedSection(null);
  };

  const handleAddClothing = (newClothingItem) => {
    setClosetItems([...closetItems, newClothingItem]);
    setIsAddModalOpen(false);
  };

  const updateUser = (updatedUser) => {
    console.log("User updated:", updatedUser);
    setIsUserModalOpen(false);
  };

  const handleSearchResults = (fetchedImages) => {
    setImages(fetchedImages);
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
        <SearchForm onSearchResults={handleSearchResults} />
      </div>

      {error && closetItems.length === 0 && (
        <p className="error-message">{error}</p>
      )}

      <div className="closet-data">
        <div className="closet-data__cards-container">
          {closetSections.map((section) => (
            <ClosetSectionCard
              key={section.name}
              sectionName={section.name}
              imageUrl={section.imageUrl}
              onClick={() => handleCardClick(section.name)}
            />
          ))}
        </div>

        <div className="closet-data__side-container">
          <WishList userId="123" />
          <DonateBin clothingItems={closetItems} onDonate={() => {}} />
        </div>

        <ChangeUserInfoModal
          isOpen={isUserModalOpen}
          onClose={resetModals}
          userData={initialUserData}
          onUserUpdate={updateUser}
        />

        <ClosetSectionModal
          isOpen={isModalOpen}
          sectionName={selectedSection}
          onClose={handleModalClose}
        />

        <AddClothingModal
          isOpen={isAddModalOpen}
          onClose={resetModals}
          onClothingAdded={handleAddClothing}
        />

        <div className="image-gallery">
          {images.length > 0 &&
            images.map((image) => (
              <img
                key={image.public_id}
                src={image.secure_url}
                alt={image.public_id}
                className="gallery-image"
              />
            ))}
        </div>
      </div>
    </div>
  );
}

export default ClosetData;
