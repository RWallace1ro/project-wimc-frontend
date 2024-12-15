import React from "react";
import "./Preloader.css";

function Preloader() {
  return (
    <section className="preloader" aria-label="Loading...">
      <div className="circle-preloader"></div>
    </section>
  );
}

export default Preloader;
