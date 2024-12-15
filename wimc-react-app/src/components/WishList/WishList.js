import React, { useState, useEffect } from "react";
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

  useEffect(() => {
    const savedItems = JSON.parse(localStorage.getItem("wishListItems")) || [];
    setWishListItems(savedItems);
  }, []);

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

    const updatedItems = [...wishListItems, newWishListItem];
    setWishListItems(updatedItems);
    localStorage.setItem("wishListItems", JSON.stringify(updatedItems));

    setNewItem({ url: "", name: "", description: "" });
  };

  const handleRemoveItem = (index) => {
    const updatedItems = wishListItems.filter((_, i) => i !== index);
    setWishListItems(updatedItems);
    localStorage.setItem("wishListItems", JSON.stringify(updatedItems));
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
    <section className="wish-list" aria-live="polite">
      <h3>Wish List</h3>

      <form className="wish-list__form">
        <label htmlFor="url">Item URL (Optional):</label>
        <input
          id="url"
          type="text"
          name="url"
          placeholder="Enter item URL"
          value={newItem.url}
          onChange={handleInputChange}
        />

        <label htmlFor="name">Item Name (Optional):</label>
        <input
          id="name"
          type="text"
          name="name"
          placeholder="Enter item name"
          value={newItem.name}
          onChange={handleInputChange}
        />

        <label htmlFor="description">Item Description (Optional):</label>
        <textarea
          id="description"
          name="description"
          placeholder="Enter item description"
          value={newItem.description}
          onChange={handleInputChange}
        />

        <button type="button" onClick={handleAddItem}>
          Add to Wish List
        </button>
      </form>

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
        <section className="wish-list__items">
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
        </section>
      )}
    </section>
  );
}

export default WishList;
