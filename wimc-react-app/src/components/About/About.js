import React from "react";
import { useNavigate } from "react-router-dom";
import "./About.css";

function About() {
  const navigate = useNavigate();

  return (
    <main className="about">
      <button
        className="about__back-btn"
        onClick={() => navigate(-1)}
        aria-label="Go back"
      >
        ← Back
      </button>

      <section className="about__overlay">
        <header>
          <h1>About WIMC</h1>
        </header>
        <p>
          What's In My Closet (WIMC) is your personal closet organizer,
          designed to help you manage your clothing items efficiently. With
          WIMC, you can categorize items, track designers and sizes, plan
          outfits for different occasions, and even create a seasonal capsule
          closet for the different seasons of the year — with dedicated
          spaces for kids' and pet closets too.
        </p>
        <p>
          WIMC also brings AI into your everyday closet routine: an AI
          Stylist for personalized outfit advice, an AI Packing Assistant
          that builds a travel packing list from your own wardrobe, an AI
          Donation Advisor that helps decide what's worth donating, and a
          Try-On Studio that records outfit videos and gives AI-powered style
          feedback.
        </p>
        <ul className="about__features">
          <li>AI Stylist, Packing Assistant &amp; Donation Advisor</li>
          <li>Try-On Studio with AI style feedback</li>
          <li>Carousel — ambient full-screen closet slideshow</li>
          <li>Outfit Preview &amp; Outfit of the Day</li>
          <li>Travel Pack Planner</li>
          <li>Weather-based outfit suggestions</li>
          <li>Kids' Closet &amp; Pet Closet</li>
          <li>Wish List, Shopping List &amp; Donate Bin</li>
          <li>Receipts tracker &amp; backup</li>
        </ul>
      </section>
    </main>
  );
}

export default About;
