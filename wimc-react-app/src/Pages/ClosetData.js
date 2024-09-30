import React, { useState, useEffect } from "react";
import ClosetSectionCard from "../components/ClosetSectionCard/ClosetSectionCard";
import DonateBin from "../components/DonateBin/DonateBin";
import WishList from "../components/WishList/WishList";
import ChangeUserInfoModal from "../components/ChangeUserInfoModal/ChangeUserInfoModal";
import { fetchClosetItems } from "../utils/CloudinaryAPI";
import "./ClosetData.css";

const closetSections = [
  { name: "Evening Wear", imageUrl: "/images/evening-wear.jpg" },
  { name: "Shoes-Sneakers", imageUrl: "../images/shoes-sneakers.jpg" },
  { name: "Pants/Jeans", imageUrl: "/images/pants.jpg" },
  { name: "Tops", imageUrl: "/images/tops.jpg" },
  { name: "Bags", imageUrl: "/images/bags.jpg" },
  { name: "Jackets/Coats", imageUrl: "/images/jackets.jpg" },
];

function ClosetData() {
  const [closetItems, setClosetItems] = useState([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  useEffect(() => {
    fetchClosetItems()
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

  return (
    <div className="closet-data">
      <div className="closet-data__main-content">
        <div className="closet-data__cards-container">
          {closetSections.map((section) => (
            <ClosetSectionCard
              key={section.name}
              sectionName={section.name}
              imageUrl={section.imageUrl}
              onClick={() => console.log(`Selected ${section.name}`)}
            />
          ))}
        </div>
      </div>

      <div className="closet-data__side-container">
        <DonateBin clothingItems={closetItems} onDonate={() => {}} />
        <WishList userId="123" />
      </div>

      <ChangeUserInfoModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        userData={{
          username: "Rochelle",
          email: "rochelle@example.com",
          avatarUrl: "/assets/images/avatar.jpg",
        }}
        onUserUpdate={handleUserUpdate}
      />
    </div>
  );
}

export default ClosetData;
