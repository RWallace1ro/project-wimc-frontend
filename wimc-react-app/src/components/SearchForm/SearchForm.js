import React, { useState } from "react";
import { api } from "../../utils/CloudinaryAPI";
import "./SearchForm.css";

function SearchForm({ onSearchResults }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!searchTerm.trim()) {
      setError("Please enter a valid search term.");
      setIsLoading(false);
      return;
    }

    try {
      const result = await api.fetchImage(searchTerm);
      onSearchResults(result.resources);
    } catch (error) {
      setError("Failed to fetch images. Please try again.");
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="search-form">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="search"
          placeholder="Search for images..."
          value={searchTerm}
          onChange={handleChange}
          className="search-form__input"
        />
        <button
          type="submit"
          className="search-form__button"
          disabled={isLoading}
        >
          {isLoading ? "Searching..." : "Search"}
        </button>
      </form>
      {error && <p className="search-form__error">{error}</p>}
    </div>
  );
}

export default SearchForm;
