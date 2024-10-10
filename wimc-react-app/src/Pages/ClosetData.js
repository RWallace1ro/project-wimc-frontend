import React, { useState, useEffect } from "react";
import ClosetSectionCard from "../components/ClosetSectionCard/ClosetSectionCard";
import ClosetSectionModal from "../components/ClosetSectionModal/ClosetSectionModal";
import DonateBin from "../components/DonateBin/DonateBin";
import WishList from "../components/WishList/WishList";
import ChangeUserInfoModal from "../components/ChangeUserInfoModal/ChangeUserInfoModal";
import SearchForm from "../components/SearchForm/SearchForm";
import { api } from "../utils/CloudinaryAPI";
import "./ClosetData.css";

const closetSections = [
  { name: "Evening Wear", imageUrl: "/images/evening-wear.jpg" },
  { name: "Shoes/Sneakers", imageUrl: "../..assets/images/shoes-sneakers.jpg" },
  { name: "Pants/Jeans", imageUrl: "../../assets/images/pants.jpg" },
  { name: "Tops", imageUrl: "/images/tops.jpg" },
  { name: "Bags", imageUrl: "/images/bags.jpg" },
  { name: "Jackets/Coats", imageUrl: "/images/jackets.jpg" },
];

function ClosetData() {
  const [closetItems, setClosetItems] = useState([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [images, setImages] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    api
      .fetchClosetItems()
      .then((items) => {
        setClosetItems(items.resources);
      })
      .catch((error) => {
        console.error("Error fetching closet items:", error);
      });
  }, []);

  const handleUserUpdate = (updatedUser) => {
    console.log("User updated:", updatedUser);
    setIsUserModalOpen(false);
  };

  const handleCardClick = (sectionName) => {
    setSelectedSection(sectionName);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="closet-data-page">
      <SearchForm onSearchResults={(images) => setImages(images)} />
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
          onClose={() => setIsUserModalOpen(false)}
          userData={{
            username: "Rochelle",
            email: "rochelle@gmail.com",
            avatarUrl: "/assets/images/avatar.jpg",
          }}
          onUserUpdate={handleUserUpdate}
        />

        <ClosetSectionModal
          isOpen={isModalOpen}
          sectionName={selectedSection}
          onClose={handleModalClose}
        />

        <div className="image-gallery">
          {images.length > 0 &&
            images.map((image) => (
              <img
                key={image.public_id}
                src={image.secure_url}
                alt={image.public_id}
              />
            ))}
        </div>
      </div>
    </div>
  );
}

export default ClosetData;
