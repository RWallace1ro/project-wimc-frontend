import React from "react";
import "./NothingFound.css";

function NothingFound() {
  return (
    <section className="nothing-found">
      <header>
        <h2 className="nothing-found__title">Nothing Found</h2>
      </header>
      <p className="nothing-found__description">
        We couldn't find any items matching your search.
      </p>
    </section>
  );
}

export default NothingFound;
