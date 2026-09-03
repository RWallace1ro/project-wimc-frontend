import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import useCloseStandalonePage from "../utils/useCloseStandalonePage";
import "./FAQ.css";

// Same reasoning as Pricing.js/UpgradeModal.js/WIMCAssistant.js — Apple
// treats naming a specific paid tier or price in the native app's UI as an
// implicit offer to sell it, requiring a registered Apple In-App Purchase
// product. Every tier name/price mention below is genericized on native.
const NATIVE_PLATFORM = Capacitor.isNativePlatform();

const SECTIONS = [
  {
    heading: "Getting Started",
    items: [
      {
        q: "What is What's In My Closet (WIMC)?",
        a: "What's In My Closet is a personal closet management app that lets you photograph, organize, and plan outfits from your clothing collection. It includes AI-powered styling advice, a Try-On Studio for recording outfit videos with AI style feedback, a travel packing planner, a donation manager, a wish list, a shopping list, and more — all in one place.",
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
        a: "Open any closet section card (e.g. Tops, Dresses/Skirts), choose the sub-section you want (e.g. T-Shirts under Tops), and tap '+ Add'. You can upload a photo or video directly from your device, capture one with your camera, or paste an image link from the web. Items are stored securely and appear in that sub-section immediately.",
      },
    ],
  },
  {
    heading: "Closet Organization",
    items: [
      {
        q: "What closet sections are available?",
        a: "Your main closet is divided into eight sections: Dresses/Skirts, Dress Shirts/Suits, Shoes/Sneakers, Pants/Jeans, Tops, Bags/Accessories, Jackets/Coats, and Blazers — the same set for everyone. Each section stores both photos and videos of your items.",
      },
      {
        q: "What are sub-sections?",
        a: "Every section card is split into sub-sections so you can organize at a finer level — for example, Tops includes Shirts, T-Shirts, and Sweaters; Shoes/Sneakers includes Sneakers, Heels, and Sandals/Slides. Tap a sub-section pill at the top of a section to view or add items there. Sub-sections are also available in each child's closet. When the feature first appears, your existing items show under the first sub-section — just use the Move button to sort them into the right one.",
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
        a: "The Kids' Closet lets you create separate closet profiles for each child in your household. Each child gets their own six-section closet, outfit planner, and donate bin — completely separate from the main closet.",
      },
      {
        q: "What is the Pet Closet?",
        a: "The Pet Closet lets you create a profile for each pet (dog, cat, or other) with their species, breed, weight, apparel size, and key measurements (back length, neck, and chest). Each pet gets its own closet with pet-specific sections — Sweaters/Coats, Shirts/Tops, Costumes/Dresses, Bandanas/Bows, Booties/Paw Wear, and Collars/Harnesses — plus the outfit planner, travel pack, wish list, donate bin, and AI search, all kept separate from your main and kids' closets. You can share a pet's sizing info with sitters and family.",
      },
      {
        q: "Can I customize the look of each closet section?",
        a: "Yes. Each section card supports a custom background image so you can personalize the look of your closet at a glance.",
      },
    ],
  },
  {
    heading: "Outfit Planning",
    items: [
      {
        q: "What is the Outfit Preview Panel?",
        a: "The Outfit Preview Panel is a virtual canvas where you can assemble outfits by selecting items from your closet sections. Build a look, save it, and share it — all without physically touching your closet.",
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
        a: "The AI Donation Advisor helps you decide which items to donate by reviewing the pieces in your Donate Bin and giving thoughtful recommendations — considering factors like condition, usage, and closet balance.",
      },
      {
        q: "What is the AI Packing Assistant?",
        a: "The AI Packing Assistant integrates with the Travel Pack Planner to suggest what to pack based on your trip details (destination, duration, occasion). It pulls from your closet categories to create practical, mix-and-match packing lists.",
      },
      {
        q: "What is AI Closet Search?",
        a: "AI Closet Search lets you search your closet in plain English — for example, 'a casual outfit for the weekend' or 'show me my black dresses.' It identifies the right sections and uses AI vision to surface the matching items. You can save searches to revisit later and tap any image to view it full-screen.",
      },
      {
        q: "What is AI Style Feedback?",
        a: "After you record or upload a try-on video in the Try-On Studio, AI Style Feedback gives you personalized coaching — what's working, style tips, and how to complete the look. The Try-On Studio is a Pro feature.",
      },
      {
        q: "What is the WIMC Assistant?",
        a: "The WIMC Assistant is a floating help chatbot (the robot button) available on every signed-in page. Ask it how any feature works and it will guide you. It has its own daily limit, separate from the styling AI tools.",
      },
      {
        q: "How many AI requests do I get?",
        a: NATIVE_PLATFORM
          ? "AI usage is set by your plan and resets daily. This pool covers the AI Stylist, Packing Assistant, Donation Advisor, Closet Search, and Style Feedback. If you reach your limit, you can upgrade for more (managed through our website) or wait until the next day."
          : "AI usage is set by your plan and resets daily: Free includes 3 AI requests per day, Pro includes 10 per day, and Pro + AI includes 50 per day. This pool covers the AI Stylist, Packing Assistant, Donation Advisor, Closet Search, and Style Feedback. If you reach your limit, you can upgrade for more or wait until the next day.",
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
      {
        q: "What do 'Load' and 'Merge' do on a saved donation set (or a saved outfit look)?",
        a: "'Load' replaces your current selection with the saved set's items. 'Merge' adds the saved set's items into your current selection, keeping what's already there. The same Load/Merge choice is available when importing a link in Outfit Preview.",
      },
    ],
  },
  {
    heading: "Try-On, Receipts, Weather & Video",
    items: [
      {
        q: "What is the Try-On Studio?",
        a: `The Try-On Studio (🎬 Try On) lets you record an outfit video using your front or rear camera, or upload one. Each video can be saved to your Video Bin, and you can request AI Style Feedback on it. ${NATIVE_PLATFORM ? "This requires a paid plan, managed through our website." : "The Try-On Studio is a Pro feature."}`,
      },
      {
        q: "What is the Carousel?",
        a: `The Carousel (🎞️ Carousel) is a full-screen, ambient slideshow of every photo across your closet — great as a background display, or cast to a TV via AirPlay/Chromecast. You can play/pause, adjust the speed, and turn on optional background music (with volume control, or use your own audio file for that session). ${NATIVE_PLATFORM ? "This requires a paid plan, managed through our website." : "The Carousel is a Pro feature."}`,
      },
      {
        q: "What is the Receipts tracker?",
        a: `The Receipts tracker (🧾 Receipts) lets you store purchase receipts as photos, PDFs, or notes, filter them by category or return status, mark items as returned, and back up or restore your receipts across devices. ${NATIVE_PLATFORM ? "This requires a paid plan, managed through our website." : "Receipts is a Pro feature."}`,
      },
      {
        q: "What is the Weather feature?",
        a: "The Weather modal shows the current conditions and a 7-day forecast for your location (or any city you search). It includes outfit suggestions based on the temperature and conditions so you can dress appropriately. Your location is only sent to the weather-data providers to fetch that forecast — it isn't stored on our servers or linked to your account.",
      },
      {
        q: "What is the Video Bin?",
        a: `The Video Bin is a dedicated space for styling videos, haul videos, or try-on recordings you want to keep alongside your closet. Videos are stored securely and can be played directly in the app. ${NATIVE_PLATFORM ? "This requires a paid plan, managed through our website." : "The Video Bin is a Pro feature."}`,
      },
    ],
  },
  {
    heading: "Account & Privacy",
    items: [
      {
        q: "How is my data stored?",
        a: "Your account information is stored in Firebase (Google Cloud), and your clothing photos and videos are stored using Cloudinary, a secure media-hosting service. Both are service providers that process and host this data on our behalf — they don't use it for their own purposes. GingerFaith™ LLC does not sell your personal data or share it with third parties for marketing or advertising.",
      },
      {
        q: "Can I delete my account?",
        a: "Yes. Tap your profile icon in the header, open User Settings, and go to the Delete Account tab. After you confirm (by typing DELETE and re-entering your password), your account and all associated data — closet photos and videos, saved plans, and profile — are permanently removed. If you'd prefer we handle it, email wimcsupport@gingerfaith.com.",
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
        a: NATIVE_PLATFORM
          ? "Yes — the free plan includes all eight closet sections (with sub-sections), up to 50 photo uploads, basic outfit preview, weather-based suggestions, the Shopping List and Wish List, and a daily taste of the AI Stylist. Additional features are available with a paid plan, managed through our website."
          : "Yes — the Free plan includes all eight closet sections (with sub-sections), up to 50 photo uploads, basic outfit preview, weather-based suggestions, the Shopping List and Wish List, and a daily taste of the AI Stylist (3 requests per day). Upgrading unlocks unlimited uploads and the Pro features below.",
      },
      {
        q: "What are the plans and what's included?",
        a: NATIVE_PLATFORM
          ? "There's a free plan with core closet organization, Shopping List, Wish List, and limited daily AI requests. Paid plans unlock unlimited uploads, the Kids' Closet and Pet Closet, Travel Pack Planner, Outfit of the Day, Donate Bin history, Video Bin, Try-On Studio, the Carousel slideshow, the Receipts tracker, and more AI requests per day. Full plan details and subscribing are handled through our website, not in this app."
          : "There are three plans. Free ($0): core closet organization, Shopping List, Wish List, and 3 AI requests/day. Pro ($4.99/mo or $39.99/yr): everything in Free plus unlimited uploads, the Kids' Closet and Pet Closet, Travel Pack Planner, Outfit of the Day, Donate Bin history, Video Bin, Try-On Studio, the Carousel slideshow, the Receipts tracker, and 10 AI requests/day. Pro + AI ($7.99/mo or $79.99/yr): everything in Pro plus 50 AI requests/day, the full AI suite, unlimited kids' profiles, and priority access to new features.",
      },
      {
        q: "How much does the Pro plan cost?",
        a: NATIVE_PLATFORM
          ? "Pricing is managed through our website — please visit it on a web browser to see current plan pricing and subscribe."
          : "Pro is $4.99 per month (or $39.99 per year), and Pro + AI is $7.99 per month (or $79.99 per year). You can manage or change your plan anytime from the Billing portal in your account settings.",
      },
      {
        q: "How do I cancel my subscription?",
        a: NATIVE_PLATFORM
          ? "You can cancel anytime from your account's Billing portal on our website — no cancellation fees, no questions asked. Your paid access continues until the end of the current billing period."
          : "You can cancel anytime from your account's Billing portal — no cancellation fees, no questions asked. Your Pro access continues until the end of the current billing period.",
      },
      {
        q: "Do you offer refunds?",
        a: "If you experience a technical issue that prevents you from using the app, contact wimcsupport@gingerfaith.com within 7 days of your charge and we will review your case promptly.",
      },
    ],
  },
];

export default function FAQ() {
  const closePage = useCloseStandalonePage();
  const [openMap, setOpenMap] = useState({});

  const toggle = (key) =>
    setOpenMap((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <main className="faq-page">
      <div className="faq-page__hero">
        <button
          className="faq-page__back"
          onClick={closePage}
          aria-label="Go back"
        >
          ✕
        </button>
        <h1 className="faq-page__title">Frequently Asked Questions</h1>
        <p className="faq-page__subtitle">
          Everything you need to know about What's In My Closet.
          Can't find your answer?{" "}
          <Link to="/contact" className="faq-page__link">Contact us</Link>
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
