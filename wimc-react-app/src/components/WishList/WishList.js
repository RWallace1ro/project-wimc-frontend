import React, { useState, useEffect } from "react";
import { api } from "../../utils/BackendAPI";
import "./WishList.css";

function WishList({ userId }) {
  const [wishListItems, setWishListItems] = useState([]);
  const [newItem, setNewItem] = useState({
    url: "",
    name: "",
    description: "",
  });
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [showWishList, setShowWishList] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [addAttempted, setAddAttempted] = useState(false);

  useEffect(() => {
    api
      .getWishListItems(userId)
      .then((items) => {
        setWishListItems(items.resources);
      })
      .catch((error) => {
        console.error("Error fetching wish list items:", error);
        setLoadError("Failed to load wish list items. Please try again.");
      });
  }, [userId]);

  const handleAddItem = () => {
    setAddAttempted(true);

    if (!newItem.url && !newItem.name && !newItem.description) {
      setError(
        "Please fill in at least one field (URL, name, or description)."
      );
      return;
    }

    setError("");

    if (!newItem.url) {
      const addedItem = { ...newItem, public_id: Date.now().toString() };
      setWishListItems([...wishListItems, addedItem]);
      setNewItem({ url: "", name: "", description: "" });
      return;
    }

    api
      .addWishListItem(userId, newItem)
      .then((addedItem) => {
        setWishListItems([...wishListItems, addedItem]);
        setNewItem({ url: "", name: "", description: "" });
        setError("");
      })
      .catch((error) => {
        console.error("Error adding wish list item:", error);
        setError("Failed to add item. Please try again.");
      });
  };

  const handleRemoveItem = (index, itemId) => {
    api
      .deleteWishListItem(userId, itemId)
      .then(() => {
        const updatedItems = wishListItems.filter((_, i) => i !== index);
        setWishListItems(updatedItems);
      })
      .catch((error) => {
        console.error("Error removing wish list item:", error);
        setError("Failed to remove item. Please try again.");
      });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewItem({ ...newItem, [name]: value });
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

      {addAttempted && newItem.url && loadError && (
        <p className="wish-list__error">{loadError}</p>
      )}

      {error && <p className="wish-list__error">{error}</p>}

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
                <li key={item.public_id}>
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
                  <button
                    onClick={() => handleRemoveItem(index, item.public_id)}
                  >
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
