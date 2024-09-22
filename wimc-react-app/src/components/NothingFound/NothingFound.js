import React from "react";
import "./NothingFound.css";

function NothingFound() {
  return (
    <div className="nothing-found">
      <h2 className="nothing-found__title">Nothing Found</h2>
      <p className="nothing-found__description">
        We couldn't find any items matching your search.
      </p>
    </div>
  );
}

export default NothingFound;
