import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./FAQ.css";

const SECTIONS = [
  {
    heading: "Getting Started",
    items: [
      {
        q: "What is What's in My Closet (WIMC)?",
        a: "What's in My Closet is a personal wardrobe management app that lets you photograph, organize, and plan outfits from your clothing collection. It includes AI-powered styling advice, a travel packing planner, a donation manager, a wish list, a shopping list, and more — all in one place.",
      },
      {
        q: "Do I need an account to use the app?",
        a: "Yes. A free account is required so your closet, outfit plans, and preferences are saved securely to your profile. Sign up with your email address or an existing Google account.",
      },
      {
        q: "Is WIMC available on mobile?",
        a: "WIMC is a web app that works in any modern browser on desktop, tablet, and mobile. For the best experience on mobile, add it to your home screen from your browser's share menu.",
      },
      {
        q: "How do I add items to my closet?",
        a: "Open any closet section card (e.g. Tops, Dresses/Skirts) and tap '+ Add'. You can upload a photo or video directly from your device. Items are stored securely and appear in that section immediately.",
      },
    ],
  },
  {
    heading: "Closet Organization",
    items: [
      {
        q: "What closet sections are available?",
        a: "Your main closet is divided into six sections: Tops, Pants/Jeans, Dresses/Skirts, Shoes/Sneakers, Bags/Accessories, and Jackets/Coats. Each section stores both photos and videos of your items.",
      },
      {
        q: "Can I upload videos of my clothing items?",
        a: "Yes. Each closet section supports both image and video uploads. Switch to the Videos tab inside any section modal to view or add video content.",
      },
      {
        q: "How do I move an item to a different section?",
        a: "Hover over any item in a section modal to reveal the move button (↗) in the top-left corner. Click it, then choose the destination section from the dropdown. The item is automatically transferred.",
      },
      {
        q: "How do I delete an item?",
        a: "Hover over the item to reveal the delete button (🗑️) in the top-right corner. Confirm the prompt and the item is permanently removed from your closet.",
      },
      {
        q: "What is the Kids' Closet?",
        a: "The Kids' Closet lets you create separate closet profiles for each child in your household. Each child gets their own six-section wardrobe, outfit planner, and donate bin — completely separate from the main closet.",
      },
      {
        q: "What is the Pet Closet?",
        a: "The Pet Closet lets you create a profile for each pet (dog, cat, or other) with their species, breed, weight, apparel size, and key measurements (back length, neck, and chest). Each pet gets its own wardrobe with pet-specific sections — Sweaters/Coats, Shirts/Tops, Costumes/Dresses, Bandanas/Bows, Booties/Paw Wear, and Collars/Harnesses — plus the outfit planner, travel pack, wish list, donate bin, and AI search, all kept separate from your main and kids' closets. You can share a pet's sizing info with sitters and family.",
      },
      {
        q: "Can I customize the look of each closet section?",
        a: "Yes. Each section card supports a custom background image so you can personalize the look of your wardrobe at a glance.",
      },
    ],
  },
  {
    heading: "Outfit Planning",
    items: [
      {
        q: "What is the Outfit Preview Panel?",
        a: "The Outfit Preview Panel is a virtual canvas where you can assemble outfits by selecting items from your closet sections. Build a look, save it, and share it — all without physically touching your wardrobe.",
      },
      {
        q: "What is Outfit of the Day?",
        a: "Outfit of the Day is a weekly planner that lets you assign outfits to each day of the week (Monday through Sunday). Pick items from any closet section, assign them to a day, and export the full plan as a shareable link.",
      },
      {
        q: "Can I share my outfit plans?",
        a: "Yes. Both the Outfit Preview Panel and the weekly Outfit of the Day planner can be exported as shareable links. Anyone with the link can view your plan — no account required.",
      },
      {
        q: "What is the Travel Pack Planner?",
        a: "The Travel Pack Planner helps you build a packing list for a trip by selecting outfits for each day of travel. You can also use the AI Packing Assistant to get smart suggestions based on your destination and trip length.",
      },
    ],
  },
  {
    heading: "AI Features",
    items: [
      {
        q: "What is the AI Stylist?",
        a: "The AI Stylist is a built-in fashion assistant powered by Claude (Anthropic). Ask it for outfit ideas, style tips for a specific occasion, seasonal advice, or how to mix and match pieces from your closet — and get instant, personalized responses.",
      },
      {
        q: "What is the AI Donation Advisor?",
        a: "The AI Donation Advisor helps you decide which items to donate by reviewing the pieces in your Donate Bin and giving thoughtful recommendations — considering factors like condition, usage, and wardrobe balance.",
      },
      {
        q: "What is the AI Packing Assistant?",
        a: "The AI Packing Assistant integrates with the Travel Pack Planner to suggest what to pack based on your trip details (destination, duration, occasion). It pulls from your closet categories to create practical, mix-and-match packing lists.",
      },
      {
        q: "Is my data used to train the AI?",
        a: "No. Conversations with the AI Stylist and other AI features are not used to train AI models. Your closet data remains private to your account.",
      },
    ],
  },
  {
    heading: "Shopping, Wish List & Donations",
    items: [
      {
        q: "What is the Shopping List?",
        a: "The Shopping List is a built-in checklist for clothing items you intend to buy. Add items manually, check them off as you shop, and share your list with a shareable link.",
      },
      {
        q: "What is the Wish List?",
        a: "The Wish List lets you save clothing items you love from any website by pasting the URL. WIMC pulls the product image, title, and description automatically so you have a visual collection of things you want.",
      },
      {
        q: "How does the Donate Bin work?",
        a: "Open the Donate Bin, browse your closet sections, and select items you'd like to donate. Once you're ready, tap 'Donate Items' to move them to your Donated Items history. You can save donation sets, share them, or get AI advice before committing.",
      },
    ],
  },
  {
    heading: "Weather & Video",
    items: [
      {
        q: "What is the Weather feature?",
        a: "The Weather modal shows the current conditions and a 7-day forecast for your location (or any city you search). It includes outfit suggestions based on the temperature and conditions so you can dress appropriately.",
      },
      {
        q: "What is the Video Bin?",
        a: "The Video Bin is a dedicated space for styling videos, haul videos, or any wardrobe-related video content you want to keep alongside your closet. Videos are stored securely and can be played directly in the app.",
      },
    ],
  },
  {
    heading: "Account & Privacy",
    items: [
      {
        q: "How is my data stored?",
        a: "Your account information is stored in Firebase (Google Cloud). Your clothing photos and videos are stored on Cloudinary, a secure media hosting service. GingerFaith LLC does not sell or share your personal data with third parties.",
      },
      {
        q: "Can I delete my account?",
        a: "Yes. To request account deletion and removal of all associated data, contact us at support@gingerfaithllc.com. We will process your request within 7 business days.",
      },
      {
        q: "How do I update my profile information?",
        a: "Tap your profile icon in the header to access User Settings. From there you can update your display name, email address, and profile photo.",
      },
    ],
  },
  {
    heading: "Plans & Pricing",
    items: [
      {
        q: "Is WIMC free to use?",
        a: "WIMC offers a free tier with access to core closet organization features. A Pro subscription unlocks all features including AI tools, the Kids' Closet, Travel Pack Planner, Donate Bin, Wish List, Video Bin, and unlimited uploads.",
      },
      {
        q: "How much does the Pro plan cost?",
        a: "The Pro plan is $4.99 per month. Full subscription details and billing will be available shortly — stay tuned for the official launch announcement.",
      },
      {
        q: "How do I cancel my subscription?",
        a: "You can cancel anytime from your account's Billing portal — no cancellation fees, no questions asked. Your Pro access continues until the end of the current billing period.",
      },
      {
        q: "Do you offer refunds?",
        a: "If you experience a technical issue that prevents you from using the app, contact support@gingerfaithllc.com within 7 days of your charge and we will review your case promptly.",
      },
    ],
  },
];

export default function FAQ() {
  const navigate = useNavigate();
  const [openMap, setOpenMap] = useState({});

  const toggle = (key) =>
    setOpenMap((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <main className="faq-page">
      <div className="faq-page__hero">
        <button
          className="faq-page__back"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          ✕
        </button>
        <h1 className="faq-page__title">Frequently Asked Questions</h1>
        <p className="faq-page__subtitle">
          Everything you need to know about What's in My Closet.
          Can't find your answer?{" "}
          <a href="mailto:support@gingerfaithllc.com" className="faq-page__link">
            Email us
          </a>
          .
        </p>
      </div>

      <div className="faq-page__body">
        {SECTIONS.map((section) => (
          <section key={section.heading} className="faq-section">
            <h2 className="faq-section__heading">{section.heading}</h2>
            <div className="faq-section__items">
              {section.items.map((item, i) => {
                const key = `${section.heading}-${i}`;
                const isOpen = !!openMap[key];
                return (
                  <div
                    key={key}
                    className={`faq-item${isOpen ? " faq-item--open" : ""}`}
                  >
                    <button
                      className="faq-item__q"
                      onClick={() => toggle(key)}
                      aria-expanded={isOpen}
                    >
                      <span>{item.q}</span>
                      <span className="faq-item__icon" aria-hidden="true">
                        {isOpen ? "−" : "+"}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="faq-item__a">
                        <p>{item.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
