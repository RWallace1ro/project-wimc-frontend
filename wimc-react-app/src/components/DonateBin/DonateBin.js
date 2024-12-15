import React, { useState, useEffect } from "react";
import { uploadImage } from "../../utils/CloudinaryAPI";
import "./DonateBin.css";

function DonateBin() {
  const [donateItems, setDonateItems] = useState([]);
  const [newItem, setNewItem] = useState({
    url: "",
    name: "",
    description: "",
    image: null,
  });
  const [donatedItems, setDonatedItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDonatedItems, setShowDonatedItems] = useState(false);

  useEffect(() => {
    const savedDonateItems =
      JSON.parse(localStorage.getItem("donateItems")) || [];
    const savedDonatedItems =
      JSON.parse(localStorage.getItem("donatedItems")) || [];
    setDonateItems(savedDonateItems);
    setDonatedItems(savedDonatedItems);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewItem({ ...newItem, [name]: value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setNewItem({ ...newItem, image: file });
  };

  const handleAddItem = async () => {
    if (!newItem.name && !newItem.description) {
      setError("Please enter an item name or description.");
      return;
    }

    setError("");

    if (!newItem.image) {
      const addedItem = {
        name: newItem.name,
        description: newItem.description,
        url: newItem.url,
      };
      const updatedItems = [...donateItems, addedItem];
      setDonateItems(updatedItems);
      localStorage.setItem("donateItems", JSON.stringify(updatedItems));

      setNewItem({ name: "", description: "", url: "", image: null });
      return;
    }

    setLoading(true);

    try {
      const response = await uploadImage(newItem.image);
      const itemWithImage = {
        name: newItem.name,
        description: newItem.description,
        imageUrl: response.secure_url,
        url: newItem.url,
      };
      const updatedItems = [...donateItems, itemWithImage];
      setDonateItems(updatedItems);
      localStorage.setItem("donateItems", JSON.stringify(updatedItems));

      setNewItem({ name: "", description: "", url: "", image: null });
      setLoading(false);
    } catch (err) {
      setError("Failed to upload image. Please try again.");
      setLoading(false);
    }
  };

  const handleDonate = () => {
    if (donateItems.length === 0) {
      setError("No items to donate.");
      return;
    }

    const updatedDonatedItems = [...donatedItems, ...donateItems];
    setDonatedItems(updatedDonatedItems);
    localStorage.setItem("donatedItems", JSON.stringify(updatedDonatedItems));

    setDonateItems([]);
    localStorage.removeItem("donateItems");
  };

  const handleRemoveItem = (index, isDonated = false) => {
    if (isDonated) {
      const updatedDonatedItems = donatedItems.filter((_, i) => i !== index);
      setDonatedItems(updatedDonatedItems);
      localStorage.setItem("donatedItems", JSON.stringify(updatedDonatedItems));
    } else {
      const updatedItems = donateItems.filter((_, i) => i !== index);
      setDonateItems(updatedItems);
      localStorage.setItem("donateItems", JSON.stringify(updatedItems));
    }
  };

  const handleToggleDonatedItems = () => {
    setShowDonatedItems(!showDonatedItems);
  };

  return (
    <section className="donate-bin">
      <header>
        <h3>Donate Bin</h3>
      </header>

      <section className="donate-bin__input">
        <label htmlFor="name">Item Name</label>
        <input
          id="name"
          type="text"
          name="name"
          placeholder="Enter item name"
          value={newItem.name}
          onChange={handleInputChange}
          required
        />

        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          placeholder="Enter item description"
          value={newItem.description}
          onChange={handleInputChange}
          required
        />

        <label htmlFor="image">Upload Image</label>
        <input
          id="image"
          type="file"
          name="image"
          accept="image/*"
          onChange={handleFileChange}
        />

        <button onClick={handleAddItem} disabled={loading}>
          {loading ? "Uploading..." : "Add Item"}
        </button>
      </section>

      <button className="donate-bin__donate-button" onClick={handleDonate}>
        Donate Items
      </button>

      <ul className="donate-bin__list">
        {donateItems.map((item, index) => (
          <li key={index}>
            <span>{item.name}</span>
            <p>{item.description}</p>
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="donate-bin__image"
              />
            )}
            <button onClick={() => handleRemoveItem(index)}>Remove</button>
          </li>
        ))}
      </ul>

      {error && <p className="donate-bin__error">{error}</p>}

      <button
        className="donate-bin__view-button"
        onClick={handleToggleDonatedItems}
      >
        {showDonatedItems ? "Hide Donated Items" : "View Donated Items"}
      </button>

      {showDonatedItems && (
        <section className="donate-bin__donated-items">
          <h4>Donated Items:</h4>
          {donatedItems.length === 0 ? (
            <p>No items have been donated yet.</p>
          ) : (
            <ul>
              {donatedItems.map((item, index) => (
                <li key={index}>
                  <span>{item.name}</span>
                  <p>{item.description}</p>
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="donate-bin__image"
                    />
                  )}
                  <button onClick={() => handleRemoveItem(index, true)}>
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

export default DonateBin;
