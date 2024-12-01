import React, { useState } from "react";
import { fetchImagesByTag } from "../../utils/CloudinaryAPI";
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
      const formattedSearchTerm = searchTerm.replace(/\s+/g, "-").toLowerCase();

      const result = await fetchImagesByTag(formattedSearchTerm);

      if (result && result.length > 0) {
        onSearchResults(result);
        setSearchTerm("");
      } else {
        setError("No images found for this search term.");
      }
    } catch (err) {
      setError("Failed to fetch images. Please try again.");
      console.error("Search error:", err);
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
        <button type="submit" className="search-form__button">
          {isLoading ? "Searching..." : "Search"}
        </button>
      </form>
      {error && <p className="search-form__error">{error}</p>}
    </div>
  );
}

export default SearchForm;
