import React, { useState } from "react";
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
      setDonateItems([...donateItems, addedItem]);
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
      setDonateItems([...donateItems, itemWithImage]);
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
    setDonatedItems([...donatedItems, ...donateItems]);
    setDonateItems([]);
  };

  const handleRemoveItem = (index) => {
    const updatedItems = donateItems.filter((_, i) => i !== index);
    setDonateItems(updatedItems);
  };

  const handleToggleDonatedItems = () => {
    setShowDonatedItems(!showDonatedItems);
  };

  return (
    <div className="donate-bin">
      <h3>Donate Bin</h3>

      <div className="donate-bin__input">
        <input
          type="text"
          name="name"
          placeholder="Enter item name"
          value={newItem.name}
          onChange={handleInputChange}
        />
        <textarea
          name="description"
          placeholder="Enter item description"
          value={newItem.description}
          onChange={handleInputChange}
        />
        <input
          type="file"
          name="image"
          accept="image/*"
          onChange={handleFileChange}
        />
        <button onClick={handleAddItem} disabled={loading}>
          {loading ? "Uploading..." : "Add"}
        </button>
      </div>

      <button className="donate-bin__donate-button" onClick={handleDonate}>
        Donate
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
        <div className="donate-bin__donated-items">
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
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default DonateBin;
