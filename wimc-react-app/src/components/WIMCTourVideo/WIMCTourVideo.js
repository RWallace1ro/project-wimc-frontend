import React, { useState, useEffect, useRef, useCallback } from "react";
import { syncSetItem } from "../../utils/syncStore";
import "./WIMCTourVideo.css";
 
// ── Slide data ────────────────────────────────────────────────────────────────
const SLIDES = [
  {
    id: "welcome",
    label: "Welcome",
    // dur = narration length + ~3.5s pause before auto-advancing (was
    // padded much higher, leaving a 5-7s silent gap on every slide).
    dur: 18,
    icon: "👗👔",
    title: "WIMC™",
    subtitle: "What's In My Closet",
    tags: [
      "🔐 Secure Auth","👗👔 Smart Closet","✨ 5 AI Features","🎬 Try-On Studio","🎞️ Carousel",
      "👶 Kids' Closet","🐾 Pet Closet","🛒 Shopping List","📋 Wish List","🗑️ Donate Bin",
      "🌤️ Weather","⚙️ Settings","🔍 Closet Search","👗👔 Outfit Preview",
      "📅 Outfit Planner","✈️ Travel Pack","🧾 Receipts","📹 Video Bin",
    ],
    features: [],
    type: "title",
  },
  {
    id: "auth",
    label: "Authentication",
    dur: 18,
    icon: "🔐",
    title: "Authentication",
    type: "feature",
    mockupTitle: "WIMC™ — Sign In",
    features: ["Sign Up & Login flow","Firebase Authentication","Email verification & password reset","Avatar photo upload","Edit profile in Settings","Password change + strength meter"],
    featureIcons: ["✅","🔑","📧","📷","✏️","🔄"],
  },
  {
    id: "closet",
    label: "Smart Closet",
    dur: 20,
    icon: "👗",
    title: "Smart Closet",
    type: "feature",
    mockupTitle: "My Closet",
    features: ["8 clothing categories","Bags · Accessories · Fragrance","Images & video uploads","Per-section custom backgrounds","Color palette + photo presets","Try-On button per section","AI Natural Language Search"],
    featureIcons: ["📦","👜","🖼️","🎨","🌈","🎬","🔍"],
  },
  {
    id: "search",
    label: "Closet Search",
    dur: 16,
    icon: "🔍",
    title: "Closet Search",
    type: "feature",
    mockupTitle: "🔍 Closet Search",
    features: ["AI Natural Language Search","Search across all categories","Filter by color, type & season","Instant results as you type","Open item directly from results","Works with photos & videos"],
    featureIcons: ["🤖","📦","🎨","⚡","👆","📷"],
  },
  {
    id: "outfit-preview",
    label: "Outfit Preview",
    dur: 14,
    icon: "👗",
    title: "Outfit Preview",
    type: "feature",
    mockupTitle: "👗 Outfit Preview",
    features: ["Build outfits from your closet","Tap to select items","Favorites & saved looks","Share outfit with a link","Print any outfit you create"],
    featureIcons: ["👗","👆","⭐","🔗","🖨️"],
  },
  {
    id: "outfit-planner",
    label: "Outfit Planner",
    dur: 13,
    icon: "📅",
    title: "Outfit Planner",
    type: "feature",
    mockupTitle: "📅 7-Day Outfit Planner",
    features: ["Plan outfits for each day","7-day weekly view","Assign saved outfits to a day","Export or import your plan","See your week at a glance"],
    featureIcons: ["📅","🗓️","👗","📤","👀"],
  },
  {
    id: "travel-pack",
    label: "Travel Pack",
    dur: 13,
    icon: "✈️",
    title: "Travel Pack Planner",
    type: "feature",
    mockupTitle: "✈️ Travel Pack Planner",
    features: ["Plan exactly what to pack","AI Packing Assistant","Suggestions based on your trip","Check items off as you pack","Never overpack or forget an item"],
    featureIcons: ["🧳","🤖","✈️","✅","👗"],
  },
  {
    id: "ai",
    label: "AI Features",
    dur: 23,
    icon: "✨",
    title: "Five AI Features",
    type: "feature",
    mockupTitle: "✨ AI Features",
    features: ["AI Outfit Stylist chat","AI Packing Assistant","Smart Donation Advisor","AI Try-On Style Feedback","Natural Language Search","Shopping: Suggest items","Shopping: Budget analysis","Shopping: Prioritize list"],
    featureIcons: ["💬","🧳","🗑️","🎬","🔍","💡","💰","🎯"],
  },
  {
    id: "tryon",
    label: "Try-On Studio",
    dur: 25,
    icon: "🎬",
    title: "Try-On Studio",
    type: "feature",
    mockupTitle: "🎬 Try-On Studio",
    features: ["Live camera recording","Front / rear camera toggle","Upload & cloud storage","AI Style Feedback (4 sections)","Timestamps & custom titles","Download & share videos"],
    featureIcons: ["📸","🔄","☁️","✨","🕐","⬇️"],
  },
  {
    id: "carousel",
    label: "Carousel",
    dur: 21,
    icon: "🎞️",
    title: "Carousel",
    type: "feature",
    mockupTitle: "🎞️ Carousel",
    features: ["Ambient closet slideshow","Cast to your TV","Adjustable playback speed","Add your own background music","Ever-changing display of your closet"],
    featureIcons: ["🎞️","📺","⏩","🎵","🔄"],
  },
  {
    id: "video-bin",
    label: "Video Bin",
    dur: 19,
    icon: "📹",
    title: "Video Bin",
    type: "feature",
    mockupTitle: "📹 Video Bin",
    features: ["All your Try-On videos in one place","Grid or list view","Custom titles & timestamps","Download & share favorites","Browse by date"],
    featureIcons: ["📹","🗂️","🏷️","⬇️","📅"],
  },
  {
    id: "wishlist",
    label: "Wish List",
    dur: 15,
    icon: "📋",
    title: "Wish List",
    type: "feature",
    mockupTitle: "📋 Wish List",
    features: ["Save items you want to add","URL previews for saved items","Add notes & priorities","Share your list via link"],
    featureIcons: ["📋","🔗","📝","📤"],
  },
  {
    id: "donate-bin",
    label: "Donate Bin",
    dur: 15,
    icon: "🗑️",
    title: "Donate Bin",
    type: "feature",
    mockupTitle: "🗑️ Donate Bin",
    features: ["Move items you're ready to donate","AI Smart Donation Advisor","Bulk donate with one tap","Declutter with purpose"],
    featureIcons: ["🗑️","🤖","✅","♻️"],
  },
  {
    id: "shopping",
    label: "Shopping List",
    dur: 17,
    icon: "🛒",
    title: "Shopping & Wish List",
    type: "feature",
    mockupTitle: "🛒 Shopping List",
    features: ["3 default categories","Unlimited custom categories","300+ emoji across 10 groups","4 AI modes built-in","Share list via link","Download JSON / copy text","Import shared lists"],
    featureIcons: ["🛒","➕","😀","🤖","🔗","⬇️","📥"],
  },
  {
    id: "kids",
    label: "Kids' Closet",
    dur: 14,
    icon: "👶",
    title: "Kids' Closet",
    type: "feature",
    mockupTitle: "👶 Kids' Closet",
    features: ["Baby, Toddler, Kids, Teen profiles","US & EU sizing side-by-side","Per-child closet sections","14-day soft delete & restore","Share size cards via link","Add photos to each child's closet"],
    featureIcons: ["👶","📏","👗","♻️","📤","📷"],
  },
  {
    id: "pets",
    label: "Pet Closet",
    dur: 22,
    icon: "🐾",
    title: "Pet Closet",
    type: "feature",
    mockupTitle: "🐾 Pet Closet",
    features: ["Dog, Cat & Other profiles","Apparel size + back/neck/chest","Pet-specific closet sections","Outfit planner, travel pack & more","14-day soft delete & restore","Share sizing with sitters & family"],
    featureIcons: ["🐕","📏","🧥","📅","♻️","📤"],
  },
  {
    id: "receipts",
    label: "Receipts",
    dur: 17,
    icon: "🧾",
    title: "Receipts",
    type: "feature",
    mockupTitle: "🧾 Receipts",
    features: ["Add a photo, PDF, or forward by email","Filter by store or category","Attach receipts to clothing items","Keep every purchase organized"],
    featureIcons: ["📷","🔍","🔗","🧾"],
  },
  {
    id: "weather",
    label: "Weather",
    dur: 13,
    icon: "🌤️",
    title: "Weather",
    type: "feature",
    mockupTitle: "🌤️ Weather",
    features: ["Current conditions + 7-day forecast","Available right from the header","Plan outfits around tomorrow's weather","Quick access anytime"],
    featureIcons: ["🌤️","📍","👗","⚡"],
  },
  {
    id: "settings",
    label: "Settings & More",
    dur: 22,
    icon: "⚙️",
    title: "Settings & More",
    type: "feature",
    mockupTitle: "⚙️ Settings · 💬 Assistant",
    features: ["Edit profile & upload avatar","Password + strength meter","Page & card backgrounds","Manage subscription (Pro / Pro + AI)","WIMC Assistant help bot on every page","Secure account deletion flow"],
    featureIcons: ["🖼️","🔒","🎨","💳","💬","🔐"],
  },
];

// Maps each welcome-slide tag label → the slide id it should jump to
const TAG_TO_SLIDE = {
  "🔐 Secure Auth":   "auth",
  "👗👔 Smart Closet":  "closet",
  "✨ 5 AI Features": "ai",
  "🎬 Try-On Studio": "tryon",
  "🎞️ Carousel":     "carousel",
  "👶 Kids' Closet":  "kids",
  "🐾 Pet Closet":    "pets",
  "🛒 Shopping List": "shopping",
  "📋 Wish List":     "wishlist",
  "🗑️ Donate Bin":    "donate-bin",
  "🌤️ Weather":       "weather",
  "⚙️ Settings":      "settings",
  "🔍 Closet Search": "search",
  "👗👔 Outfit Preview":"outfit-preview",
  "📅 Outfit Planner":"outfit-planner",
  "✈️ Travel Pack":   "travel-pack",
  "🧾 Receipts":      "receipts",
  "📹 Video Bin":     "video-bin",
};

const SPEED_OPTIONS = [
  { label: "0.5×", val: 0.5 },
  { label: "0.75×", val: 0.75 },
  { label: "0.9×", val: 0.9 },
  { label: "1×",   val: 1   },
  { label: "1.5×", val: 1.5 },
  { label: "2×",   val: 2   },
];

const SCRIPTS = [
  "Welcome to WIMC — What's In My Closet! This is your complete AI-powered closet manager. From smart closets and outfit planning to kids' closets, shopping lists, weather, and more — let me show you everything.",
  "WIMC starts with secure authentication powered by Firebase. Sign up or log in, verify your email, and reset your password anytime. Upload a profile photo and update your account from Settings.",
  "Your closet is organized into eight smart categories. The Bags and Accessories card even splits into Bags, Accessories, and Fragrance. Upload photos and videos to the cloud, and customize each section's background with photo presets or a color palette.",
  "Use Closet Search to find any item instantly with AI Natural Language Search. Search across all categories, filter by color, type, or season, and open any item directly from results.",
  "The Outfit Preview Panel lets you build looks by tapping items to select them. Save favorites, share your outfit, and print any look you create.",
  "Plan your whole week ahead with the 7-day Outfit Planner. Assign outfits to each day, and export or import your plans anytime.",
  "The Travel Pack Panel helps you pack smarter for any trip, with an AI Packing Assistant that suggests exactly what you'll need.",
  "WIMC has five AI features built in — an AI Stylist that can build a full outfit from your own closet, Natural Language Search, a Smart Donation Advisor, AI Style Feedback after try-ons, and a full AI Shopping Assistant. Your plan sets how many AI requests you get each day.",
  "The Try-On Studio lets you record outfit videos using your front or rear camera. After recording, get personalized AI Style Feedback covering what works, style tips, and how to complete the look.",
  "The Carousel turns your whole closet into a full-screen ambient slideshow — great as a background display, or cast to a TV. Adjust the speed, and even add your own background music.",
  "Every video you record lives in your Video Bin, browsable in a grid or list view with custom titles and timestamps. Download or share your favorites anytime.",
  "The Wish List stores items you want with URL previews and priority notes — shareable via link.",
  "The Donate Bin lets you collect items for donation, with an AI advisor to help you decide what to let go.",
  "The Shopping List has three built-in categories plus unlimited custom ones with over 300 emoji to choose from. Use four AI modes to suggest items, analyze your budget, or prioritize your list.",
  "Kids' Closet lets you manage clothing profiles for each child, with US and EU sizing shown side by side. Deleted profiles stay recoverable for 14 days.",
  "The Pet Closet gives each pet its own profile and closet — track species, breed, apparel size, and key measurements like back, neck, and chest, with pet-specific sections like Sweaters, Bandanas, and Collars. Share sizing with sitters and family.",
  "The Receipts page stores all your shopping receipts by photo, PDF, or email, filterable by store and category.",
  "The Weather panel in the header gives you a current forecast plus a 7-day outlook, so you can plan your outfits around tomorrow's weather.",
  "Settings gives you full control over your profile, password, and app appearance, and lets you manage your subscription. And the WIMC Assistant — the little chat bubble on every page — answers your how-to questions anytime. That's WIMC, your complete closet companion!",
];
 
const TOTAL_DUR = SLIDES.reduce((a, s) => a + s.dur, 0);
 
// ── Avatar SVG — caramel-skinned female ──────────────────────────────────────
function Avatar({ talking }) {
  // Purple presenter robot — matches the help-bot palette. It periodically
  // glances up-right at the video and back to the audience, sways gently, and
  // blinks. The mouth opens while `talking`.
  const body   = "#c4b5fd";
  const bodyDk = "#a78bfa";
  const face   = "#1e293b";

  return (
    <svg viewBox="0 0 80 96" xmlns="http://www.w3.org/2000/svg" className="tour-avatar-svg tour-bot">
      {/* Backing panel for contrast */}
      <rect x="5" y="8" width="70" height="82" rx="16" fill="#2a2150" opacity="0.5" />

      {/* Body sways as a whole */}
      <g className="tour-bot__body">
        {/* Torso */}
        <rect x="23" y="60" width="34" height="32" rx="12" fill={bodyDk} />
        <rect x="31" y="69" width="18" height="12" rx="5" fill={body} opacity="0.85" />
        {/* Arms */}
        <path d="M23 67 q-7 2 -8.5 12" stroke={bodyDk} strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M57 67 q7 2 8.5 12" stroke={bodyDk} strokeWidth="5" strokeLinecap="round" fill="none" />

        {/* Head turns toward the video and back */}
        <g className="tour-bot__head">
          {/* Antenna */}
          <line x1="40" y1="15" x2="40" y2="22" stroke={body} strokeWidth="2" strokeLinecap="round" />
          <circle cx="40" cy="12.5" r="2.8" fill={body} />
          {/* Head shell */}
          <rect x="19" y="22" width="42" height="35" rx="14" fill={body} />
          {/* Ears */}
          <rect x="15" y="35" width="4.5" height="10" rx="2.2" fill={bodyDk} />
          <rect x="60.5" y="35" width="4.5" height="10" rx="2.2" fill={bodyDk} />

          {/* Eye whites */}
          <ellipse cx="32" cy="38" rx="5.2" ry="5.6" fill="#fff" />
          <ellipse cx="48" cy="38" rx="5.2" ry="5.6" fill="#fff" />
          {/* Pupils shift to "look" around */}
          <g className="tour-bot__pupils">
            <circle cx="32" cy="38.5" r="2.6" fill={face} />
            <circle cx="48" cy="38.5" r="2.6" fill={face} />
            <circle cx="33.1" cy="37" r="0.9" fill="#fff" />
            <circle cx="49.1" cy="37" r="0.9" fill="#fff" />
          </g>
          {/* Eyelids drop to blink (same color as head; collapsed = invisible) */}
          <rect className="tour-bot__lid" x="26.6" y="31.4" width="10.8" height="12" rx="5.4" fill={body} />
          <rect className="tour-bot__lid" x="42.6" y="31.4" width="10.8" height="12" rx="5.4" fill={body} />

          {/* Mouth — opens when talking */}
          <path
            d={talking ? "M34 49 Q40 53.5 46 49" : "M34 49 Q40 50.6 46 49"}
            stroke={face} strokeWidth="1.8" fill="none" strokeLinecap="round"
          />
          {/* Cheeks */}
          <circle cx="25.5" cy="45.5" r="2.1" fill="#f0abfc" opacity="0.5" />
          <circle cx="54.5" cy="45.5" r="2.1" fill="#f0abfc" opacity="0.5" />
        </g>
      </g>
    </svg>
  );
}
 
// ── Slide content ─────────────────────────────────────────────────────────────
function TitleSlide({ slide }) {
  return (
    <div className="tour-title-slide">
      <div className="tour-title-logo">{slide.icon}</div>
      <div className="tour-title-name">{slide.title}</div>
      <div className="tour-title-sub">{slide.subtitle}</div>
      <div className="tour-title-tags">
        {slide.tags.map((t) => (
          <span key={t} className="tour-tag">{t}</span>
        ))}
      </div>
    </div>
  );
}
 
function FeatureSlide({ slide }) {
  return (
    <div className="tour-feature-slide">
      {/* Left: mockup */}
      <div className="tour-mockup">
        <div className="tour-mockup-bar">
          <span className="tour-mockup-title">{slide.mockupTitle}</span>
          <div className="tour-mockup-dots">
            <span style={{ background: "#ef4444" }} />
            <span style={{ background: "#f59e0b" }} />
            <span style={{ background: "#22c55e" }} />
          </div>
        </div>
        <div className="tour-mockup-body">
          <MockupContent id={slide.id} />
        </div>
      </div>
      {/* Right: feature list */}
      <div className="tour-feat-panel">
        <div className="tour-feat-title">{slide.icon} {slide.title}</div>
        <ul className="tour-feat-list">
          {slide.features.map((f, i) => (
            <li key={f}>
              <span className="tour-feat-icon">{slide.featureIcons[i]}</span>
              {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
 
// Individual mockup bodies
function MockupContent({ id }) {
  switch (id) {
    case "auth":
      return (
        <div className="mc-auth">
          <div className="mc-auth-avatar">👤</div>
          <div className="mc-auth-heading">Welcome Back</div>
          <div className="mc-field">📧 Email address</div>
          <div className="mc-field mc-field--active">🔒 ••••••••</div>
          <div className="mc-btn">Log In to My Closet</div>
          <div className="mc-secure">🔒 SHA-256 encrypted · Secure session · Avatar sync</div>
        </div>
      );
    case "closet":
      return (
        <div>
          <div className="mc-card-grid mc-card-grid--eight">
            {[["👗","#2d1b4e","Dresses"],["👔","#1a2440","Dress Shirts"],["👟","#1a2e4a","Shoes"],["👖","#1a3a2a","Pants"],["👚","#2d2010","Tops"],["👜","#2a1a2e","Bags"],["🧥","#1a1a2e","Jackets"],["🧳","#2a2010","Blazers"]].map(([e,bg,l])=>(
              <div className="mc-card" key={l}>
                <div className="mc-card-img" style={{background:bg}}>{e}</div>
                <div className="mc-card-lbl">{l}</div>
              </div>
            ))}
          </div>
          <div className="mc-bg-row">
            <span className="mc-bg-label">🎨 Custom Backgrounds</span>
            <div className="mc-bg-swatches">
              {["#7c3aed","#0369a1","#d97706","#FFE4E1","#B2C5B2"].map(c=>(
                <div key={c} className="mc-swatch" style={{background:c, border: c==="#FFE4E1" ? "1px solid #555":undefined}}/>
              ))}
            </div>
          </div>
        </div>
      );
    case "outfit-preview":
      return (
        <div>
          <div className="mc-panel">
            <div className="mc-panel-title" style={{color:"#7c3aed"}}>Current Selection</div>
            <div className="mc-chips">
              {["Blue Wrap Dress","Nude Heels","Gold Clutch"].map(c=>(
                <span key={c} className="mc-chip mc-chip--active">{c}</span>
              ))}
            </div>
          </div>
        </div>
      );
    case "outfit-planner":
      return (
        <div>
          <div className="mc-panel">
            <div className="mc-panel-title" style={{color:"#0369a1"}}>📅 Weekly Planner</div>
            <div className="mc-week">
              {["M","T","W","T","F","S","S"].map((d,i)=>(
                <div key={i} className="mc-day">
                  <div className="mc-day-lbl" style={{color:i<2||i===3||i===4?"#7c3aed":"#334155"}}>{d}</div>
                  <div className="mc-day-bar" style={{background:i<2||i===3||i===4?"#2d1b4e":"#1e293b"}}/>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    case "travel-pack":
      return (
        <div>
          <div className="mc-panel">
            <div className="mc-panel-title" style={{color:"#d97706"}}>✈️ Travel Pack</div>
            <div className="mc-chips"><span className="mc-chip">Paris — 5 days</span><span className="mc-chip">12 items packed</span></div>
          </div>
        </div>
      );
    case "ai":
      return (
        <div>
          <div className="mc-bubble mc-bubble--user">What should I wear to a garden party?</div>
          <div className="mc-bubble mc-bubble--ai">
            <div className="mc-bubble-label">✨ AI Stylist</div>
            Your floral wrap dress with nude heels and a woven bag — effortlessly chic for a summer garden party!
          </div>
          <div className="mc-ai-grid">
            {[["🔍 Smart Search","#7c3aed",'"casual summer" → Tops'],["🗑️ Donation AI","#ef4444","4-question advisor"],["🛒 Shopping AI","#059669","Suggest · Budget · Prioritize"],["🎬 Style Feedback","#d97706","Post try-on coaching"]].map(([t,c,s])=>(
              <div key={t} className="mc-ai-card">
                <div style={{fontSize:8,color:c,fontWeight:700,marginBottom:2}}>{t}</div>
                <div style={{fontSize:7,color:"#64748b"}}>{s}</div>
              </div>
            ))}
          </div>
        </div>
      );
    case "tryon":
      return (
        <div>
          <div className="mc-camera">
            <div style={{fontSize:28}}>📸</div>
            <div className="mc-rec-badge">● REC 0:23</div>
            <div className="mc-camera-hint">Front camera — tap to switch</div>
          </div>
          <div className="mc-cam-btns">
            <div className="mc-cam-btn">⏹ Stop</div>
            <div className="mc-cam-btn mc-cam-btn--primary">⬇️ Save</div>
            <div className="mc-cam-btn">🔗 Share</div>
          </div>
          <div className="mc-ai-feedback">
            <div style={{fontSize:8,color:"#a78bfa",fontWeight:700,marginBottom:4}}>✨ AI Style Feedback</div>
            <div className="mc-chips">
              {["Work","Casual","Date Night","Weekend"].map(o=>(
                <span key={o} className="mc-chip">{o}</span>
              ))}
            </div>
          </div>
        </div>
      );
    case "carousel":
      return (
        <div>
          <div className="mc-card-grid mc-card-grid--eight">
            {[["👗","#2d1b4e"],["👔","#1a2440"],["👟","#1a2e4a"],["👖","#1a3a2a"],["👚","#2d2010"],["👜","#2a1a2e"],["🧥","#1a1a2e"],["🧳","#2a2010"]].map(([e,bg],i)=>(
              <div className="mc-card" key={i}>
                <div className="mc-card-img" style={{background:bg}}>{e}</div>
              </div>
            ))}
          </div>
          <div className="mc-panel" style={{marginTop:7}}>
            <div className="mc-chips">
              <span className="mc-chip">⏸ Pause</span>
              <span className="mc-chip">1.5×</span>
              <span className="mc-chip">🎵 Music</span>
            </div>
          </div>
        </div>
      );
    case "video-bin":
      return (
        <div>
          <div className="mc-kids-grid">
            <div className="mc-kid-card">
              <div style={{fontSize:16}}>🎬</div>
              <div className="mc-kid-name">Work Look</div>
              <div className="mc-kid-info">0:23 · Today</div>
            </div>
            <div className="mc-kid-card">
              <div style={{fontSize:16}}>🎬</div>
              <div className="mc-kid-name">Date Night</div>
              <div className="mc-kid-info">0:31 · Yesterday</div>
            </div>
          </div>
        </div>
      );
    case "wishlist":
      return (
        <div>
          <div className="mc-sl-items">
            <div className="mc-sl-item">
              <div className="mc-sl-check"/>
              <span>Suede ankle boots — link saved</span>
            </div>
            <div className="mc-sl-item">
              <div className="mc-sl-check"/>
              <span>Wool trench coat — high priority</span>
            </div>
          </div>
        </div>
      );
    case "donate-bin":
      return (
        <div>
          <div className="mc-ai-feedback">
            <div style={{fontSize:8,color:"#a78bfa",fontWeight:700,marginBottom:4}}>🤖 Smart Donation Advisor</div>
            <div className="mc-chips">
              <span className="mc-chip">Worn in last year?</span>
              <span className="mc-chip">Still fits?</span>
            </div>
          </div>
        </div>
      );
    case "kids":
      return (
        <div>
          <div className="mc-kids-grid">
            <div className="mc-kid-card">
              <div style={{fontSize:16}}>👧</div>
              <div className="mc-kid-name">Emma, 7</div>
              <div className="mc-kid-info">Kids · US 7 / EU 24</div>
              <div className="mc-chips" style={{marginTop:4}}>
                <span className="mc-chip mc-chip--small">Open Closet</span>
                <span className="mc-chip mc-chip--small">Share Sizes</span>
              </div>
            </div>
            <div className="mc-kid-card">
              <div style={{fontSize:16}}>👦</div>
              <div className="mc-kid-name">Liam, 3</div>
              <div className="mc-kid-info">Toddler · US 3T / EU 98</div>
              <div style={{fontSize:7,color:"#f59e0b",marginTop:4}}>⏳ 11 days until deleted</div>
            </div>
          </div>
        </div>
      );
    case "shopping":
      return (
        <div>
          <div className="mc-chips" style={{marginBottom:7}}>
            <span className="mc-chip mc-chip--active">👗 Clothing</span>
            <span className="mc-chip">✈️ Travel</span>
            <span className="mc-chip">🧸 Kids</span>
            <span className="mc-chip mc-chip--dashed">+ Custom</span>
          </div>
          <div className="mc-sl-items">
            <div className="mc-sl-item mc-sl-item--done">
              <div className="mc-sl-check mc-sl-check--done">✓</div>
              <span style={{textDecoration:"line-through",color:"#64748b"}}>Winter coat (AI suggested)</span>
            </div>
            <div className="mc-sl-item">
              <div className="mc-sl-check"/>
              <span>Ankle boots — Size 8</span>
            </div>
            <div className="mc-sl-item">
              <div className="mc-sl-check"/>
              <span>Cashmere turtleneck</span>
            </div>
          </div>
          <div className="mc-ai-modes">
            <div style={{fontSize:7,color:"#a78bfa",fontWeight:700,marginBottom:4}}>✨ AI Modes</div>
            <div className="mc-chips">
              {["💡 Suggest","💬 Chat","💰 Budget","🎯 Prioritize"].map(m=>(
                <span key={m} className="mc-chip">{m}</span>
              ))}
            </div>
          </div>
        </div>
      );
    case "receipts":
      return (
        <div>
          <div className="mc-sl-items">
            <div className="mc-sl-item">
              <div className="mc-sl-check mc-sl-check--done">✓</div>
              <span>Nordstrom — $128.00</span>
            </div>
            <div className="mc-sl-item">
              <div className="mc-sl-check mc-sl-check--done">✓</div>
              <span>Zara — $64.50</span>
            </div>
          </div>
        </div>
      );
    case "weather":
      return (
        <div>
          <div className="mc-panel">
            <div className="mc-panel-title" style={{color:"#0369a1"}}>🌤️ 72°F — Sunny</div>
            <div className="mc-chips">
              {["Mon 68°","Tue 71°","Wed 74°","Thu 70°"].map(d=>(
                <span key={d} className="mc-chip">{d}</span>
              ))}
            </div>
          </div>
        </div>
      );
    case "settings":
      // Mirrors the real Account Settings modal's actual tabs/layout
      // (UserSettingsModal.js) — Edit Profile, Change Password,
      // Appearance, Subscription, plus Delete Account below.
      return (
        <div>
          <div className="mc-settings-tabs mc-settings-tabs--four">
            {[["👤 Edit Profile",true],["🔒 Change Password",false],["🎨 Appearance",false],["💳 Subscription",false]].map(([l,a])=>(
              <div key={l} className={`mc-settings-tab${a?" mc-settings-tab--active":""}`}>{l}</div>
            ))}
          </div>
          <div className="mc-settings-danger">🗑️ Delete Account</div>
          <div className="mc-auth-avatar" style={{margin:"6px auto 3px"}}>👤</div>
          <div className="mc-auth-heading" style={{marginBottom:4}}>Tap 📷 to change photo</div>
          <div className="mc-field">Username</div>
          <div className="mc-field" style={{marginTop:4}}>Email address</div>
          <div className="mc-btn" style={{marginTop:6}}>Save Changes</div>
        </div>
      );
    default:
      return null;
  }
}
 
// ── Main component ────────────────────────────────────────────────────────────
const LS_SEEN_KEY = "wimc_tour_seen";
 
export default function WIMCTourVideo({ isOpen, onClose }) {
  // "lobby" = pre-tour screen; "playing" = tour running/paused
  const [tourPhase, setTourPhase]   = useState("lobby");
  const [curSlide, setCurSlide]     = useState(0);
  const [elapsed, setElapsed]       = useState(0);
  const [playing, setPlaying]       = useState(false);
  const [caption, setCaption]       = useState("");
  const [talking, setTalking]       = useState(false);
  const [speed, setSpeed]           = useState(1);

  const rafRef      = useRef(null);
  const lastTsRef   = useRef(null);
  const typeRef     = useRef(null);
  const talkRef     = useRef(null);
  const elapsedRef  = useRef(0);
  const playingRef  = useRef(false);
  const speedRef    = useRef(1);
  const uttRef      = useRef(null);   // Web Speech utterance
  const speechTokenRef = useRef(0);   // invalidates a stale sentence-chain when a new slide starts speaking
  const [voiceReady, setVoiceReady] = useState(false); // eslint-disable-line no-unused-vars
  const [muted, setMuted]           = useState(false);
  const mutedRef = useRef(false);
  const activeDotRef = useRef(null);

  // Keep the current slide's dot scrolled into view in the (now scrollable)
  // dots row as the tour auto-advances, so users aren't left staring at an
  // active dot that's scrolled off-screen.
  useEffect(() => {
    activeDotRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [curSlide]);
 
  const fmt = (s) => {
    const m = Math.floor(s / 60);
    return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  };
 
  const getSlideAt = (t) => {
    let acc = 0;
    for (let i = 0; i < SLIDES.length; i++) {
      acc += SLIDES[i].dur;
      if (t < acc) return i;
    }
    return SLIDES.length - 1;
  };
 
  const stopTalk = useCallback(() => {
    clearTimeout(talkRef.current);
    setTalking(false);
  }, []);
 
  // ── Pre-recorded narration (Google Cloud TTS Neural2) ───────────────────────
  // Generated once via scripts/gen-tour-audio (see public/tour-audio/), far
  // more natural than live browser text-to-speech and identical across every
  // device/browser instead of depending on whatever voices happen to be
  // installed locally. Falls back to the old Web Speech API approach below if
  // a file is missing or fails to play for any reason.
  const audioRef = useRef(null);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  // ── Web Speech API helpers (fallback only) ──────────────────────────────────
  const stopSpeech = useCallback(() => {
    speechTokenRef.current++; // invalidate any in-flight sentence chain
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    stopAudio();
  }, [stopAudio]);

  // Pick the most human-sounding English voice available, in priority order.
  const pickVoice = useCallback(() => {
    const voices = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith("en"));
    const byName = (re) => voices.find(v => re.test(v.name));
    return (
      // 1. Neural / "Natural" / "Online" voices — by far the most human
      byName(/natural|neural|online/i) ||
      // 2. Known high-quality named voices (Win / Mac / Chrome)
      byName(/aria|jenny|michelle|ava|samantha|allison|joanna|sonia|libby/i) ||
      // 3. Google's web voice (smoother than default system voices)
      byName(/google us english/i) ||
      byName(/google/i) ||
      // 4. Any other female-ish English voice
      byName(/female|woman|karen|victoria|moira|fiona|zira|susan|eva/i) ||
      // 5. Fallback: first English voice
      voices[0]
    );
  }, []);

  // TTS engines try to pronounce "WIMC" as a word ("wimm-see") instead of
  // spelling it out — insert spaces so it's read as individual letters.
  // Captions still display the real "WIMC" text; this only affects speech.
  const spokenForm = (s) => s.replace(/WIMC/g, "W I M C");

  const speakBrowserTTS = useCallback((text) => {
    if (!window.speechSynthesis || mutedRef.current) return;
    window.speechSynthesis.cancel();
    const myToken = ++speechTokenRef.current;
    const chosen = pickVoice();

    // Split into sentences and speak them as separate utterances with a real
    // pause in between — spoken as one continuous utterance, sentences (and
    // the next section's narration right after) ran together with no
    // breathing room at all.
    const sentences =
      text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) || [text];

    const speakSentence = (i) => {
      if (speechTokenRef.current !== myToken || i >= sentences.length) return;
      const utt = new SpeechSynthesisUtterance(spokenForm(sentences[i]));
      // Soft, natural delivery — slower and gentle pitch.
      utt.rate = Math.min(2, 0.82 * speedRef.current);
      utt.pitch = 0.9;
      utt.volume = 0.9;
      if (chosen) utt.voice = chosen;
      utt.onend = () => {
        if (speechTokenRef.current !== myToken) return;
        setTimeout(() => speakSentence(i + 1), 1100 / speedRef.current);
      };
      uttRef.current = utt;
      window.speechSynthesis.speak(utt);
    };
    speakSentence(0);
  }, [pickVoice]);

  // slideIndex is optional — omit it (or pass -1) to force the browser-TTS
  // fallback, e.g. for any text that isn't one of the pre-generated slides.
  const speak = useCallback((text, slideIndex) => {
    if (mutedRef.current) return;
    speechTokenRef.current++; // invalidate any in-flight browser-TTS chain
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    if (typeof slideIndex === "number" && slideIndex >= 0) {
      const audio = new Audio(`${process.env.PUBLIC_URL}/tour-audio/slide-${slideIndex}.mp3`);
      audio.playbackRate = Math.min(2, speedRef.current);
      audioRef.current = audio;
      audio.play().catch(() => speakBrowserTTS(text)); // e.g. autoplay blocked
      audio.onerror = () => speakBrowserTTS(text); // file missing/failed to load
      return;
    }
    speakBrowserTTS(text);
  }, [speakBrowserTTS]);

  // Voices load async — re-render when ready
  useEffect(() => {
    const load = () => setVoiceReady(true);
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = load;
      if (window.speechSynthesis.getVoices().length > 0) load();
    }
    return () => { if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null; };
  }, []);
 
  const toggleMute = useCallback(() => {
    setMuted((v) => {
      const next = !v;
      mutedRef.current = next;
      if (next) stopSpeech();
      return next;
    });
  }, [stopSpeech]);
 
  const animateTalk = useCallback(() => {
    setTalking((v) => !v);
    talkRef.current = setTimeout(animateTalk, 150);
  }, []);
 
  const typeCaption = useCallback((text, slideIndex) => {
    clearTimeout(typeRef.current);
    setCaption("");
    setTalking(true);
    clearTimeout(talkRef.current);
    animateTalk();
    speak(text, slideIndex);
    let i = 0;
    const step = () => {
      if (i <= text.length) {
        setCaption(text.slice(0, i));
        i++;
        typeRef.current = setTimeout(step, Math.max(8, 28 / speedRef.current));
      } else {
        stopTalk();
      }
    };
    step();
  }, [animateTalk, stopTalk, speak]);
 
  const showSlide = useCallback((n) => {
    setCurSlide(n);
    typeCaption(SCRIPTS[n], n);
  }, [typeCaption]);
 
  const stopPlayback = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
    lastTsRef.current = null;
    cancelAnimationFrame(rafRef.current);
    stopTalk();
    stopSpeech();
  }, [stopTalk, stopSpeech]);
 
  const tick = useCallback((ts) => {
    if (!playingRef.current) return;
    if (lastTsRef.current) {
      elapsedRef.current = Math.min(elapsedRef.current + ((ts - lastTsRef.current) / 1000) * speedRef.current, TOTAL_DUR);
      setElapsed(elapsedRef.current);
      const n = getSlideAt(elapsedRef.current);
      setCurSlide((prev) => {
        if (n !== prev) { typeCaption(SCRIPTS[n], n); return n; }
        return prev;
      });
    }
    lastTsRef.current = ts;
    if (elapsedRef.current >= TOTAL_DUR) {
      stopPlayback();
      setElapsed(0);
      elapsedRef.current = 0;
      setCurSlide(0);
      typeCaption(SCRIPTS[0], 0);
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [typeCaption, stopPlayback]);
 
  const startPlayback = useCallback(() => {
    playingRef.current = true;
    setPlaying(true);
    lastTsRef.current = null;
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);
 
  const jumpTo = useCallback((idx) => {
    stopPlayback();
    let t = 0;
    for (let i = 0; i < idx; i++) t += SLIDES[i].dur;
    elapsedRef.current = t;
    setElapsed(t);
    showSlide(idx);
  }, [stopPlayback, showSlide]);
 
  const handleTimelineClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const t = pct * TOTAL_DUR;
    elapsedRef.current = t;
    setElapsed(t);
    const n = getSlideAt(t);
    showSlide(n);
  };
 
  // Reset to lobby whenever the modal opens; clean up when it closes
  useEffect(() => {
    if (isOpen) {
      stopPlayback();
      clearTimeout(typeRef.current);
      elapsedRef.current = 0;
      setElapsed(0);
      setCurSlide(0);
      setCaption("");
      setTalking(false);
      setTourPhase("lobby");
    } else {
      stopPlayback();
      stopSpeech();
      clearTimeout(typeRef.current);
      setTourPhase("lobby");
    }
    return () => { stopPlayback(); stopSpeech(); clearTimeout(typeRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
 
  const handleClose = () => {
    stopPlayback();
    stopSpeech();
    clearTimeout(typeRef.current);
    // Persist to the account (syncs across devices) so the onboarding tour
    // auto-shows only once per user, not once per device.
    syncSetItem(LS_SEEN_KEY, "true");
    onClose?.();
  };

  // Start the tour from a specific slide index (called from lobby)
  const startFromSlide = useCallback((idx) => {
    let t = 0;
    for (let i = 0; i < idx; i++) t += SLIDES[i].dur;
    elapsedRef.current = t;
    setElapsed(t);
    showSlide(idx);
    setTourPhase("playing");
    // Small delay so state settles before the animation loop fires
    setTimeout(() => {
      playingRef.current = true;
      setPlaying(true);
      lastTsRef.current = null;
      rafRef.current = requestAnimationFrame(tick);
    }, 80);
  }, [showSlide, tick]);

  const handleSpeedChange = (val) => {
    speedRef.current = val;
    setSpeed(val);
    // Update the currently-playing pre-recorded narration in place — it's one
    // continuous audio file per slide, unlike the sentence-chained browser-TTS
    // fallback which already picks up a new rate on its next sentence.
    if (audioRef.current) audioRef.current.playbackRate = Math.min(2, val);
  };

  if (!isOpen) return null;
 
  const pct = Math.min((elapsed / TOTAL_DUR) * 100, 100);
  const slide = SLIDES[curSlide];
 
  const welcomeSlide = SLIDES[0];

  return (
    <div className="tour-overlay" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="tour-modal">

        {/* ── Header ── */}
        <div className="tour-header">
          <div className="tour-header-left">
            <span className="tour-header-logo">WIMC™</span>
            <span className="tour-header-badge">Feature Tour</span>
          </div>
          <button className="tour-close" onClick={handleClose} aria-label="Close tour">×</button>
        </div>

        {/* ══════════ LOBBY SCREEN ══════════ */}
        {tourPhase === "lobby" && (
          <div className="tour-lobby">
            <div className="tour-lobby-hero">
              <div className="tour-lobby-icon">👗👔</div>
              <div className="tour-lobby-title">WIMC™</div>
              <div className="tour-lobby-sub">What's In My Closet — Feature Tour</div>
            </div>

            <p className="tour-lobby-prompt">
              Jump to any feature, or start the full tour from the beginning:
            </p>

            <div className="tour-lobby-tags">
              {welcomeSlide.tags.map((tag) => {
                const slideId = TAG_TO_SLIDE[tag];
                const idx = slideId ? SLIDES.findIndex((s) => s.id === slideId) : -1;
                return (
                  <button
                    key={tag}
                    className="tour-lobby-tag"
                    onClick={() => idx >= 0 ? startFromSlide(idx) : startFromSlide(0)}
                    title={idx >= 0 ? `Jump to: ${SLIDES[idx].label}` : "Start tour"}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>

            {/* Speed selector */}
            <div className="tour-lobby-speed">
              <span className="tour-lobby-speed-label">Playback speed:</span>
              <div className="tour-speed-btns">
                {SPEED_OPTIONS.map((opt) => (
                  <button
                    key={opt.val}
                    className={`tour-speed-btn${speed === opt.val ? " tour-speed-btn--active" : ""}`}
                    onClick={() => handleSpeedChange(opt.val)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="tour-lobby-start"
              onClick={() => startFromSlide(0)}
            >
              ▶ Start Tour from Beginning
            </button>

            <p className="tour-lobby-voicenote">
              🔊 The guide's narration is pre-recorded for a consistent, natural
              voice on every device. You can mute it anytime with the 🔊 button
              during the tour.
            </p>
          </div>
        )}

        {/* ══════════ PLAYING SCREEN ══════════ */}
        {tourPhase === "playing" && (
          <>
            {/* ── Slide area ── */}
            <div className="tour-stage">
              {slide.type === "title"
                ? <TitleSlide slide={slide} />
                : <FeatureSlide slide={slide} />
              }

              {/* Avatar overlay */}
              <div className="tour-avatar-overlay">
                <div className="tour-avatar-wrap">
                  <Avatar talking={talking} />
                </div>
                <div className="tour-caption">
                  <div className="tour-caption-name">WIMC Guide</div>
                  <div className="tour-caption-text">{caption}<span className="tour-cursor" /></div>
                </div>
              </div>
            </div>

            {/* ── Timeline ── */}
            <div className="tour-timeline" onClick={handleTimelineClick} title="Click to seek">
              <div className="tour-timeline-fill" style={{ width: `${pct}%` }} />
              {SLIDES.map((s, i) => {
                let pos = 0;
                for (let j = 0; j < i; j++) pos += SLIDES[j].dur;
                return (
                  <div
                    key={s.id}
                    className="tour-marker"
                    style={{ left: `${(pos / TOTAL_DUR) * 100}%` }}
                    title={s.label}
                  />
                );
              })}
            </div>

            {/* ── Controls ── */}
            <div className="tour-controls">
              <button
                className="tour-play-btn"
                onClick={() => playing ? stopPlayback() : startPlayback()}
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? "⏸" : "▶"}
              </button>
              <button
                className="tour-mute-btn"
                onClick={toggleMute}
                aria-label={muted ? "Unmute narration" : "Mute narration"}
                title={muted ? "Unmute narration" : "Mute narration"}
              >
                {muted ? "🔇" : "🔊"}
              </button>

              <span className="tour-time">{fmt(elapsed)} / {fmt(TOTAL_DUR)}</span>

              {/* Speed control — compact version inside the controls bar */}
              <div className="tour-speed-btns tour-speed-btns--inline">
                {SPEED_OPTIONS.map((opt) => (
                  <button
                    key={opt.val}
                    className={`tour-speed-btn${speed === opt.val ? " tour-speed-btn--active" : ""}`}
                    onClick={() => handleSpeedChange(opt.val)}
                    title={`Playback speed: ${opt.label}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="tour-dots">
                {SLIDES.map((s, i) => (
                  <button
                    key={s.id}
                    ref={i === curSlide ? activeDotRef : null}
                    className={`tour-dot ${i === curSlide ? "tour-dot--active" : i < curSlide ? "tour-dot--done" : ""}`}
                    onClick={() => jumpTo(i)}
                    title={s.label}
                    aria-label={`Go to ${s.label}`}
                  />
                ))}
              </div>

              <span className="tour-slide-name">{slide.label}</span>

              <button className="tour-skip" onClick={() => {
                stopPlayback();
                stopSpeech();
                clearTimeout(typeRef.current);
                setCaption("");
                setTalking(false);
                setTourPhase("lobby");
                elapsedRef.current = 0;
                setElapsed(0);
                setCurSlide(0);
              }}>
                ← Menu
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
 
// ── Hook: first-time auto-show ─────────────────────────────────────────────
export function useWIMCTour() {
  const [isOpen, setIsOpen] = useState(false);
 
  const openTour  = () => setIsOpen(true);
  const closeTour = () => setIsOpen(false);
 
  // Auto-show once for new users
  const showIfNew = useCallback(() => {
    if (!localStorage.getItem(LS_SEEN_KEY)) setIsOpen(true);
  }, []);
 
  return { isOpen, openTour, closeTour, showIfNew };
}
 


// import React, { useState, useEffect, useRef, useCallback } from "react";
// import "./WIMCTourVideo.css";

// // ── Slide data ────────────────────────────────────────────────────────────────
// const SLIDES = [
//   {
//     id: "welcome",
//     label: "Welcome",
//     dur: 7,
//     icon: "👗",
//     title: "WIMC™",
//     subtitle: "What's In My Closet",
//     tags: [
//       "🔐 Secure Auth",
//       "👗 Smart Closet",
//       "✨ 5 AI Features",
//       "🎬 Try-On Studio",
//       "👶 Kids' Closet",
//       "🛒 AI Shopping",
//       "🌤️ Weather",
//       "🧾 Receipts",
//       "📋 Wish List",
//       "⚙️ Settings",
//     ],
//     features: [],
//     type: "title",
//   },
//   {
//     id: "auth",
//     label: "Authentication",
//     dur: 9,
//     icon: "🔐",
//     title: "Authentication",
//     type: "feature",
//     mockupTitle: "WIMC™ — Sign In",
//     features: [
//       "Sign Up & Login flow",
//       "SHA-256 password hashing",
//       "Secure localStorage session",
//       "Avatar photo upload",
//       "Edit profile in Settings",
//       "Password change + strength meter",
//     ],
//     featureIcons: ["✅", "🔑", "💾", "📷", "✏️", "🔄"],
//   },
//   {
//     id: "closet",
//     label: "Smart Closet",
//     dur: 9,
//     icon: "👗",
//     title: "Smart Closet",
//     type: "feature",
//     mockupTitle: "My Closet",
//     features: [
//       "6 clothing categories",
//       "Images & video uploads",
//       "Cloudinary media storage",
//       "Per-section custom backgrounds",
//       "Color palette + photo presets",
//       "Try-On button per section",
//       "AI Natural Language Search",
//     ],
//     featureIcons: ["📦", "🖼️", "☁️", "🎨", "🌈", "🎬", "🔍"],
//   },
//   {
//     id: "planning",
//     label: "Planning Tools",
//     dur: 9,
//     icon: "📅",
//     title: "Planning Tools",
//     type: "feature",
//     mockupTitle: "Outfit Preview + Planner",
//     features: [
//       "Outfit Preview Panel",
//       "Drag-and-drop reordering",
//       "Favorites & saved looks",
//       "Share & print outfit",
//       "7-day Outfit Planner",
//       "Travel Pack Panel",
//       "AI Packing Assistant",
//       "Export / import plans",
//     ],
//     featureIcons: ["👁️", "↕️", "⭐", "🔗", "📅", "✈️", "🧳", "📤"],
//   },
//   {
//     id: "ai",
//     label: "AI Features",
//     dur: 10,
//     icon: "✨",
//     title: "Five AI Features",
//     type: "feature",
//     mockupTitle: "✨ AI Features",
//     features: [
//       "AI Outfit Stylist chat",
//       "AI Packing Assistant",
//       "Smart Donation Advisor",
//       "AI Try-On Style Feedback",
//       "Natural Language Search",
//       "Shopping: Suggest items",
//       "Shopping: Budget analysis",
//       "Shopping: Prioritize list",
//     ],
//     featureIcons: ["💬", "🧳", "🗑️", "🎬", "🔍", "💡", "💰", "🎯"],
//   },
//   {
//     id: "tryon",
//     label: "Try-On Studio",
//     dur: 9,
//     icon: "🎬",
//     title: "Media & Studio",
//     type: "feature",
//     mockupTitle: "🎬 Try-On Studio",
//     features: [
//       "Live camera recording",
//       "Front / rear camera toggle",
//       "Upload & cloud storage",
//       "AI Style Feedback (4 sections)",
//       "Video Bin with grid / list",
//       "Timestamps & custom titles",
//       "Download & share videos",
//     ],
//     featureIcons: ["📸", "🔄", "☁️", "✨", "🎥", "🕐", "⬇️"],
//   },
//   {
//     id: "kids",
//     label: "Kids & Receipts",
//     dur: 9,
//     icon: "👶",
//     title: "Kids & Receipts",
//     type: "feature",
//     mockupTitle: "Kids' Closet · Receipts",
//     features: [
//       "Baby, Toddler, Kids, Teen profiles",
//       "US & EU sizing side-by-side",
//       "Per-child closet sections",
//       "14-day soft delete & restore",
//       "Share size cards via link",
//       "Receipts: Photo, PDF, Email",
//       "Filter by store / category",
//     ],
//     featureIcons: ["👶", "📏", "👗", "♻️", "📤", "📷", "🔍"],
//   },
//   {
//     id: "shopping",
//     label: "Shopping List",
//     dur: 9,
//     icon: "🛒",
//     title: "Shopping & Wish List",
//     type: "feature",
//     mockupTitle: "🛒 Shopping List",
//     features: [
//       "3 default categories",
//       "Unlimited custom categories",
//       "300+ emoji across 10 groups",
//       "4 AI modes built-in",
//       "Share list via link",
//       "Download JSON / copy text",
//       "Wish List with URL previews",
//       "Import shared lists",
//     ],
//     featureIcons: ["🛒", "➕", "😀", "🤖", "🔗", "⬇️", "📋", "📥"],
//   },
//   {
//     id: "settings",
//     label: "Settings & More",
//     dur: 9,
//     icon: "⚙️",
//     title: "Settings & More",
//     type: "feature",
//     mockupTitle: "Settings · Weather · More",
//     features: [
//       "Edit profile & upload avatar",
//       "Password + strength meter",
//       "Page & card backgrounds",
//       "Weather — current + 7-day",
//       "Donate Bin + AI Advisor",
//       "About page",
//       "Built with React + Cloudinary",
//     ],
//     featureIcons: ["🖼️", "🔒", "🎨", "🌤️", "🗑️", "ℹ️", "🚀"],
//   },
// ];

// const SCRIPTS = [
//   "Welcome to WIMC — What's In My Closet! This is your AI-powered personal closet manager. Let me walk you through everything this app can do.",
//   "WIMC starts with secure authentication. Sign up or log in — all passwords are protected with SHA-256 hashing. Upload a profile photo and update your account anytime from Settings.",
//   "Your closet is organized into six smart categories. Upload photos and videos of your clothing items, stored securely in the cloud. Customize each section's background with photo presets or a full color palette.",
//   "The Outfit Preview Panel lets you build looks with drag-and-drop. Save favorites, share outfits, and plan your entire week with the Outfit Planner. The Travel Pack Panel helps you pack smarter with AI assistance.",
//   "WIMC has five AI features built in — an AI Stylist that answers any style question, Natural Language Search, a Smart Donation Advisor, AI Style Feedback after try-ons, and a full AI Shopping Assistant.",
//   "The Try-On Studio lets you record outfit videos using your front or rear camera. After recording, get personalized AI Style Feedback covering what works, style tips, and how to complete the look.",
//   "Kids' Closet lets you manage clothing profiles for each child, with US and EU sizing shown side by side. Deleted profiles stay recoverable for 14 days. The Receipts page stores all your shopping receipts by photo, PDF, or email.",
//   "The Shopping List has three built-in categories plus unlimited custom ones with over 300 emoji to choose from. Use four AI modes to suggest items, analyze your budget, or prioritize your list. Share lists via a link or download them.",
//   "Settings gives you full control over your profile, password, and the app's appearance. Check the weather right from the header to plan your outfits. That's WIMC — your complete AI closet companion!",
// ];

// const TOTAL_DUR = SLIDES.reduce((a, s) => a + s.dur, 0);

// // ── Avatar SVG — caramel-skinned female ──────────────────────────────────────
// function Avatar({ talking }) {
//   const skin = "#c68642";
//   const skinDk = "#a8692a";
//   const hair = "#1c0f00";
//   const hairHi = "#3d1f00";

//   return (
//     <svg
//       viewBox="0 0 80 96"
//       xmlns="http://www.w3.org/2000/svg"
//       className="tour-avatar-svg"
//     >
//       {/* ── Light background panel so hair reads against it ── */}
//       <rect
//         x="8"
//         y="4"
//         width="64"
//         height="72"
//         rx="12"
//         fill="#2a3a5c"
//         opacity="0.85"
//       />

//       {/* ── Shoulders / blouse (blue) ── */}
//       <path
//         d="M14 90 Q14 72 26 68 Q33 65 40 65 Q47 65 54 68 Q66 72 66 90 Z"
//         fill="#1d4ed8"
//       />
//       {/* Subtle collar */}
//       <path
//         d="M35 65 Q40 70 45 65"
//         stroke="#60a5fa"
//         strokeWidth="1"
//         fill="none"
//         strokeLinecap="round"
//       />

//       {/* ── Neck ── */}
//       <path d="M35 54 Q35 65 40 66 Q45 65 45 54 Z" fill={skin} />

//       {/* ── Head — smooth ellipse, no rect artifacts ── */}
//       <ellipse cx="40" cy="38" rx="18" ry="20" fill={skin} />

//       {/* ── Ear lobes (behind hair side panels) ── */}
//       <ellipse cx="22" cy="42" rx="3" ry="3.5" fill={skin} />
//       <ellipse cx="58" cy="42" rx="3" ry="3.5" fill={skin} />
//       {/* Inner ear shadow */}
//       <ellipse
//         cx="22.5"
//         cy="42"
//         rx="1.8"
//         ry="2.2"
//         fill={skinDk}
//         opacity="0.5"
//       />
//       <ellipse
//         cx="57.5"
//         cy="42"
//         rx="1.8"
//         ry="2.2"
//         fill={skinDk}
//         opacity="0.5"
//       />

//       {/* ── Hair — drawn IN LAYERS, crown first, then sides, NO path crossing the face ── */}
//       {/* Crown / top */}
//       <ellipse cx="40" cy="19" rx="18" ry="8" fill={hair} />
//       {/* Left side panel — stays behind/outside the face, ends ~y=55 */}
//       <path
//         d="M22 22 Q16 30 16 44 Q16 54 22 57 Q26 58 27 54 Q24 46 25 30 Z"
//         fill={hair}
//       />
//       {/* Right side panel */}
//       <path
//         d="M58 22 Q64 30 64 44 Q64 54 58 57 Q54 58 53 54 Q56 46 55 30 Z"
//         fill={hair}
//       />
//       {/* Hair bottom hem — behind neck, above shoulders */}
//       <path
//         d="M22 57 Q31 62 40 62 Q49 62 58 57 Q56 54 53 54 Q47 56 40 57 Q33 56 27 54 Q24 54 22 57 Z"
//         fill={hair}
//       />
//       {/* Hair highlight on crown */}
//       <ellipse cx="37" cy="15" rx="7" ry="2.5" fill={hairHi} opacity="0.6" />

//       {/* ── Subtle facial shading (jaw/temple) ── */}
//       <ellipse cx="24" cy="44" rx="4" ry="6" fill={skinDk} opacity="0.18" />
//       <ellipse cx="56" cy="44" rx="4" ry="6" fill={skinDk} opacity="0.18" />
//       <ellipse cx="40" cy="50" rx="8" ry="4" fill={skinDk} opacity="0.12" />

//       {/* ── Eyebrows — natural, not too heavy ── */}
//       <path
//         d="M30.5 29.5 Q34 27.5 37.5 28.5"
//         stroke={hair}
//         strokeWidth="1.4"
//         fill="none"
//         strokeLinecap="round"
//       />
//       <path
//         d="M42.5 28.5 Q46 27.5 49.5 29.5"
//         stroke={hair}
//         strokeWidth="1.4"
//         fill="none"
//         strokeLinecap="round"
//       />

//       {/* ── Eyes — iris + pupil + white ── */}
//       {/* Whites */}
//       <ellipse cx="34" cy="35" rx="3.4" ry="2.6" fill="#f5f0e8" />
//       <ellipse cx="46" cy="35" rx="3.4" ry="2.6" fill="#f5f0e8" />
//       {/* Iris — warm brown */}
//       <ellipse cx="34" cy="35.2" rx="2.1" ry="2.1" fill="#5c3310" />
//       <ellipse cx="46" cy="35.2" rx="2.1" ry="2.1" fill="#5c3310" />
//       {/* Pupil */}
//       <ellipse cx="34" cy="35.2" rx="1.1" ry="1.1" fill="#1a0800" />
//       <ellipse cx="46" cy="35.2" rx="1.1" ry="1.1" fill="#1a0800" />
//       {/* Eye shine */}
//       <ellipse
//         cx="34.8"
//         cy="34.3"
//         rx="0.7"
//         ry="0.7"
//         fill="#fff"
//         opacity="0.9"
//       />
//       <ellipse
//         cx="46.8"
//         cy="34.3"
//         rx="0.7"
//         ry="0.7"
//         fill="#fff"
//         opacity="0.9"
//       />
//       {/* Upper lid line */}
//       <path
//         d="M30.6 33.5 Q34 32.2 37.4 33.5"
//         stroke="#2a1500"
//         strokeWidth="0.8"
//         fill="none"
//         strokeLinecap="round"
//       />
//       <path
//         d="M42.6 33.5 Q46 32.2 49.4 33.5"
//         stroke="#2a1500"
//         strokeWidth="0.8"
//         fill="none"
//         strokeLinecap="round"
//       />

//       {/* ── Nose — subtle bridge + nostrils ── */}
//       <path
//         d="M40 38 L39.5 43"
//         stroke={skinDk}
//         strokeWidth="0.8"
//         fill="none"
//         strokeLinecap="round"
//         opacity="0.5"
//       />
//       <path
//         d="M37.5 43.5 Q38.5 45 40 44.5 Q41.5 45 42.5 43.5"
//         stroke={skinDk}
//         strokeWidth="1"
//         fill="none"
//         strokeLinecap="round"
//       />

//       {/* ── Mouth — natural width, thinner lips, muted rose ── */}
//       {/* Upper lip */}
//       <path
//         d="M34 47.5 Q37 46.5 40 47 Q43 46.5 46 47.5"
//         stroke="#9b6b5a"
//         strokeWidth="1"
//         fill="none"
//         strokeLinecap="round"
//       />
//       {/* Lower lip — subtle curve, changes slightly when talking */}
//       <path
//         d={talking ? "M34 47.5 Q40 51.5 46 47.5" : "M34 47.5 Q40 50 46 47.5"}
//         stroke="#9b6b5a"
//         strokeWidth="1.2"
//         fill="none"
//         strokeLinecap="round"
//       />
//       {/* Lip center line */}
//       <path
//         d="M34 47.5 Q40 48.2 46 47.5"
//         stroke="#7a4f40"
//         strokeWidth="0.6"
//         fill="none"
//         strokeLinecap="round"
//       />

//       {/* ── Gold stud earrings at earlobe ── */}
//       <circle cx="22" cy="46" r="2" fill="#f59e0b" />
//       <circle cx="22" cy="46" r="1" fill="#fde68a" />
//       <circle cx="58" cy="46" r="2" fill="#f59e0b" />
//       <circle cx="58" cy="46" r="1" fill="#fde68a" />
//     </svg>
//   );
// }

// // ── Slide content ─────────────────────────────────────────────────────────────
// function TitleSlide({ slide }) {
//   return (
//     <div className="tour-title-slide">
//       <div className="tour-title-logo">{slide.icon}</div>
//       <div className="tour-title-name">{slide.title}</div>
//       <div className="tour-title-sub">{slide.subtitle}</div>
//       <div className="tour-title-tags">
//         {slide.tags.map((t) => (
//           <span key={t} className="tour-tag">
//             {t}
//           </span>
//         ))}
//       </div>
//     </div>
//   );
// }

// function FeatureSlide({ slide }) {
//   return (
//     <div className="tour-feature-slide">
//       {/* Left: mockup */}
//       <div className="tour-mockup">
//         <div className="tour-mockup-bar">
//           <span className="tour-mockup-title">{slide.mockupTitle}</span>
//           <div className="tour-mockup-dots">
//             <span style={{ background: "#ef4444" }} />
//             <span style={{ background: "#f59e0b" }} />
//             <span style={{ background: "#22c55e" }} />
//           </div>
//         </div>
//         <div className="tour-mockup-body">
//           <MockupContent id={slide.id} />
//         </div>
//       </div>
//       {/* Right: feature list */}
//       <div className="tour-feat-panel">
//         <div className="tour-feat-title">
//           {slide.icon} {slide.title}
//         </div>
//         <ul className="tour-feat-list">
//           {slide.features.map((f, i) => (
//             <li key={f}>
//               <span className="tour-feat-icon">{slide.featureIcons[i]}</span>
//               {f}
//             </li>
//           ))}
//         </ul>
//       </div>
//     </div>
//   );
// }

// // Individual mockup bodies
// function MockupContent({ id }) {
//   switch (id) {
//     case "auth":
//       return (
//         <div className="mc-auth">
//           <div className="mc-auth-avatar">👤</div>
//           <div className="mc-auth-heading">Welcome Back</div>
//           <div className="mc-field">📧 Email address</div>
//           <div className="mc-field mc-field--active">🔒 ••••••••</div>
//           <div className="mc-btn">Log In to My Closet</div>
//           <div className="mc-secure">
//             🔒 SHA-256 encrypted · Secure session · Avatar sync
//           </div>
//         </div>
//       );
//     case "closet":
//       return (
//         <div>
//           <div className="mc-card-grid">
//             {[
//               ["👗", "#2d1b4e", "Dresses"],
//               ["👟", "#1a2e4a", "Shoes"],
//               ["👖", "#1a3a2a", "Pants"],
//               ["👚", "#2d2010", "Tops"],
//               ["👜", "#2a1a2e", "Bags"],
//               ["🧥", "#1a1a2e", "Jackets"],
//             ].map(([e, bg, l]) => (
//               <div className="mc-card" key={l}>
//                 <div className="mc-card-img" style={{ background: bg }}>
//                   {e}
//                 </div>
//                 <div className="mc-card-lbl">{l}</div>
//               </div>
//             ))}
//           </div>
//           <div className="mc-bg-row">
//             <span className="mc-bg-label">🎨 Custom Backgrounds</span>
//             <div className="mc-bg-swatches">
//               {["#7c3aed", "#0369a1", "#d97706", "#FFE4E1", "#B2C5B2"].map(
//                 (c) => (
//                   <div
//                     key={c}
//                     className="mc-swatch"
//                     style={{
//                       background: c,
//                       border: c === "#FFE4E1" ? "1px solid #555" : undefined,
//                     }}
//                   />
//                 ),
//               )}
//             </div>
//           </div>
//         </div>
//       );
//     case "planning":
//       return (
//         <div>
//           <div className="mc-panel" style={{ marginBottom: 7 }}>
//             <div className="mc-panel-title" style={{ color: "#7c3aed" }}>
//               Current Selection
//             </div>
//             <div className="mc-chips">
//               {["Blue Wrap Dress", "Nude Heels", "Gold Clutch"].map((c) => (
//                 <span key={c} className="mc-chip mc-chip--active">
//                   {c}
//                 </span>
//               ))}
//             </div>
//           </div>
//           <div className="mc-panel" style={{ marginBottom: 7 }}>
//             <div className="mc-panel-title" style={{ color: "#0369a1" }}>
//               📅 Weekly Planner
//             </div>
//             <div className="mc-week">
//               {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
//                 <div key={i} className="mc-day">
//                   <div
//                     className="mc-day-lbl"
//                     style={{
//                       color:
//                         i < 2 || i === 3 || i === 4 ? "#7c3aed" : "#334155",
//                     }}
//                   >
//                     {d}
//                   </div>
//                   <div
//                     className="mc-day-bar"
//                     style={{
//                       background:
//                         i < 2 || i === 3 || i === 4 ? "#2d1b4e" : "#1e293b",
//                     }}
//                   />
//                 </div>
//               ))}
//             </div>
//           </div>
//           <div className="mc-panel">
//             <div className="mc-panel-title" style={{ color: "#d97706" }}>
//               ✈️ Travel Pack
//             </div>
//             <div className="mc-chips">
//               <span className="mc-chip">Paris — 5 days</span>
//               <span className="mc-chip">12 items packed</span>
//             </div>
//           </div>
//         </div>
//       );
//     case "ai":
//       return (
//         <div>
//           <div className="mc-bubble mc-bubble--user">
//             What should I wear to a garden party?
//           </div>
//           <div className="mc-bubble mc-bubble--ai">
//             <div className="mc-bubble-label">✨ AI Stylist</div>
//             Your floral wrap dress with nude heels and a woven bag —
//             effortlessly chic for a summer garden party!
//           </div>
//           <div className="mc-ai-grid">
//             {[
//               ["🔍 Smart Search", "#7c3aed", '"casual summer" → Tops'],
//               ["🗑️ Donation AI", "#ef4444", "4-question advisor"],
//               ["🛒 Shopping AI", "#059669", "Suggest · Budget · Prioritize"],
//               ["🎬 Style Feedback", "#d97706", "Post try-on coaching"],
//             ].map(([t, c, s]) => (
//               <div key={t} className="mc-ai-card">
//                 <div
//                   style={{
//                     fontSize: 8,
//                     color: c,
//                     fontWeight: 700,
//                     marginBottom: 2,
//                   }}
//                 >
//                   {t}
//                 </div>
//                 <div style={{ fontSize: 7, color: "#64748b" }}>{s}</div>
//               </div>
//             ))}
//           </div>
//         </div>
//       );
//     case "tryon":
//       return (
//         <div>
//           <div className="mc-camera">
//             <div style={{ fontSize: 28 }}>📸</div>
//             <div className="mc-rec-badge">● REC 0:23</div>
//             <div className="mc-camera-hint">Front camera — tap to switch</div>
//           </div>
//           <div className="mc-cam-btns">
//             <div className="mc-cam-btn">⏹ Stop</div>
//             <div className="mc-cam-btn mc-cam-btn--primary">⬇️ Save</div>
//             <div className="mc-cam-btn">🔗 Share</div>
//           </div>
//           <div className="mc-ai-feedback">
//             <div
//               style={{
//                 fontSize: 8,
//                 color: "#a78bfa",
//                 fontWeight: 700,
//                 marginBottom: 4,
//               }}
//             >
//               ✨ AI Style Feedback
//             </div>
//             <div className="mc-chips">
//               {["Work", "Casual", "Date Night", "Weekend"].map((o) => (
//                 <span key={o} className="mc-chip">
//                   {o}
//                 </span>
//               ))}
//             </div>
//           </div>
//         </div>
//       );
//     case "kids":
//       return (
//         <div>
//           <div className="mc-kids-grid">
//             <div className="mc-kid-card">
//               <div style={{ fontSize: 16 }}>👧</div>
//               <div className="mc-kid-name">Emma, 7</div>
//               <div className="mc-kid-info">Kids · US 7 / EU 24</div>
//               <div className="mc-chips" style={{ marginTop: 4 }}>
//                 <span className="mc-chip mc-chip--small">Open Closet</span>
//                 <span className="mc-chip mc-chip--small">Share Sizes</span>
//               </div>
//             </div>
//             <div className="mc-kid-card">
//               <div style={{ fontSize: 16 }}>👦</div>
//               <div className="mc-kid-name">Liam, 3</div>
//               <div className="mc-kid-info">Toddler · US 3T / EU 98</div>
//               <div style={{ fontSize: 7, color: "#f59e0b", marginTop: 4 }}>
//                 ⏳ 11 days until deleted
//               </div>
//             </div>
//           </div>
//           <div className="mc-panel" style={{ marginTop: 7 }}>
//             <div className="mc-panel-title" style={{ color: "#059669" }}>
//               🧾 Receipts
//             </div>
//             <div className="mc-receipt-row">
//               {[
//                 ["📷", "Photo"],
//                 ["📄", "PDF"],
//                 ["📧", "Email"],
//               ].map(([e, l]) => (
//                 <div key={l} className="mc-receipt-card">
//                   <div style={{ fontSize: 14 }}>{e}</div>
//                   <div style={{ fontSize: 7, color: "#64748b" }}>{l}</div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </div>
//       );
//     case "shopping":
//       return (
//         <div>
//           <div className="mc-chips" style={{ marginBottom: 7 }}>
//             <span className="mc-chip mc-chip--active">👗 Clothing</span>
//             <span className="mc-chip">✈️ Travel</span>
//             <span className="mc-chip">🧸 Kids</span>
//             <span className="mc-chip mc-chip--dashed">+ Custom</span>
//           </div>
//           <div className="mc-sl-items">
//             <div className="mc-sl-item mc-sl-item--done">
//               <div className="mc-sl-check mc-sl-check--done">✓</div>
//               <span
//                 style={{ textDecoration: "line-through", color: "#64748b" }}
//               >
//                 Winter coat (AI suggested)
//               </span>
//             </div>
//             <div className="mc-sl-item">
//               <div className="mc-sl-check" />
//               <span>Ankle boots — Size 8</span>
//             </div>
//             <div className="mc-sl-item">
//               <div className="mc-sl-check" />
//               <span>Cashmere turtleneck</span>
//             </div>
//           </div>
//           <div className="mc-ai-modes">
//             <div
//               style={{
//                 fontSize: 7,
//                 color: "#a78bfa",
//                 fontWeight: 700,
//                 marginBottom: 4,
//               }}
//             >
//               ✨ AI Modes
//             </div>
//             <div className="mc-chips">
//               {["💡 Suggest", "💬 Chat", "💰 Budget", "🎯 Prioritize"].map(
//                 (m) => (
//                   <span key={m} className="mc-chip">
//                     {m}
//                   </span>
//                 ),
//               )}
//             </div>
//           </div>
//         </div>
//       );
//     case "settings":
//       return (
//         <div>
//           <div className="mc-settings-tabs">
//             {[
//               ["👤 Profile", true],
//               ["🔒 Password", false],
//               ["🎨 Appearance", false],
//             ].map(([l, a]) => (
//               <div
//                 key={l}
//                 className={`mc-settings-tab${a ? " mc-settings-tab--active" : ""}`}
//               >
//                 {l}
//               </div>
//             ))}
//           </div>
//           <div className="mc-panel" style={{ marginBottom: 6 }}>
//             <div className="mc-panel-title" style={{ color: "#0369a1" }}>
//               🌤️ Weather — Washington DC
//             </div>
//             <div className="mc-weather-row">
//               <div style={{ fontSize: 20 }}>⛅</div>
//               <div className="mc-weather-temp">72°F</div>
//               <div
//                 style={{ fontSize: 7, color: "#64748b", textAlign: "right" }}
//               >
//                 Partly cloudy
//                 <br />
//                 7-day forecast
//               </div>
//             </div>
//           </div>
//           <div className="mc-bottom-btns">
//             <div className="mc-bottom-btn" style={{ color: "#ef4444" }}>
//               🗑️ Donate Bin
//             </div>
//             <div className="mc-bottom-btn">ℹ️ About</div>
//             <div className="mc-bottom-btn mc-bottom-btn--primary">
//               WIMC™ Complete
//             </div>
//           </div>
//         </div>
//       );
//     default:
//       return null;
//   }
// }

// // ── Main component ────────────────────────────────────────────────────────────
// const LS_SEEN_KEY = "wimc_tour_seen";

// export default function WIMCTourVideo({ isOpen, onClose, autoPlay = true }) {
//   const [curSlide, setCurSlide] = useState(0);
//   const [elapsed, setElapsed] = useState(0);
//   const [playing, setPlaying] = useState(false);
//   const [caption, setCaption] = useState("");
//   const [talking, setTalking] = useState(false);
//   const [hasStarted, setHasStarted] = useState(false);

//   const rafRef = useRef(null);
//   const lastTsRef = useRef(null);
//   const typeRef = useRef(null);
//   const talkRef = useRef(null);
//   const elapsedRef = useRef(0);
//   const playingRef = useRef(false);
//   const uttRef = useRef(null); // Web Speech utterance
//   const [voiceReady, setVoiceReady] = useState(false);
//   const [muted, setMuted] = useState(false);
//   const mutedRef = useRef(false);

//   const fmt = (s) => {
//     const m = Math.floor(s / 60);
//     return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
//   };

//   const getSlideAt = (t) => {
//     let acc = 0;
//     for (let i = 0; i < SLIDES.length; i++) {
//       acc += SLIDES[i].dur;
//       if (t < acc) return i;
//     }
//     return SLIDES.length - 1;
//   };

//   const stopTalk = useCallback(() => {
//     clearTimeout(talkRef.current);
//     setTalking(false);
//   }, []);

//   // ── Web Speech API helpers ──────────────────────────────────────────────────
//   const stopSpeech = useCallback(() => {
//     if (window.speechSynthesis) window.speechSynthesis.cancel();
//   }, []);

//   const speak = useCallback((text) => {
//     if (!window.speechSynthesis || mutedRef.current) return;
//     window.speechSynthesis.cancel();
//     const utt = new SpeechSynthesisUtterance(text);
//     utt.rate = 0.92;
//     utt.pitch = 1.1;
//     utt.volume = 1;
//     // Prefer a female English voice
//     const voices = window.speechSynthesis.getVoices();
//     const femaleVoice =
//       voices.find(
//         (v) =>
//           v.lang.startsWith("en") &&
//           /female|woman|samantha|karen|victoria|moira|fiona|zira|susan|eva|allison|ava/i.test(
//             v.name,
//           ),
//       ) ||
//       voices.find(
//         (v) =>
//           v.lang.startsWith("en") && v.name.toLowerCase().includes("google"),
//       ) ||
//       voices.find((v) => v.lang.startsWith("en"));
//     if (femaleVoice) utt.voice = femaleVoice;
//     uttRef.current = utt;
//     window.speechSynthesis.speak(utt);
//   }, []);

//   // Voices load async — re-render when ready
//   useEffect(() => {
//     const load = () => setVoiceReady(true);
//     if (window.speechSynthesis) {
//       window.speechSynthesis.onvoiceschanged = load;
//       if (window.speechSynthesis.getVoices().length > 0) load();
//     }
//     return () => {
//       if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null;
//     };
//   }, []);

//   const toggleMute = useCallback(() => {
//     setMuted((v) => {
//       const next = !v;
//       mutedRef.current = next;
//       if (next) stopSpeech();
//       return next;
//     });
//   }, [stopSpeech]);

//   const animateTalk = useCallback(() => {
//     setTalking((v) => !v);
//     talkRef.current = setTimeout(animateTalk, 150);
//   }, []);

//   const typeCaption = useCallback(
//     (text) => {
//       clearTimeout(typeRef.current);
//       setCaption("");
//       setTalking(true);
//       clearTimeout(talkRef.current);
//       animateTalk();
//       speak(text);
//       let i = 0;
//       const step = () => {
//         if (i <= text.length) {
//           setCaption(text.slice(0, i));
//           i++;
//           typeRef.current = setTimeout(step, 28);
//         } else {
//           stopTalk();
//         }
//       };
//       step();
//     },
//     [animateTalk, stopTalk, speak],
//   );

//   const showSlide = useCallback(
//     (n) => {
//       setCurSlide(n);
//       typeCaption(SCRIPTS[n]);
//     },
//     [typeCaption],
//   );

//   const stopPlayback = useCallback(() => {
//     playingRef.current = false;
//     setPlaying(false);
//     lastTsRef.current = null;
//     cancelAnimationFrame(rafRef.current);
//     stopTalk();
//     stopSpeech();
//   }, [stopTalk, stopSpeech]);

//   const tick = useCallback(
//     (ts) => {
//       if (!playingRef.current) return;
//       if (lastTsRef.current) {
//         elapsedRef.current = Math.min(
//           elapsedRef.current + (ts - lastTsRef.current) / 1000,
//           TOTAL_DUR,
//         );
//         setElapsed(elapsedRef.current);
//         const n = getSlideAt(elapsedRef.current);
//         setCurSlide((prev) => {
//           if (n !== prev) {
//             typeCaption(SCRIPTS[n]);
//             return n;
//           }
//           return prev;
//         });
//       }
//       lastTsRef.current = ts;
//       if (elapsedRef.current >= TOTAL_DUR) {
//         stopPlayback();
//         setElapsed(0);
//         elapsedRef.current = 0;
//         setCurSlide(0);
//         typeCaption(SCRIPTS[0]);
//         return;
//       }
//       rafRef.current = requestAnimationFrame(tick);
//     },
//     [typeCaption, stopPlayback],
//   );

//   const startPlayback = useCallback(() => {
//     playingRef.current = true;
//     setPlaying(true);
//     setHasStarted(true);
//     lastTsRef.current = null;
//     rafRef.current = requestAnimationFrame(tick);
//   }, [tick]);

//   const jumpTo = useCallback(
//     (idx) => {
//       stopPlayback();
//       let t = 0;
//       for (let i = 0; i < idx; i++) t += SLIDES[i].dur;
//       elapsedRef.current = t;
//       setElapsed(t);
//       showSlide(idx);
//     },
//     [stopPlayback, showSlide],
//   );

//   const handleTimelineClick = (e) => {
//     const rect = e.currentTarget.getBoundingClientRect();
//     const pct = (e.clientX - rect.left) / rect.width;
//     const t = pct * TOTAL_DUR;
//     elapsedRef.current = t;
//     setElapsed(t);
//     const n = getSlideAt(t);
//     showSlide(n);
//   };

//   // Auto-start when opened
//   useEffect(() => {
//     if (isOpen) {
//       elapsedRef.current = 0;
//       setElapsed(0);
//       setCurSlide(0);
//       typeCaption(SCRIPTS[0]);
//       if (autoPlay) setTimeout(() => startPlayback(), 600);
//     } else {
//       stopPlayback();
//       clearTimeout(typeRef.current);
//     }
//     return () => {
//       stopPlayback();
//       stopSpeech();
//       clearTimeout(typeRef.current);
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [isOpen]);

//   const handleClose = () => {
//     stopPlayback();
//     localStorage.setItem(LS_SEEN_KEY, "true");
//     onClose?.();
//   };

//   if (!isOpen) return null;

//   const pct = Math.min((elapsed / TOTAL_DUR) * 100, 100);
//   const slide = SLIDES[curSlide];

//   return (
//     <div
//       className="tour-overlay"
//       onClick={(e) => e.target === e.currentTarget && handleClose()}
//     >
//       <div className="tour-modal">
//         {/* ── Header ── */}
//         <div className="tour-header">
//           <div className="tour-header-left">
//             <span className="tour-header-logo">WIMC™</span>
//             <span className="tour-header-badge">Feature Tour</span>
//           </div>
//           <button
//             className="tour-close"
//             onClick={handleClose}
//             aria-label="Close tour"
//           >
//             ×
//           </button>
//         </div>

//         {/* ── Slide area ── */}
//         <div className="tour-stage">
//           {slide.type === "title" ? (
//             <TitleSlide slide={slide} />
//           ) : (
//             <FeatureSlide slide={slide} />
//           )}

//           {/* Avatar overlay */}
//           <div className="tour-avatar-overlay">
//             <div className="tour-avatar-wrap">
//               <Avatar talking={talking} />
//             </div>
//             <div className="tour-caption">
//               <div className="tour-caption-name">WIMC Guide</div>
//               <div className="tour-caption-text">
//                 {caption}
//                 <span className="tour-cursor" />
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* ── Timeline ── */}
//         <div
//           className="tour-timeline"
//           onClick={handleTimelineClick}
//           title="Click to seek"
//         >
//           <div className="tour-timeline-fill" style={{ width: `${pct}%` }} />
//           {/* Slide markers */}
//           {SLIDES.map((s, i) => {
//             let pos = 0;
//             for (let j = 0; j < i; j++) pos += SLIDES[j].dur;
//             return (
//               <div
//                 key={s.id}
//                 className="tour-marker"
//                 style={{ left: `${(pos / TOTAL_DUR) * 100}%` }}
//                 title={s.label}
//               />
//             );
//           })}
//         </div>

//         {/* ── Controls ── */}
//         <div className="tour-controls">
//           <button
//             className="tour-play-btn"
//             onClick={() => (playing ? stopPlayback() : startPlayback())}
//             aria-label={playing ? "Pause" : "Play"}
//           >
//             {playing ? "⏸" : "▶"}
//           </button>
//           <button
//             className="tour-mute-btn"
//             onClick={toggleMute}
//             aria-label={muted ? "Unmute narration" : "Mute narration"}
//             title={muted ? "Unmute narration" : "Mute narration"}
//           >
//             {muted ? "🔇" : "🔊"}
//           </button>

//           <span className="tour-time">
//             {fmt(elapsed)} / {fmt(TOTAL_DUR)}
//           </span>

//           <div className="tour-dots">
//             {SLIDES.map((s, i) => (
//               <button
//                 key={s.id}
//                 className={`tour-dot ${i === curSlide ? "tour-dot--active" : i < curSlide ? "tour-dot--done" : ""}`}
//                 onClick={() => jumpTo(i)}
//                 title={s.label}
//                 aria-label={`Go to ${s.label}`}
//               />
//             ))}
//           </div>

//           <span className="tour-slide-name">{slide.label}</span>

//           <button className="tour-skip" onClick={handleClose}>
//             Skip Tour
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ── Hook: first-time auto-show ─────────────────────────────────────────────
// export function useWIMCTour() {
//   const [isOpen, setIsOpen] = useState(false);

//   const openTour = () => setIsOpen(true);
//   const closeTour = () => setIsOpen(false);

//   // Auto-show once for new users
//   const showIfNew = useCallback(() => {
//     if (!localStorage.getItem(LS_SEEN_KEY)) setIsOpen(true);
//   }, []);

//   return { isOpen, openTour, closeTour, showIfNew };
// }

// import React, { useState, useEffect, useRef, useCallback } from "react";
// import "./WIMCTourVideo.css";

// // ── Slide data ────────────────────────────────────────────────────────────────
// const SLIDES = [
//   {
//     id: "welcome",
//     label: "Welcome",
//     dur: 7,
//     icon: "👗",
//     title: "WIMC™",
//     subtitle: "What's In My Closet",
//     tags: [
//       "🔐 Secure Auth",
//       "👗 Smart Closet",
//       "✨ 5 AI Features",
//       "🎬 Try-On Studio",
//       "👶 Kids' Closet",
//       "🛒 AI Shopping",
//       "🌤️ Weather",
//       "🧾 Receipts",
//       "📋 Wish List",
//       "⚙️ Settings",
//     ],
//     features: [],
//     type: "title",
//   },
//   {
//     id: "auth",
//     label: "Authentication",
//     dur: 9,
//     icon: "🔐",
//     title: "Authentication",
//     type: "feature",
//     mockupTitle: "WIMC™ — Sign In",
//     features: [
//       "Sign Up & Login flow",
//       "SHA-256 password hashing",
//       "Secure localStorage session",
//       "Avatar photo upload",
//       "Edit profile in Settings",
//       "Password change + strength meter",
//     ],
//     featureIcons: ["✅", "🔑", "💾", "📷", "✏️", "🔄"],
//   },
//   {
//     id: "closet",
//     label: "Smart Closet",
//     dur: 9,
//     icon: "👗",
//     title: "Smart Closet",
//     type: "feature",
//     mockupTitle: "My Closet",
//     features: [
//       "6 clothing categories",
//       "Images & video uploads",
//       "Cloudinary media storage",
//       "Per-section custom backgrounds",
//       "Color palette + photo presets",
//       "Try-On button per section",
//       "AI Natural Language Search",
//     ],
//     featureIcons: ["📦", "🖼️", "☁️", "🎨", "🌈", "🎬", "🔍"],
//   },
//   {
//     id: "planning",
//     label: "Planning Tools",
//     dur: 9,
//     icon: "📅",
//     title: "Planning Tools",
//     type: "feature",
//     mockupTitle: "Outfit Preview + Planner",
//     features: [
//       "Outfit Preview Panel",
//       "Drag-and-drop reordering",
//       "Favorites & saved looks",
//       "Share & print outfit",
//       "7-day Outfit Planner",
//       "Travel Pack Panel",
//       "AI Packing Assistant",
//       "Export / import plans",
//     ],
//     featureIcons: ["👁️", "↕️", "⭐", "🔗", "📅", "✈️", "🧳", "📤"],
//   },
//   {
//     id: "ai",
//     label: "AI Features",
//     dur: 10,
//     icon: "✨",
//     title: "Five AI Features",
//     type: "feature",
//     mockupTitle: "✨ AI Features",
//     features: [
//       "AI Outfit Stylist chat",
//       "AI Packing Assistant",
//       "Smart Donation Advisor",
//       "AI Try-On Style Feedback",
//       "Natural Language Search",
//       "Shopping: Suggest items",
//       "Shopping: Budget analysis",
//       "Shopping: Prioritize list",
//     ],
//     featureIcons: ["💬", "🧳", "🗑️", "🎬", "🔍", "💡", "💰", "🎯"],
//   },
//   {
//     id: "tryon",
//     label: "Try-On Studio",
//     dur: 9,
//     icon: "🎬",
//     title: "Media & Studio",
//     type: "feature",
//     mockupTitle: "🎬 Try-On Studio",
//     features: [
//       "Live camera recording",
//       "Front / rear camera toggle",
//       "Upload & cloud storage",
//       "AI Style Feedback (4 sections)",
//       "Video Bin with grid / list",
//       "Timestamps & custom titles",
//       "Download & share videos",
//     ],
//     featureIcons: ["📸", "🔄", "☁️", "✨", "🎥", "🕐", "⬇️"],
//   },
//   {
//     id: "kids",
//     label: "Kids & Receipts",
//     dur: 9,
//     icon: "👶",
//     title: "Kids & Receipts",
//     type: "feature",
//     mockupTitle: "Kids' Closet · Receipts",
//     features: [
//       "Baby, Toddler, Kids, Teen profiles",
//       "US & EU sizing side-by-side",
//       "Per-child closet sections",
//       "14-day soft delete & restore",
//       "Share size cards via link",
//       "Receipts: Photo, PDF, Email",
//       "Filter by store / category",
//     ],
//     featureIcons: ["👶", "📏", "👗", "♻️", "📤", "📷", "🔍"],
//   },
//   {
//     id: "shopping",
//     label: "Shopping List",
//     dur: 9,
//     icon: "🛒",
//     title: "Shopping & Wish List",
//     type: "feature",
//     mockupTitle: "🛒 Shopping List",
//     features: [
//       "3 default categories",
//       "Unlimited custom categories",
//       "300+ emoji across 10 groups",
//       "4 AI modes built-in",
//       "Share list via link",
//       "Download JSON / copy text",
//       "Wish List with URL previews",
//       "Import shared lists",
//     ],
//     featureIcons: ["🛒", "➕", "😀", "🤖", "🔗", "⬇️", "📋", "📥"],
//   },
//   {
//     id: "settings",
//     label: "Settings & More",
//     dur: 9,
//     icon: "⚙️",
//     title: "Settings & More",
//     type: "feature",
//     mockupTitle: "Settings · Weather · More",
//     features: [
//       "Edit profile & upload avatar",
//       "Password + strength meter",
//       "Page & card backgrounds",
//       "Weather — current + 7-day",
//       "Donate Bin + AI Advisor",
//       "About page",
//       "Built with React + Cloudinary",
//     ],
//     featureIcons: ["🖼️", "🔒", "🎨", "🌤️", "🗑️", "ℹ️", "🚀"],
//   },
// ];

// const SCRIPTS = [
//   "Welcome to WIMC — What's In My Closet! This is your AI-powered personal closet manager. Let me walk you through everything this app can do.",
//   "WIMC starts with secure authentication. Sign up or log in — all passwords are protected with SHA-256 hashing. Upload a profile photo and update your account anytime from Settings.",
//   "Your closet is organized into six smart categories. Upload photos and videos of your clothing items, stored securely in the cloud. Customize each section's background with photo presets or a full color palette.",
//   "The Outfit Preview Panel lets you build looks with drag-and-drop. Save favorites, share outfits, and plan your entire week with the Outfit Planner. The Travel Pack Panel helps you pack smarter with AI assistance.",
//   "WIMC has five AI features built in — an AI Stylist that answers any style question, Natural Language Search, a Smart Donation Advisor, AI Style Feedback after try-ons, and a full AI Shopping Assistant.",
//   "The Try-On Studio lets you record outfit videos using your front or rear camera. After recording, get personalized AI Style Feedback covering what works, style tips, and how to complete the look.",
//   "Kids' Closet lets you manage clothing profiles for each child, with US and EU sizing shown side by side. Deleted profiles stay recoverable for 14 days. The Receipts page stores all your shopping receipts by photo, PDF, or email.",
//   "The Shopping List has three built-in categories plus unlimited custom ones with over 300 emoji to choose from. Use four AI modes to suggest items, analyze your budget, or prioritize your list. Share lists via a link or download them.",
//   "Settings gives you full control over your profile, password, and the app's appearance. Check the weather right from the header to plan your outfits. That's WIMC — your complete AI closet companion!",
// ];

// const TOTAL_DUR = SLIDES.reduce((a, s) => a + s.dur, 0);

// // ── Avatar SVG — brown-skinned female ────────────────────────────────────────
// function Avatar({ talking }) {
//   return (
//     <svg
//       viewBox="0 0 80 90"
//       xmlns="http://www.w3.org/2000/svg"
//       className="tour-avatar-svg"
//     >
//       {/* Body / blouse — blue */}
//       <ellipse cx="40" cy="82" rx="26" ry="12" fill="#1d4ed8" />
//       <rect x="26" y="60" width="28" height="24" rx="6" fill="#1d4ed8" />
//       {/* Collar detail */}
//       <path
//         d="M34 60 Q40 65 46 60"
//         stroke="#3b82f6"
//         strokeWidth="1.2"
//         fill="none"
//         strokeLinecap="round"
//       />
//       {/* Neck */}
//       <rect x="35" y="50" width="10" height="12" rx="4" fill="#7c4a1e" />
//       {/* Head */}
//       <ellipse cx="40" cy="38" rx="19" ry="21" fill="#7c4a1e" />
//       {/* Hair — shoulder-length natural hair, ends just above shoulder */}
//       {/* Top / crown */}
//       <ellipse cx="40" cy="17" rx="20" ry="9" fill="#1a0a00" />
//       {/* Left side — ends at shoulder level (~y=57) */}
//       <path
//         d="M21 22 Q13 35 16 50 Q18 57 23 55 Q22 44 24 30 Z"
//         fill="#1a0a00"
//       />
//       {/* Right side — ends at shoulder level */}
//       <path
//         d="M59 22 Q67 35 64 50 Q62 57 57 55 Q58 44 56 30 Z"
//         fill="#1a0a00"
//       />
//       {/* Back hair volume between sides */}
//       <path
//         d="M23 55 Q28 60 40 61 Q52 60 57 55 Q55 48 56 35 Q40 38 24 35 Z"
//         fill="#1a0a00"
//       />
//       {/* Top hair highlight */}
//       <ellipse cx="36" cy="14" rx="7" ry="3" fill="#2d1400" opacity="0.55" />
//       {/* Eyebrows */}
//       <path
//         d="M30 30 Q34 27 38 29"
//         stroke="#1a0a00"
//         strokeWidth="1.8"
//         fill="none"
//         strokeLinecap="round"
//       />
//       <path
//         d="M42 29 Q46 27 50 30"
//         stroke="#1a0a00"
//         strokeWidth="1.8"
//         fill="none"
//         strokeLinecap="round"
//       />
//       {/* Eyes */}
//       <ellipse cx="34" cy="35" rx="3" ry="3.2" fill="#1a0a00" />
//       <ellipse cx="46" cy="35" rx="3" ry="3.2" fill="#1a0a00" />
//       {/* Eye shine */}
//       <ellipse cx="35.2" cy="33.8" rx="1.1" ry="1.1" fill="#fff" />
//       <ellipse cx="47.2" cy="33.8" rx="1.1" ry="1.1" fill="#fff" />
//       {/* Eyelashes */}
//       <path
//         d="M31 32.5 Q34 31 37 32.5"
//         stroke="#1a0a00"
//         strokeWidth="1"
//         fill="none"
//       />
//       <path
//         d="M43 32.5 Q46 31 49 32.5"
//         stroke="#1a0a00"
//         strokeWidth="1"
//         fill="none"
//       />
//       {/* Nose */}
//       <path
//         d="M38 40 Q40 43 42 40"
//         stroke="#5a3010"
//         strokeWidth="1.2"
//         fill="none"
//         strokeLinecap="round"
//       />
//       {/* Mouth */}
//       <path
//         d={talking ? "M32 49 Q40 57 48 49" : "M32 49 Q40 54 48 49"}
//         stroke="#c0392b"
//         strokeWidth="2"
//         fill="none"
//         strokeLinecap="round"
//       />
//       {/* Lip fullness */}
//       <path
//         d="M32 49 Q36 51 40 49 Q44 51 48 49"
//         stroke="#a93226"
//         strokeWidth="1"
//         fill="none"
//         strokeLinecap="round"
//       />
//       {/* Gold stud earrings — small solid circles at earlobe */}
//       <circle cx="21" cy="44" r="2.2" fill="#fbbf24" />
//       <circle cx="21" cy="44" r="1.2" fill="#fde68a" />
//       <circle cx="59" cy="44" r="2.2" fill="#fbbf24" />
//       <circle cx="59" cy="44" r="1.2" fill="#fde68a" />
//     </svg>
//   );
// }

// // ── Slide content ─────────────────────────────────────────────────────────────
// function TitleSlide({ slide }) {
//   return (
//     <div className="tour-title-slide">
//       <div className="tour-title-logo">{slide.icon}</div>
//       <div className="tour-title-name">{slide.title}</div>
//       <div className="tour-title-sub">{slide.subtitle}</div>
//       <div className="tour-title-tags">
//         {slide.tags.map((t) => (
//           <span key={t} className="tour-tag">
//             {t}
//           </span>
//         ))}
//       </div>
//     </div>
//   );
// }

// function FeatureSlide({ slide }) {
//   return (
//     <div className="tour-feature-slide">
//       {/* Left: mockup */}
//       <div className="tour-mockup">
//         <div className="tour-mockup-bar">
//           <span className="tour-mockup-title">{slide.mockupTitle}</span>
//           <div className="tour-mockup-dots">
//             <span style={{ background: "#ef4444" }} />
//             <span style={{ background: "#f59e0b" }} />
//             <span style={{ background: "#22c55e" }} />
//           </div>
//         </div>
//         <div className="tour-mockup-body">
//           <MockupContent id={slide.id} />
//         </div>
//       </div>
//       {/* Right: feature list */}
//       <div className="tour-feat-panel">
//         <div className="tour-feat-title">
//           {slide.icon} {slide.title}
//         </div>
//         <ul className="tour-feat-list">
//           {slide.features.map((f, i) => (
//             <li key={f}>
//               <span className="tour-feat-icon">{slide.featureIcons[i]}</span>
//               {f}
//             </li>
//           ))}
//         </ul>
//       </div>
//     </div>
//   );
// }

// // Individual mockup bodies
// function MockupContent({ id }) {
//   switch (id) {
//     case "auth":
//       return (
//         <div className="mc-auth">
//           <div className="mc-auth-avatar">👤</div>
//           <div className="mc-auth-heading">Welcome Back</div>
//           <div className="mc-field">📧 Email address</div>
//           <div className="mc-field mc-field--active">🔒 ••••••••</div>
//           <div className="mc-btn">Log In to My Closet</div>
//           <div className="mc-secure">
//             🔒 SHA-256 encrypted · Secure session · Avatar sync
//           </div>
//         </div>
//       );
//     case "closet":
//       return (
//         <div>
//           <div className="mc-card-grid">
//             {[
//               ["👗", "#2d1b4e", "Dresses"],
//               ["👟", "#1a2e4a", "Shoes"],
//               ["👖", "#1a3a2a", "Pants"],
//               ["👚", "#2d2010", "Tops"],
//               ["👜", "#2a1a2e", "Bags"],
//               ["🧥", "#1a1a2e", "Jackets"],
//             ].map(([e, bg, l]) => (
//               <div className="mc-card" key={l}>
//                 <div className="mc-card-img" style={{ background: bg }}>
//                   {e}
//                 </div>
//                 <div className="mc-card-lbl">{l}</div>
//               </div>
//             ))}
//           </div>
//           <div className="mc-bg-row">
//             <span className="mc-bg-label">🎨 Custom Backgrounds</span>
//             <div className="mc-bg-swatches">
//               {["#7c3aed", "#0369a1", "#d97706", "#FFE4E1", "#B2C5B2"].map(
//                 (c) => (
//                   <div
//                     key={c}
//                     className="mc-swatch"
//                     style={{
//                       background: c,
//                       border: c === "#FFE4E1" ? "1px solid #555" : undefined,
//                     }}
//                   />
//                 ),
//               )}
//             </div>
//           </div>
//         </div>
//       );
//     case "planning":
//       return (
//         <div>
//           <div className="mc-panel" style={{ marginBottom: 7 }}>
//             <div className="mc-panel-title" style={{ color: "#7c3aed" }}>
//               Current Selection
//             </div>
//             <div className="mc-chips">
//               {["Blue Wrap Dress", "Nude Heels", "Gold Clutch"].map((c) => (
//                 <span key={c} className="mc-chip mc-chip--active">
//                   {c}
//                 </span>
//               ))}
//             </div>
//           </div>
//           <div className="mc-panel" style={{ marginBottom: 7 }}>
//             <div className="mc-panel-title" style={{ color: "#0369a1" }}>
//               📅 Weekly Planner
//             </div>
//             <div className="mc-week">
//               {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
//                 <div key={i} className="mc-day">
//                   <div
//                     className="mc-day-lbl"
//                     style={{
//                       color:
//                         i < 2 || i === 3 || i === 4 ? "#7c3aed" : "#334155",
//                     }}
//                   >
//                     {d}
//                   </div>
//                   <div
//                     className="mc-day-bar"
//                     style={{
//                       background:
//                         i < 2 || i === 3 || i === 4 ? "#2d1b4e" : "#1e293b",
//                     }}
//                   />
//                 </div>
//               ))}
//             </div>
//           </div>
//           <div className="mc-panel">
//             <div className="mc-panel-title" style={{ color: "#d97706" }}>
//               ✈️ Travel Pack
//             </div>
//             <div className="mc-chips">
//               <span className="mc-chip">Paris — 5 days</span>
//               <span className="mc-chip">12 items packed</span>
//             </div>
//           </div>
//         </div>
//       );
//     case "ai":
//       return (
//         <div>
//           <div className="mc-bubble mc-bubble--user">
//             What should I wear to a garden party?
//           </div>
//           <div className="mc-bubble mc-bubble--ai">
//             <div className="mc-bubble-label">✨ AI Stylist</div>
//             Your floral wrap dress with nude heels and a woven bag —
//             effortlessly chic for a summer garden party!
//           </div>
//           <div className="mc-ai-grid">
//             {[
//               ["🔍 Smart Search", "#7c3aed", '"casual summer" → Tops'],
//               ["🗑️ Donation AI", "#ef4444", "4-question advisor"],
//               ["🛒 Shopping AI", "#059669", "Suggest · Budget · Prioritize"],
//               ["🎬 Style Feedback", "#d97706", "Post try-on coaching"],
//             ].map(([t, c, s]) => (
//               <div key={t} className="mc-ai-card">
//                 <div
//                   style={{
//                     fontSize: 8,
//                     color: c,
//                     fontWeight: 700,
//                     marginBottom: 2,
//                   }}
//                 >
//                   {t}
//                 </div>
//                 <div style={{ fontSize: 7, color: "#64748b" }}>{s}</div>
//               </div>
//             ))}
//           </div>
//         </div>
//       );
//     case "tryon":
//       return (
//         <div>
//           <div className="mc-camera">
//             <div style={{ fontSize: 28 }}>📸</div>
//             <div className="mc-rec-badge">● REC 0:23</div>
//             <div className="mc-camera-hint">Front camera — tap to switch</div>
//           </div>
//           <div className="mc-cam-btns">
//             <div className="mc-cam-btn">⏹ Stop</div>
//             <div className="mc-cam-btn mc-cam-btn--primary">⬇️ Save</div>
//             <div className="mc-cam-btn">🔗 Share</div>
//           </div>
//           <div className="mc-ai-feedback">
//             <div
//               style={{
//                 fontSize: 8,
//                 color: "#a78bfa",
//                 fontWeight: 700,
//                 marginBottom: 4,
//               }}
//             >
//               ✨ AI Style Feedback
//             </div>
//             <div className="mc-chips">
//               {["Work", "Casual", "Date Night", "Weekend"].map((o) => (
//                 <span key={o} className="mc-chip">
//                   {o}
//                 </span>
//               ))}
//             </div>
//           </div>
//         </div>
//       );
//     case "kids":
//       return (
//         <div>
//           <div className="mc-kids-grid">
//             <div className="mc-kid-card">
//               <div style={{ fontSize: 16 }}>👧</div>
//               <div className="mc-kid-name">Emma, 7</div>
//               <div className="mc-kid-info">Kids · US 7 / EU 24</div>
//               <div className="mc-chips" style={{ marginTop: 4 }}>
//                 <span className="mc-chip mc-chip--small">Open Closet</span>
//                 <span className="mc-chip mc-chip--small">Share Sizes</span>
//               </div>
//             </div>
//             <div className="mc-kid-card">
//               <div style={{ fontSize: 16 }}>👦</div>
//               <div className="mc-kid-name">Liam, 3</div>
//               <div className="mc-kid-info">Toddler · US 3T / EU 98</div>
//               <div style={{ fontSize: 7, color: "#f59e0b", marginTop: 4 }}>
//                 ⏳ 11 days until deleted
//               </div>
//             </div>
//           </div>
//           <div className="mc-panel" style={{ marginTop: 7 }}>
//             <div className="mc-panel-title" style={{ color: "#059669" }}>
//               🧾 Receipts
//             </div>
//             <div className="mc-receipt-row">
//               {[
//                 ["📷", "Photo"],
//                 ["📄", "PDF"],
//                 ["📧", "Email"],
//               ].map(([e, l]) => (
//                 <div key={l} className="mc-receipt-card">
//                   <div style={{ fontSize: 14 }}>{e}</div>
//                   <div style={{ fontSize: 7, color: "#64748b" }}>{l}</div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </div>
//       );
//     case "shopping":
//       return (
//         <div>
//           <div className="mc-chips" style={{ marginBottom: 7 }}>
//             <span className="mc-chip mc-chip--active">👗 Clothing</span>
//             <span className="mc-chip">✈️ Travel</span>
//             <span className="mc-chip">🧸 Kids</span>
//             <span className="mc-chip mc-chip--dashed">+ Custom</span>
//           </div>
//           <div className="mc-sl-items">
//             <div className="mc-sl-item mc-sl-item--done">
//               <div className="mc-sl-check mc-sl-check--done">✓</div>
//               <span
//                 style={{ textDecoration: "line-through", color: "#64748b" }}
//               >
//                 Winter coat (AI suggested)
//               </span>
//             </div>
//             <div className="mc-sl-item">
//               <div className="mc-sl-check" />
//               <span>Ankle boots — Size 8</span>
//             </div>
//             <div className="mc-sl-item">
//               <div className="mc-sl-check" />
//               <span>Cashmere turtleneck</span>
//             </div>
//           </div>
//           <div className="mc-ai-modes">
//             <div
//               style={{
//                 fontSize: 7,
//                 color: "#a78bfa",
//                 fontWeight: 700,
//                 marginBottom: 4,
//               }}
//             >
//               ✨ AI Modes
//             </div>
//             <div className="mc-chips">
//               {["💡 Suggest", "💬 Chat", "💰 Budget", "🎯 Prioritize"].map(
//                 (m) => (
//                   <span key={m} className="mc-chip">
//                     {m}
//                   </span>
//                 ),
//               )}
//             </div>
//           </div>
//         </div>
//       );
//     case "settings":
//       return (
//         <div>
//           <div className="mc-settings-tabs">
//             {[
//               ["👤 Profile", true],
//               ["🔒 Password", false],
//               ["🎨 Appearance", false],
//             ].map(([l, a]) => (
//               <div
//                 key={l}
//                 className={`mc-settings-tab${a ? " mc-settings-tab--active" : ""}`}
//               >
//                 {l}
//               </div>
//             ))}
//           </div>
//           <div className="mc-panel" style={{ marginBottom: 6 }}>
//             <div className="mc-panel-title" style={{ color: "#0369a1" }}>
//               🌤️ Weather — Washington DC
//             </div>
//             <div className="mc-weather-row">
//               <div style={{ fontSize: 20 }}>⛅</div>
//               <div className="mc-weather-temp">72°F</div>
//               <div
//                 style={{ fontSize: 7, color: "#64748b", textAlign: "right" }}
//               >
//                 Partly cloudy
//                 <br />
//                 7-day forecast
//               </div>
//             </div>
//           </div>
//           <div className="mc-bottom-btns">
//             <div className="mc-bottom-btn" style={{ color: "#ef4444" }}>
//               🗑️ Donate Bin
//             </div>
//             <div className="mc-bottom-btn">ℹ️ About</div>
//             <div className="mc-bottom-btn mc-bottom-btn--primary">
//               WIMC™ Complete
//             </div>
//           </div>
//         </div>
//       );
//     default:
//       return null;
//   }
// }

// // ── Main component ────────────────────────────────────────────────────────────
// const LS_SEEN_KEY = "wimc_tour_seen";

// export default function WIMCTourVideo({ isOpen, onClose, autoPlay = true }) {
//   const [curSlide, setCurSlide] = useState(0);
//   const [elapsed, setElapsed] = useState(0);
//   const [playing, setPlaying] = useState(false);
//   const [caption, setCaption] = useState("");
//   const [talking, setTalking] = useState(false);
//   const [hasStarted, setHasStarted] = useState(false);

//   const rafRef = useRef(null);
//   const lastTsRef = useRef(null);
//   const typeRef = useRef(null);
//   const talkRef = useRef(null);
//   const elapsedRef = useRef(0);
//   const playingRef = useRef(false);
//   const uttRef = useRef(null); // Web Speech utterance
//   const [voiceReady, setVoiceReady] = useState(false);
//   const [muted, setMuted] = useState(false);
//   const mutedRef = useRef(false);

//   const fmt = (s) => {
//     const m = Math.floor(s / 60);
//     return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
//   };

//   const getSlideAt = (t) => {
//     let acc = 0;
//     for (let i = 0; i < SLIDES.length; i++) {
//       acc += SLIDES[i].dur;
//       if (t < acc) return i;
//     }
//     return SLIDES.length - 1;
//   };

//   const stopTalk = useCallback(() => {
//     clearTimeout(talkRef.current);
//     setTalking(false);
//   }, []);

//   // ── Web Speech API helpers ──────────────────────────────────────────────────
//   const stopSpeech = useCallback(() => {
//     if (window.speechSynthesis) window.speechSynthesis.cancel();
//   }, []);

//   const speak = useCallback((text) => {
//     if (!window.speechSynthesis || mutedRef.current) return;
//     window.speechSynthesis.cancel();
//     const utt = new SpeechSynthesisUtterance(text);
//     utt.rate = 0.92;
//     utt.pitch = 1.1;
//     utt.volume = 1;
//     // Prefer a female English voice
//     const voices = window.speechSynthesis.getVoices();
//     const femaleVoice =
//       voices.find(
//         (v) =>
//           v.lang.startsWith("en") &&
//           /female|woman|samantha|karen|victoria|moira|fiona|zira|susan|eva|allison|ava/i.test(
//             v.name,
//           ),
//       ) ||
//       voices.find(
//         (v) =>
//           v.lang.startsWith("en") && v.name.toLowerCase().includes("google"),
//       ) ||
//       voices.find((v) => v.lang.startsWith("en"));
//     if (femaleVoice) utt.voice = femaleVoice;
//     uttRef.current = utt;
//     window.speechSynthesis.speak(utt);
//   }, []);

//   // Voices load async — re-render when ready
//   useEffect(() => {
//     const load = () => setVoiceReady(true);
//     if (window.speechSynthesis) {
//       window.speechSynthesis.onvoiceschanged = load;
//       if (window.speechSynthesis.getVoices().length > 0) load();
//     }
//     return () => {
//       if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null;
//     };
//   }, []);

//   const toggleMute = useCallback(() => {
//     setMuted((v) => {
//       const next = !v;
//       mutedRef.current = next;
//       if (next) stopSpeech();
//       return next;
//     });
//   }, [stopSpeech]);

//   const animateTalk = useCallback(() => {
//     setTalking((v) => !v);
//     talkRef.current = setTimeout(animateTalk, 150);
//   }, []);

//   const typeCaption = useCallback(
//     (text) => {
//       clearTimeout(typeRef.current);
//       setCaption("");
//       setTalking(true);
//       clearTimeout(talkRef.current);
//       animateTalk();
//       speak(text);
//       let i = 0;
//       const step = () => {
//         if (i <= text.length) {
//           setCaption(text.slice(0, i));
//           i++;
//           typeRef.current = setTimeout(step, 28);
//         } else {
//           stopTalk();
//         }
//       };
//       step();
//     },
//     [animateTalk, stopTalk, speak],
//   );

//   const showSlide = useCallback(
//     (n) => {
//       setCurSlide(n);
//       typeCaption(SCRIPTS[n]);
//     },
//     [typeCaption],
//   );

//   const stopPlayback = useCallback(() => {
//     playingRef.current = false;
//     setPlaying(false);
//     lastTsRef.current = null;
//     cancelAnimationFrame(rafRef.current);
//     stopTalk();
//     stopSpeech();
//   }, [stopTalk, stopSpeech]);

//   const tick = useCallback(
//     (ts) => {
//       if (!playingRef.current) return;
//       if (lastTsRef.current) {
//         elapsedRef.current = Math.min(
//           elapsedRef.current + (ts - lastTsRef.current) / 1000,
//           TOTAL_DUR,
//         );
//         setElapsed(elapsedRef.current);
//         const n = getSlideAt(elapsedRef.current);
//         setCurSlide((prev) => {
//           if (n !== prev) {
//             typeCaption(SCRIPTS[n]);
//             return n;
//           }
//           return prev;
//         });
//       }
//       lastTsRef.current = ts;
//       if (elapsedRef.current >= TOTAL_DUR) {
//         stopPlayback();
//         setElapsed(0);
//         elapsedRef.current = 0;
//         setCurSlide(0);
//         typeCaption(SCRIPTS[0]);
//         return;
//       }
//       rafRef.current = requestAnimationFrame(tick);
//     },
//     [typeCaption, stopPlayback],
//   );

//   const startPlayback = useCallback(() => {
//     playingRef.current = true;
//     setPlaying(true);
//     setHasStarted(true);
//     lastTsRef.current = null;
//     rafRef.current = requestAnimationFrame(tick);
//   }, [tick]);

//   const jumpTo = useCallback(
//     (idx) => {
//       stopPlayback();
//       let t = 0;
//       for (let i = 0; i < idx; i++) t += SLIDES[i].dur;
//       elapsedRef.current = t;
//       setElapsed(t);
//       showSlide(idx);
//     },
//     [stopPlayback, showSlide],
//   );

//   const handleTimelineClick = (e) => {
//     const rect = e.currentTarget.getBoundingClientRect();
//     const pct = (e.clientX - rect.left) / rect.width;
//     const t = pct * TOTAL_DUR;
//     elapsedRef.current = t;
//     setElapsed(t);
//     const n = getSlideAt(t);
//     showSlide(n);
//   };

//   // Auto-start when opened
//   useEffect(() => {
//     if (isOpen) {
//       elapsedRef.current = 0;
//       setElapsed(0);
//       setCurSlide(0);
//       typeCaption(SCRIPTS[0]);
//       if (autoPlay) setTimeout(() => startPlayback(), 600);
//     } else {
//       stopPlayback();
//       clearTimeout(typeRef.current);
//     }
//     return () => {
//       stopPlayback();
//       stopSpeech();
//       clearTimeout(typeRef.current);
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [isOpen]);

//   const handleClose = () => {
//     stopPlayback();
//     localStorage.setItem(LS_SEEN_KEY, "true");
//     onClose?.();
//   };

//   if (!isOpen) return null;

//   const pct = Math.min((elapsed / TOTAL_DUR) * 100, 100);
//   const slide = SLIDES[curSlide];

//   return (
//     <div
//       className="tour-overlay"
//       onClick={(e) => e.target === e.currentTarget && handleClose()}
//     >
//       <div className="tour-modal">
//         {/* ── Header ── */}
//         <div className="tour-header">
//           <div className="tour-header-left">
//             <span className="tour-header-logo">WIMC™</span>
//             <span className="tour-header-badge">Feature Tour</span>
//           </div>
//           <button
//             className="tour-close"
//             onClick={handleClose}
//             aria-label="Close tour"
//           >
//             ×
//           </button>
//         </div>

//         {/* ── Slide area ── */}
//         <div className="tour-stage">
//           {slide.type === "title" ? (
//             <TitleSlide slide={slide} />
//           ) : (
//             <FeatureSlide slide={slide} />
//           )}

//           {/* Avatar overlay */}
//           <div className="tour-avatar-overlay">
//             <div className="tour-avatar-wrap">
//               <Avatar talking={talking} />
//             </div>
//             <div className="tour-caption">
//               <div className="tour-caption-name">WIMC Guide</div>
//               <div className="tour-caption-text">
//                 {caption}
//                 <span className="tour-cursor" />
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* ── Timeline ── */}
//         <div
//           className="tour-timeline"
//           onClick={handleTimelineClick}
//           title="Click to seek"
//         >
//           <div className="tour-timeline-fill" style={{ width: `${pct}%` }} />
//           {/* Slide markers */}
//           {SLIDES.map((s, i) => {
//             let pos = 0;
//             for (let j = 0; j < i; j++) pos += SLIDES[j].dur;
//             return (
//               <div
//                 key={s.id}
//                 className="tour-marker"
//                 style={{ left: `${(pos / TOTAL_DUR) * 100}%` }}
//                 title={s.label}
//               />
//             );
//           })}
//         </div>

//         {/* ── Controls ── */}
//         <div className="tour-controls">
//           <button
//             className="tour-play-btn"
//             onClick={() => (playing ? stopPlayback() : startPlayback())}
//             aria-label={playing ? "Pause" : "Play"}
//           >
//             {playing ? "⏸" : "▶"}
//           </button>
//           <button
//             className="tour-mute-btn"
//             onClick={toggleMute}
//             aria-label={muted ? "Unmute narration" : "Mute narration"}
//             title={muted ? "Unmute narration" : "Mute narration"}
//           >
//             {muted ? "🔇" : "🔊"}
//           </button>

//           <span className="tour-time">
//             {fmt(elapsed)} / {fmt(TOTAL_DUR)}
//           </span>

//           <div className="tour-dots">
//             {SLIDES.map((s, i) => (
//               <button
//                 key={s.id}
//                 className={`tour-dot ${i === curSlide ? "tour-dot--active" : i < curSlide ? "tour-dot--done" : ""}`}
//                 onClick={() => jumpTo(i)}
//                 title={s.label}
//                 aria-label={`Go to ${s.label}`}
//               />
//             ))}
//           </div>

//           <span className="tour-slide-name">{slide.label}</span>

//           <button className="tour-skip" onClick={handleClose}>
//             Skip Tour
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ── Hook: first-time auto-show ─────────────────────────────────────────────
// export function useWIMCTour() {
//   const [isOpen, setIsOpen] = useState(false);

//   const openTour = () => setIsOpen(true);
//   const closeTour = () => setIsOpen(false);

//   // Auto-show once for new users
//   const showIfNew = useCallback(() => {
//     if (!localStorage.getItem(LS_SEEN_KEY)) setIsOpen(true);
//   }, []);

//   return { isOpen, openTour, closeTour, showIfNew };
// }

// import React, { useState, useEffect, useRef, useCallback } from "react";
// import "./WIMCTourVideo.css";

// // ── Slide data ────────────────────────────────────────────────────────────────
// const SLIDES = [
//   {
//     id: "welcome",
//     label: "Welcome",
//     dur: 7,
//     icon: "👗",
//     title: "WIMC™",
//     subtitle: "What's In My Closet",
//     tags: [
//       "🔐 Secure Auth",
//       "👗 Smart Closet",
//       "✨ 5 AI Features",
//       "🎬 Try-On Studio",
//       "👶 Kids' Closet",
//       "🛒 AI Shopping",
//       "🌤️ Weather",
//       "🧾 Receipts",
//       "📋 Wish List",
//       "⚙️ Settings",
//     ],
//     features: [],
//     type: "title",
//   },
//   {
//     id: "auth",
//     label: "Authentication",
//     dur: 9,
//     icon: "🔐",
//     title: "Authentication",
//     type: "feature",
//     mockupTitle: "WIMC™ — Sign In",
//     features: [
//       "Sign Up & Login flow",
//       "SHA-256 password hashing",
//       "Secure localStorage session",
//       "Avatar photo upload",
//       "Edit profile in Settings",
//       "Password change + strength meter",
//     ],
//     featureIcons: ["✅", "🔑", "💾", "📷", "✏️", "🔄"],
//   },
//   {
//     id: "closet",
//     label: "Smart Closet",
//     dur: 9,
//     icon: "👗",
//     title: "Smart Closet",
//     type: "feature",
//     mockupTitle: "My Closet",
//     features: [
//       "6 clothing categories",
//       "Images & video uploads",
//       "Cloudinary media storage",
//       "Per-section custom backgrounds",
//       "Color palette + photo presets",
//       "Try-On button per section",
//       "AI Natural Language Search",
//     ],
//     featureIcons: ["📦", "🖼️", "☁️", "🎨", "🌈", "🎬", "🔍"],
//   },
//   {
//     id: "planning",
//     label: "Planning Tools",
//     dur: 9,
//     icon: "📅",
//     title: "Planning Tools",
//     type: "feature",
//     mockupTitle: "Outfit Preview + Planner",
//     features: [
//       "Outfit Preview Panel",
//       "Drag-and-drop reordering",
//       "Favorites & saved looks",
//       "Share & print outfit",
//       "7-day Outfit Planner",
//       "Travel Pack Panel",
//       "AI Packing Assistant",
//       "Export / import plans",
//     ],
//     featureIcons: ["👁️", "↕️", "⭐", "🔗", "📅", "✈️", "🧳", "📤"],
//   },
//   {
//     id: "ai",
//     label: "AI Features",
//     dur: 10,
//     icon: "✨",
//     title: "Five AI Features",
//     type: "feature",
//     mockupTitle: "✨ AI Features",
//     features: [
//       "AI Outfit Stylist chat",
//       "AI Packing Assistant",
//       "Smart Donation Advisor",
//       "AI Try-On Style Feedback",
//       "Natural Language Search",
//       "Shopping: Suggest items",
//       "Shopping: Budget analysis",
//       "Shopping: Prioritize list",
//     ],
//     featureIcons: ["💬", "🧳", "🗑️", "🎬", "🔍", "💡", "💰", "🎯"],
//   },
//   {
//     id: "tryon",
//     label: "Try-On Studio",
//     dur: 9,
//     icon: "🎬",
//     title: "Media & Studio",
//     type: "feature",
//     mockupTitle: "🎬 Try-On Studio",
//     features: [
//       "Live camera recording",
//       "Front / rear camera toggle",
//       "Upload & cloud storage",
//       "AI Style Feedback (4 sections)",
//       "Video Bin with grid / list",
//       "Timestamps & custom titles",
//       "Download & share videos",
//     ],
//     featureIcons: ["📸", "🔄", "☁️", "✨", "🎥", "🕐", "⬇️"],
//   },
//   {
//     id: "kids",
//     label: "Kids & Receipts",
//     dur: 9,
//     icon: "👶",
//     title: "Kids & Receipts",
//     type: "feature",
//     mockupTitle: "Kids' Closet · Receipts",
//     features: [
//       "Baby, Toddler, Kids, Teen profiles",
//       "US & EU sizing side-by-side",
//       "Per-child closet sections",
//       "14-day soft delete & restore",
//       "Share size cards via link",
//       "Receipts: Photo, PDF, Email",
//       "Filter by store / category",
//     ],
//     featureIcons: ["👶", "📏", "👗", "♻️", "📤", "📷", "🔍"],
//   },
//   {
//     id: "shopping",
//     label: "Shopping List",
//     dur: 9,
//     icon: "🛒",
//     title: "Shopping & Wish List",
//     type: "feature",
//     mockupTitle: "🛒 Shopping List",
//     features: [
//       "3 default categories",
//       "Unlimited custom categories",
//       "300+ emoji across 10 groups",
//       "4 AI modes built-in",
//       "Share list via link",
//       "Download JSON / copy text",
//       "Wish List with URL previews",
//       "Import shared lists",
//     ],
//     featureIcons: ["🛒", "➕", "😀", "🤖", "🔗", "⬇️", "📋", "📥"],
//   },
//   {
//     id: "settings",
//     label: "Settings & More",
//     dur: 9,
//     icon: "⚙️",
//     title: "Settings & More",
//     type: "feature",
//     mockupTitle: "Settings · Weather · More",
//     features: [
//       "Edit profile & upload avatar",
//       "Password + strength meter",
//       "Page & card backgrounds",
//       "Weather — current + 7-day",
//       "Donate Bin + AI Advisor",
//       "About page",
//       "Built with React + Cloudinary",
//     ],
//     featureIcons: ["🖼️", "🔒", "🎨", "🌤️", "🗑️", "ℹ️", "🚀"],
//   },
// ];

// const SCRIPTS = [
//   "Welcome to WIMC — What's In My Closet! This is your AI-powered personal closet manager. Let me walk you through everything this app can do.",
//   "WIMC starts with secure authentication. Sign up or log in — all passwords are protected with SHA-256 hashing. Upload a profile photo and update your account anytime from Settings.",
//   "Your closet is organized into six smart categories. Upload photos and videos of your clothing items, stored securely in the cloud. Customize each section's background with photo presets or a full color palette.",
//   "The Outfit Preview Panel lets you build looks with drag-and-drop. Save favorites, share outfits, and plan your entire week with the Outfit Planner. The Travel Pack Panel helps you pack smarter with AI assistance.",
//   "WIMC has five AI features built in — an AI Stylist that answers any style question, Natural Language Search, a Smart Donation Advisor, AI Style Feedback after try-ons, and a full AI Shopping Assistant.",
//   "The Try-On Studio lets you record outfit videos using your front or rear camera. After recording, get personalized AI Style Feedback covering what works, style tips, and how to complete the look.",
//   "Kids' Closet lets you manage clothing profiles for each child, with US and EU sizing shown side by side. Deleted profiles stay recoverable for 14 days. The Receipts page stores all your shopping receipts by photo, PDF, or email.",
//   "The Shopping List has three built-in categories plus unlimited custom ones with over 300 emoji to choose from. Use four AI modes to suggest items, analyze your budget, or prioritize your list. Share lists via a link or download them.",
//   "Settings gives you full control over your profile, password, and the app's appearance. Check the weather right from the header to plan your outfits. That's WIMC — your complete AI closet companion!",
// ];

// const TOTAL_DUR = SLIDES.reduce((a, s) => a + s.dur, 0);

// // ── Avatar SVG ────────────────────────────────────────────────────────────────
// function Avatar({ talking }) {
//   return (
//     <svg
//       viewBox="0 0 80 80"
//       xmlns="http://www.w3.org/2000/svg"
//       className="tour-avatar-svg"
//     >
//       <ellipse cx="40" cy="70" rx="24" ry="13" fill="#1e3a5f" />
//       <rect x="34" y="48" width="12" height="9" rx="4" fill="#f5c2a0" />
//       <ellipse cx="40" cy="40" rx="18" ry="20" fill="#f5c2a0" />
//       <ellipse cx="40" cy="23" rx="18" ry="9" fill="#7c3aed" />
//       <rect x="22" y="23" width="5" height="15" rx="3" fill="#7c3aed" />
//       <rect x="53" y="23" width="5" height="15" rx="3" fill="#7c3aed" />
//       <ellipse cx="33" cy="39" rx="2.8" ry="3" fill="#1e293b" />
//       <ellipse cx="47" cy="39" rx="2.8" ry="3" fill="#1e293b" />
//       <ellipse cx="34" cy="38" rx="1" ry="1" fill="#fff" />
//       <ellipse cx="48" cy="38" rx="1" ry="1" fill="#fff" />
//       <path
//         d={talking ? "M30 50 Q40 65 50 50" : "M30 50 Q40 57 50 50"}
//         stroke="#c2714f"
//         strokeWidth="1.8"
//         fill="none"
//         strokeLinecap="round"
//         style={{ transition: "d 0.12s steps(1)" }}
//       />
//       <path
//         d="M32 58 L40 64 L48 58"
//         stroke="#2d4a7a"
//         strokeWidth="1.8"
//         fill="none"
//         strokeLinecap="round"
//       />
//       <ellipse cx="27" cy="45" rx="4" ry="2.5" fill="#f9a8d4" opacity="0.5" />
//       <ellipse cx="53" cy="45" rx="4" ry="2.5" fill="#f9a8d4" opacity="0.5" />
//     </svg>
//   );
// }

// // ── Slide content ─────────────────────────────────────────────────────────────
// function TitleSlide({ slide }) {
//   return (
//     <div className="tour-title-slide">
//       <div className="tour-title-logo">{slide.icon}</div>
//       <div className="tour-title-name">{slide.title}</div>
//       <div className="tour-title-sub">{slide.subtitle}</div>
//       <div className="tour-title-tags">
//         {slide.tags.map((t) => (
//           <span key={t} className="tour-tag">
//             {t}
//           </span>
//         ))}
//       </div>
//     </div>
//   );
// }

// function FeatureSlide({ slide }) {
//   return (
//     <div className="tour-feature-slide">
//       {/* Left: mockup */}
//       <div className="tour-mockup">
//         <div className="tour-mockup-bar">
//           <span className="tour-mockup-title">{slide.mockupTitle}</span>
//           <div className="tour-mockup-dots">
//             <span style={{ background: "#ef4444" }} />
//             <span style={{ background: "#f59e0b" }} />
//             <span style={{ background: "#22c55e" }} />
//           </div>
//         </div>
//         <div className="tour-mockup-body">
//           <MockupContent id={slide.id} />
//         </div>
//       </div>
//       {/* Right: feature list */}
//       <div className="tour-feat-panel">
//         <div className="tour-feat-title">
//           {slide.icon} {slide.title}
//         </div>
//         <ul className="tour-feat-list">
//           {slide.features.map((f, i) => (
//             <li key={f}>
//               <span className="tour-feat-icon">{slide.featureIcons[i]}</span>
//               {f}
//             </li>
//           ))}
//         </ul>
//       </div>
//     </div>
//   );
// }

// // Individual mockup bodies
// function MockupContent({ id }) {
//   switch (id) {
//     case "auth":
//       return (
//         <div className="mc-auth">
//           <div className="mc-auth-avatar">👤</div>
//           <div className="mc-auth-heading">Welcome Back</div>
//           <div className="mc-field">📧 Email address</div>
//           <div className="mc-field mc-field--active">🔒 ••••••••</div>
//           <div className="mc-btn">Log In to My Closet</div>
//           <div className="mc-secure">
//             🔒 SHA-256 encrypted · Secure session · Avatar sync
//           </div>
//         </div>
//       );
//     case "closet":
//       return (
//         <div>
//           <div className="mc-card-grid">
//             {[
//               ["👗", "#2d1b4e", "Dresses"],
//               ["👟", "#1a2e4a", "Shoes"],
//               ["👖", "#1a3a2a", "Pants"],
//               ["👚", "#2d2010", "Tops"],
//               ["👜", "#2a1a2e", "Bags"],
//               ["🧥", "#1a1a2e", "Jackets"],
//             ].map(([e, bg, l]) => (
//               <div className="mc-card" key={l}>
//                 <div className="mc-card-img" style={{ background: bg }}>
//                   {e}
//                 </div>
//                 <div className="mc-card-lbl">{l}</div>
//               </div>
//             ))}
//           </div>
//           <div className="mc-bg-row">
//             <span className="mc-bg-label">🎨 Custom Backgrounds</span>
//             <div className="mc-bg-swatches">
//               {["#7c3aed", "#0369a1", "#d97706", "#FFE4E1", "#B2C5B2"].map(
//                 (c) => (
//                   <div
//                     key={c}
//                     className="mc-swatch"
//                     style={{
//                       background: c,
//                       border: c === "#FFE4E1" ? "1px solid #555" : undefined,
//                     }}
//                   />
//                 ),
//               )}
//             </div>
//           </div>
//         </div>
//       );
//     case "planning":
//       return (
//         <div>
//           <div className="mc-panel" style={{ marginBottom: 7 }}>
//             <div className="mc-panel-title" style={{ color: "#7c3aed" }}>
//               Current Selection
//             </div>
//             <div className="mc-chips">
//               {["Blue Wrap Dress", "Nude Heels", "Gold Clutch"].map((c) => (
//                 <span key={c} className="mc-chip mc-chip--active">
//                   {c}
//                 </span>
//               ))}
//             </div>
//           </div>
//           <div className="mc-panel" style={{ marginBottom: 7 }}>
//             <div className="mc-panel-title" style={{ color: "#0369a1" }}>
//               📅 Weekly Planner
//             </div>
//             <div className="mc-week">
//               {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
//                 <div key={i} className="mc-day">
//                   <div
//                     className="mc-day-lbl"
//                     style={{
//                       color:
//                         i < 2 || i === 3 || i === 4 ? "#7c3aed" : "#334155",
//                     }}
//                   >
//                     {d}
//                   </div>
//                   <div
//                     className="mc-day-bar"
//                     style={{
//                       background:
//                         i < 2 || i === 3 || i === 4 ? "#2d1b4e" : "#1e293b",
//                     }}
//                   />
//                 </div>
//               ))}
//             </div>
//           </div>
//           <div className="mc-panel">
//             <div className="mc-panel-title" style={{ color: "#d97706" }}>
//               ✈️ Travel Pack
//             </div>
//             <div className="mc-chips">
//               <span className="mc-chip">Paris — 5 days</span>
//               <span className="mc-chip">12 items packed</span>
//             </div>
//           </div>
//         </div>
//       );
//     case "ai":
//       return (
//         <div>
//           <div className="mc-bubble mc-bubble--user">
//             What should I wear to a garden party?
//           </div>
//           <div className="mc-bubble mc-bubble--ai">
//             <div className="mc-bubble-label">✨ AI Stylist</div>
//             Your floral wrap dress with nude heels and a woven bag —
//             effortlessly chic for a summer garden party!
//           </div>
//           <div className="mc-ai-grid">
//             {[
//               ["🔍 Smart Search", "#7c3aed", '"casual summer" → Tops'],
//               ["🗑️ Donation AI", "#ef4444", "4-question advisor"],
//               ["🛒 Shopping AI", "#059669", "Suggest · Budget · Prioritize"],
//               ["🎬 Style Feedback", "#d97706", "Post try-on coaching"],
//             ].map(([t, c, s]) => (
//               <div key={t} className="mc-ai-card">
//                 <div
//                   style={{
//                     fontSize: 8,
//                     color: c,
//                     fontWeight: 700,
//                     marginBottom: 2,
//                   }}
//                 >
//                   {t}
//                 </div>
//                 <div style={{ fontSize: 7, color: "#64748b" }}>{s}</div>
//               </div>
//             ))}
//           </div>
//         </div>
//       );
//     case "tryon":
//       return (
//         <div>
//           <div className="mc-camera">
//             <div style={{ fontSize: 28 }}>📸</div>
//             <div className="mc-rec-badge">● REC 0:23</div>
//             <div className="mc-camera-hint">Front camera — tap to switch</div>
//           </div>
//           <div className="mc-cam-btns">
//             <div className="mc-cam-btn">⏹ Stop</div>
//             <div className="mc-cam-btn mc-cam-btn--primary">⬇️ Save</div>
//             <div className="mc-cam-btn">🔗 Share</div>
//           </div>
//           <div className="mc-ai-feedback">
//             <div
//               style={{
//                 fontSize: 8,
//                 color: "#a78bfa",
//                 fontWeight: 700,
//                 marginBottom: 4,
//               }}
//             >
//               ✨ AI Style Feedback
//             </div>
//             <div className="mc-chips">
//               {["Work", "Casual", "Date Night", "Weekend"].map((o) => (
//                 <span key={o} className="mc-chip">
//                   {o}
//                 </span>
//               ))}
//             </div>
//           </div>
//         </div>
//       );
//     case "kids":
//       return (
//         <div>
//           <div className="mc-kids-grid">
//             <div className="mc-kid-card">
//               <div style={{ fontSize: 16 }}>👧</div>
//               <div className="mc-kid-name">Emma, 7</div>
//               <div className="mc-kid-info">Kids · US 7 / EU 24</div>
//               <div className="mc-chips" style={{ marginTop: 4 }}>
//                 <span className="mc-chip mc-chip--small">Open Closet</span>
//                 <span className="mc-chip mc-chip--small">Share Sizes</span>
//               </div>
//             </div>
//             <div className="mc-kid-card">
//               <div style={{ fontSize: 16 }}>👦</div>
//               <div className="mc-kid-name">Liam, 3</div>
//               <div className="mc-kid-info">Toddler · US 3T / EU 98</div>
//               <div style={{ fontSize: 7, color: "#f59e0b", marginTop: 4 }}>
//                 ⏳ 11 days until deleted
//               </div>
//             </div>
//           </div>
//           <div className="mc-panel" style={{ marginTop: 7 }}>
//             <div className="mc-panel-title" style={{ color: "#059669" }}>
//               🧾 Receipts
//             </div>
//             <div className="mc-receipt-row">
//               {[
//                 ["📷", "Photo"],
//                 ["📄", "PDF"],
//                 ["📧", "Email"],
//               ].map(([e, l]) => (
//                 <div key={l} className="mc-receipt-card">
//                   <div style={{ fontSize: 14 }}>{e}</div>
//                   <div style={{ fontSize: 7, color: "#64748b" }}>{l}</div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </div>
//       );
//     case "shopping":
//       return (
//         <div>
//           <div className="mc-chips" style={{ marginBottom: 7 }}>
//             <span className="mc-chip mc-chip--active">👗 Clothing</span>
//             <span className="mc-chip">✈️ Travel</span>
//             <span className="mc-chip">🧸 Kids</span>
//             <span className="mc-chip mc-chip--dashed">+ Custom</span>
//           </div>
//           <div className="mc-sl-items">
//             <div className="mc-sl-item mc-sl-item--done">
//               <div className="mc-sl-check mc-sl-check--done">✓</div>
//               <span
//                 style={{ textDecoration: "line-through", color: "#64748b" }}
//               >
//                 Winter coat (AI suggested)
//               </span>
//             </div>
//             <div className="mc-sl-item">
//               <div className="mc-sl-check" />
//               <span>Ankle boots — Size 8</span>
//             </div>
//             <div className="mc-sl-item">
//               <div className="mc-sl-check" />
//               <span>Cashmere turtleneck</span>
//             </div>
//           </div>
//           <div className="mc-ai-modes">
//             <div
//               style={{
//                 fontSize: 7,
//                 color: "#a78bfa",
//                 fontWeight: 700,
//                 marginBottom: 4,
//               }}
//             >
//               ✨ AI Modes
//             </div>
//             <div className="mc-chips">
//               {["💡 Suggest", "💬 Chat", "💰 Budget", "🎯 Prioritize"].map(
//                 (m) => (
//                   <span key={m} className="mc-chip">
//                     {m}
//                   </span>
//                 ),
//               )}
//             </div>
//           </div>
//         </div>
//       );
//     case "settings":
//       return (
//         <div>
//           <div className="mc-settings-tabs">
//             {[
//               ["👤 Profile", true],
//               ["🔒 Password", false],
//               ["🎨 Appearance", false],
//             ].map(([l, a]) => (
//               <div
//                 key={l}
//                 className={`mc-settings-tab${a ? " mc-settings-tab--active" : ""}`}
//               >
//                 {l}
//               </div>
//             ))}
//           </div>
//           <div className="mc-panel" style={{ marginBottom: 6 }}>
//             <div className="mc-panel-title" style={{ color: "#0369a1" }}>
//               🌤️ Weather — Washington DC
//             </div>
//             <div className="mc-weather-row">
//               <div style={{ fontSize: 20 }}>⛅</div>
//               <div className="mc-weather-temp">72°F</div>
//               <div
//                 style={{ fontSize: 7, color: "#64748b", textAlign: "right" }}
//               >
//                 Partly cloudy
//                 <br />
//                 7-day forecast
//               </div>
//             </div>
//           </div>
//           <div className="mc-bottom-btns">
//             <div className="mc-bottom-btn" style={{ color: "#ef4444" }}>
//               🗑️ Donate Bin
//             </div>
//             <div className="mc-bottom-btn">ℹ️ About</div>
//             <div className="mc-bottom-btn mc-bottom-btn--primary">
//               WIMC™ Complete
//             </div>
//           </div>
//         </div>
//       );
//     default:
//       return null;
//   }
// }

// // ── Main component ────────────────────────────────────────────────────────────
// const LS_SEEN_KEY = "wimc_tour_seen";

// export default function WIMCTourVideo({ isOpen, onClose, autoPlay = true }) {
//   const [curSlide, setCurSlide] = useState(0);
//   const [elapsed, setElapsed] = useState(0);
//   const [playing, setPlaying] = useState(false);
//   const [caption, setCaption] = useState("");
//   const [talking, setTalking] = useState(false);
//   const [hasStarted, setHasStarted] = useState(false);

//   const rafRef = useRef(null);
//   const lastTsRef = useRef(null);
//   const typeRef = useRef(null);
//   const talkRef = useRef(null);
//   const elapsedRef = useRef(0);
//   const playingRef = useRef(false);

//   const fmt = (s) => {
//     const m = Math.floor(s / 60);
//     return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
//   };

//   const getSlideAt = (t) => {
//     let acc = 0;
//     for (let i = 0; i < SLIDES.length; i++) {
//       acc += SLIDES[i].dur;
//       if (t < acc) return i;
//     }
//     return SLIDES.length - 1;
//   };

//   const stopTalk = useCallback(() => {
//     clearTimeout(talkRef.current);
//     setTalking(false);
//   }, []);

//   const animateTalk = useCallback(() => {
//     setTalking((v) => !v);
//     talkRef.current = setTimeout(animateTalk, 150);
//   }, []);

//   const typeCaption = useCallback(
//     (text) => {
//       clearTimeout(typeRef.current);
//       setCaption("");
//       setTalking(true);
//       clearTimeout(talkRef.current);
//       animateTalk();
//       let i = 0;
//       const step = () => {
//         if (i <= text.length) {
//           setCaption(text.slice(0, i));
//           i++;
//           typeRef.current = setTimeout(step, 28);
//         } else {
//           stopTalk();
//         }
//       };
//       step();
//     },
//     [animateTalk, stopTalk],
//   );

//   const showSlide = useCallback(
//     (n) => {
//       setCurSlide(n);
//       typeCaption(SCRIPTS[n]);
//     },
//     [typeCaption],
//   );

//   const stopPlayback = useCallback(() => {
//     playingRef.current = false;
//     setPlaying(false);
//     lastTsRef.current = null;
//     cancelAnimationFrame(rafRef.current);
//     stopTalk();
//   }, [stopTalk]);

//   const tick = useCallback(
//     (ts) => {
//       if (!playingRef.current) return;
//       if (lastTsRef.current) {
//         elapsedRef.current = Math.min(
//           elapsedRef.current + (ts - lastTsRef.current) / 1000,
//           TOTAL_DUR,
//         );
//         setElapsed(elapsedRef.current);
//         const n = getSlideAt(elapsedRef.current);
//         setCurSlide((prev) => {
//           if (n !== prev) {
//             typeCaption(SCRIPTS[n]);
//             return n;
//           }
//           return prev;
//         });
//       }
//       lastTsRef.current = ts;
//       if (elapsedRef.current >= TOTAL_DUR) {
//         stopPlayback();
//         setElapsed(0);
//         elapsedRef.current = 0;
//         setCurSlide(0);
//         typeCaption(SCRIPTS[0]);
//         return;
//       }
//       rafRef.current = requestAnimationFrame(tick);
//     },
//     [typeCaption, stopPlayback],
//   );

//   const startPlayback = useCallback(() => {
//     playingRef.current = true;
//     setPlaying(true);
//     setHasStarted(true);
//     lastTsRef.current = null;
//     rafRef.current = requestAnimationFrame(tick);
//   }, [tick]);

//   const jumpTo = useCallback(
//     (idx) => {
//       stopPlayback();
//       let t = 0;
//       for (let i = 0; i < idx; i++) t += SLIDES[i].dur;
//       elapsedRef.current = t;
//       setElapsed(t);
//       showSlide(idx);
//     },
//     [stopPlayback, showSlide],
//   );

//   const handleTimelineClick = (e) => {
//     const rect = e.currentTarget.getBoundingClientRect();
//     const pct = (e.clientX - rect.left) / rect.width;
//     const t = pct * TOTAL_DUR;
//     elapsedRef.current = t;
//     setElapsed(t);
//     const n = getSlideAt(t);
//     showSlide(n);
//   };

//   // Auto-start when opened
//   useEffect(() => {
//     if (isOpen) {
//       elapsedRef.current = 0;
//       setElapsed(0);
//       setCurSlide(0);
//       typeCaption(SCRIPTS[0]);
//       if (autoPlay) setTimeout(() => startPlayback(), 600);
//     } else {
//       stopPlayback();
//       clearTimeout(typeRef.current);
//     }
//     return () => {
//       stopPlayback();
//       clearTimeout(typeRef.current);
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [isOpen]);

//   const handleClose = () => {
//     stopPlayback();
//     localStorage.setItem(LS_SEEN_KEY, "true");
//     onClose?.();
//   };

//   if (!isOpen) return null;

//   const pct = Math.min((elapsed / TOTAL_DUR) * 100, 100);
//   const slide = SLIDES[curSlide];

//   return (
//     <div
//       className="tour-overlay"
//       onClick={(e) => e.target === e.currentTarget && handleClose()}
//     >
//       <div className="tour-modal">
//         {/* ── Header ── */}
//         <div className="tour-header">
//           <div className="tour-header-left">
//             <span className="tour-header-logo">WIMC™</span>
//             <span className="tour-header-badge">Feature Tour</span>
//           </div>
//           <button
//             className="tour-close"
//             onClick={handleClose}
//             aria-label="Close tour"
//           >
//             ×
//           </button>
//         </div>

//         {/* ── Slide area ── */}
//         <div className="tour-stage">
//           {slide.type === "title" ? (
//             <TitleSlide slide={slide} />
//           ) : (
//             <FeatureSlide slide={slide} />
//           )}

//           {/* Avatar overlay */}
//           <div className="tour-avatar-overlay">
//             <div className="tour-avatar-wrap">
//               <Avatar talking={talking} />
//             </div>
//             <div className="tour-caption">
//               <div className="tour-caption-name">WIMC Guide</div>
//               <div className="tour-caption-text">
//                 {caption}
//                 <span className="tour-cursor" />
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* ── Timeline ── */}
//         <div
//           className="tour-timeline"
//           onClick={handleTimelineClick}
//           title="Click to seek"
//         >
//           <div className="tour-timeline-fill" style={{ width: `${pct}%` }} />
//           {/* Slide markers */}
//           {SLIDES.map((s, i) => {
//             let pos = 0;
//             for (let j = 0; j < i; j++) pos += SLIDES[j].dur;
//             return (
//               <div
//                 key={s.id}
//                 className="tour-marker"
//                 style={{ left: `${(pos / TOTAL_DUR) * 100}%` }}
//                 title={s.label}
//               />
//             );
//           })}
//         </div>

//         {/* ── Controls ── */}
//         <div className="tour-controls">
//           <button
//             className="tour-play-btn"
//             onClick={() => (playing ? stopPlayback() : startPlayback())}
//             aria-label={playing ? "Pause" : "Play"}
//           >
//             {playing ? "⏸" : "▶"}
//           </button>

//           <span className="tour-time">
//             {fmt(elapsed)} / {fmt(TOTAL_DUR)}
//           </span>

//           <div className="tour-dots">
//             {SLIDES.map((s, i) => (
//               <button
//                 key={s.id}
//                 className={`tour-dot ${i === curSlide ? "tour-dot--active" : i < curSlide ? "tour-dot--done" : ""}`}
//                 onClick={() => jumpTo(i)}
//                 title={s.label}
//                 aria-label={`Go to ${s.label}`}
//               />
//             ))}
//           </div>

//           <span className="tour-slide-name">{slide.label}</span>

//           <button className="tour-skip" onClick={handleClose}>
//             Skip Tour
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ── Hook: first-time auto-show ─────────────────────────────────────────────
// export function useWIMCTour() {
//   const [isOpen, setIsOpen] = useState(false);

//   const openTour = () => setIsOpen(true);
//   const closeTour = () => setIsOpen(false);

//   // Auto-show once for new users
//   const showIfNew = useCallback(() => {
//     if (!localStorage.getItem(LS_SEEN_KEY)) setIsOpen(true);
//   }, []);

//   return { isOpen, openTour, closeTour, showIfNew };
// }
