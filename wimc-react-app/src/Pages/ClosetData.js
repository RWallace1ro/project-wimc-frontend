import React, { useState, useEffect } from "react";
import ClosetSectionCard from "../components/ClosetSectionCard/ClosetSectionCard";
import ClosetSectionModal from "../components/ClosetSectionModal/ClosetSectionModal";
import DonateBin from "../components/DonateBin/DonateBin";
import WishList from "../components/WishList/WishList";
import ChangeUserInfoModal from "../components/ChangeUserInfoModal/ChangeUserInfoModal";
import SearchForm from "../components/SearchForm/SearchForm";
import AddClothingModal from "../components/AddClothingModal/AddClothingModal";
import { fetchClosetItems } from "../utils/CloudinaryAPI";
import "./ClosetData.css";

import dressesSkirtsImg from "../assets/images/dresses-skirts.jpg";
import shoesSneakersImg from "../assets/images/shoes-sneakers.jpg";
import pantsJeansImg from "../assets/images/pants-jeans.jpg";
import topsImg from "../assets/images/tops.jpg";
import bagsAccessoriesImg from "../assets/images/bags-accessories.jpg";
import jacketsCoatsImg from "../assets/images/jackets-coats.jpg";

const displayNames = {
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
    publicId: "closet-items/dresses-skirts",
    placeholderUrl: dressesSkirtsImg,
  },
  {
    name: "shoes-sneakers",
    publicId: "closet-items/shoes-sneakers",
    placeholderUrl: shoesSneakersImg,
  },
  {
    name: "pants-jeans",
    publicId: "closet-items/pants-jeans",
    placeholderUrl: pantsJeansImg,
  },
  { name: "tops", publicId: "closet-items/tops", placeholderUrl: topsImg },
  {
    name: "bags-accessories",
    publicId: "closet-items/bags-accessories",
    placeholderUrl: bagsAccessoriesImg,
  },
  {
    name: "jackets-coats",
    publicId: "closet-items/jackets-coats",
    placeholderUrl: jacketsCoatsImg,
  },
];

function ClosetData({ selectedTab, isLoggedIn }) {
  const [closetItems, setClosetItems] = useState([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [error, setError] = useState(null);
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const initialUserData = {
    username: "",
    email: "",
    avatarUrl: "",
  };

  useEffect(() => {
    if (isLoggedIn) {
      const fetchData = async () => {
        setIsLoading(true);
        setError(null);

        try {
          fetchClosetItems(
            [
              "dresses-skirts",
              "shoes-sneakers",
              "pants-jeans",
              "tops",
              "bags-accessories",
              "jackets-coats",
            ],
            (err, data) => {
              if (err) {
                console.error("Error fetching closet items:", err);
                setError("Failed to load closet items.");
              } else {
                setClosetItems(data);
              }
            }
          );
        } catch (err) {
          console.error("Error fetching closet items:", err);
          setError("Failed to load closet items.");
        } finally {
          setIsLoading(false);
        }
      };

      fetchData();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (selectedTab) {
      setSelectedSection(selectedTab);
      setIsModalOpen(true);
    } else {
      setIsModalOpen(false);
    }
  }, [selectedTab]);

  const handleCardClick = (sectionName) => {
    setSelectedSection(sectionName);
    setIsModalOpen(true);
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

      {error && <p className="error-message">{error}</p>}
      {isLoading && <p className="loading-message">Loading...</p>}

      <div className="closet-data">
        <div className="closet-data__cards-container">
          {closetSections.map((section) => (
            <ClosetSectionCard
              key={section.name}
              sectionName={displayNames[section.name]}
              publicId={section.publicId}
              placeholderUrl={section.placeholderUrl}
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
          sectionName={displayNames[selectedSection]}
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
