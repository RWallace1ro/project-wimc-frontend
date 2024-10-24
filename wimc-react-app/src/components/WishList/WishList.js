import React, { useState } from "react";
// import { api } from "../../utils/CloudinaryAPI";
import "./WishList.css";

function WishList() {
  const [wishListItems, setWishListItems] = useState([]);
  const [newItem, setNewItem] = useState({
    url: "",
    name: "",
    description: "",
  });
  const [error, setError] = useState("");
  const [showWishList, setShowWishList] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [addAttempted, setAddAttempted] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewItem({ ...newItem, [name]: value });
  };

  const handleAddItem = () => {
    setAddAttempted(true);

    if (!newItem.url && !newItem.name && !newItem.description) {
      setError(
        "Please fill in at least one field (URL, name, or description)."
      );
      return;
    }

    setError("");

    const newWishListItem = {
      ...newItem,
      id: Date.now().toString(),
    };

    setWishListItems((prevItems) => [...prevItems, newWishListItem]);
    setNewItem({ url: "", name: "", description: "" });
  };

  const handleRemoveItem = (index) => {
    setWishListItems((prevItems) => prevItems.filter((_, i) => i !== index));
  };

  const handleToggleWishList = () => {
    setShowWishList(!showWishList);
  };

  const handleShareWishList = () => {
    const wishListText = wishListItems
      .map(
        (item) =>
          `Name: ${item.name}, Description: ${item.description}, URL: ${item.url}`
      )
      .join("\n");

    navigator.clipboard
      .writeText(wishListText)
      .then(() => {
        setShareMessage("Wish list copied to clipboard! Share it with others.");
      })
      .catch((error) => {
        console.error("Error sharing wish list:", error);
        setError("Failed to copy the wish list. Please try again.");
      });
  };

  return (
    <div className="wish-list">
      <h3>Wish List</h3>

      <div className="wish-list__input">
        <input
          type="text"
          name="url"
          placeholder="Enter item URL (Optional)"
          value={newItem.url}
          onChange={handleInputChange}
        />
      </div>
      <div className="wish-list__input">
        <input
          type="text"
          name="name"
          placeholder="Enter item name (Optional)"
          value={newItem.name}
          onChange={handleInputChange}
        />
      </div>
      <div className="wish-list__input">
        <textarea
          name="description"
          placeholder="Enter item description (Optional)"
          value={newItem.description}
          onChange={handleInputChange}
        />
      </div>
      <div className="wish-list__input">
        <button onClick={handleAddItem}>Add</button>
      </div>

      {addAttempted && error && <p className="wish-list__error">{error}</p>}

      <div className="wish-list__actions">
        <button className="wish-list__share" onClick={handleShareWishList}>
          Share Wish List
        </button>
        <button className="wish-list__view" onClick={handleToggleWishList}>
          {showWishList ? "Hide Wish List" : "View Wish List"}
        </button>
      </div>

      {shareMessage && (
        <p className="wish-list__share-message">{shareMessage}</p>
      )}

      {showWishList && (
        <div className="wish-list__items">
          <h4>Items in Wish List:</h4>
          {wishListItems.length === 0 ? (
            <p>No items in your wish list.</p>
          ) : (
            <ul>
              {wishListItems.map((item, index) => (
                <li key={item.id}>
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {item.url}
                    </a>
                  ) : (
                    <>
                      <strong>{item.name}</strong>
                      <p>{item.description}</p>
                    </>
                  )}
                  <button onClick={() => handleRemoveItem(index)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default WishList;
