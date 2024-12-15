import React from "react";
import "./About.css";

function About() {
  return (
    <main className="about">
      <section className="about__overlay">
        <header>
          <h1>About WIMC</h1>
        </header>
        <p>
          What's in My Closet (WIMC) is your personal wardrobe organizer,
          designed to help you manage your clothing items efficiently. With
          WIMC, you can categorize items, track designers and sizes, plan
          outfits for different occasions, and even create a seasonal capsule
          wardrobe for the different seasons of the year. The app provides
          features for searching through your closet, organizing items by
          category, and adding them to a wish list or donate bin for streamlined
          closet management.
        </p>
      </section>
    </main>
  );
}

export default About;
