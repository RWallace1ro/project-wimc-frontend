import { syncSetItem } from '../utils/syncStore';
import { logAppEvent } from '../utils/analytics';
import React, { useState, useEffect, useCallback } from "react";
import ClosetSectionCard from "../components/ClosetSectionCard/ClosetSectionCard";
import ClosetSectionModal from "../components/ClosetSectionModal/ClosetSectionModal";
import DonateBin from "../components/DonateBin/DonateBin";
import WishList from "../components/WishList/WishList";
import ShoppingList from "../components/ShoppingList/ShoppingList";
import AddClothingModal from "../components/AddClothingModal/AddClothingModal";
import { fetchImagesByTag, fetchVideosByTag } from "../utils/CloudinaryAPI";
import VideoBin from "../components/VideoBin/VideoBin";
import { ProGate, useTier } from "../context/TierContext";
import OutfitPreviewPanel from "../components/OutfitPreviewPanel/OutfitPreviewPanel";
import OutfitPlanner from "../components/OutfitPlanner/OutfitPlanner";
import TravelPackPanel from "../components/TravelPackPanel/TravelPackPanel";
import TryOnStudio from "../components/TryOnStudio/TryOnStudio";
import BackgroundPicker from "../components/BackgroundPicker/BackgroundPicker";
import ClosetSearch from "../components/ClosetSearch/ClosetSearch";
import { useBackground } from "../context/BackgroundContext";
import { getSubSections } from "../utils/closetSubsections";
import "./ClosetData.css";

import dressesSkirtsImg from "../assets/images/dresses-skirts.jpg";
import shoesSneakersImg from "../assets/images/shoes-sneakers.jpg";
import pantsJeansImg from "../assets/images/pants-jeans.jpg";
import topsImg from "../assets/images/tops.jpg";
import bagsAccessoriesImg from "../assets/images/bags-accessories.jpg";
import jacketsCoatsImg from "../assets/images/jackets-coats.jpg";

const CLOSET_GENDER_KEY = "wimc_closet_gender";

function getSectionTagToDisplayName(gender) {
  return {
    "dresses-skirts": "Dresses/Skirts",
    "dress-shirts-suits": "Dress Shirts/Suits",
    "shoes-sneakers": "Shoes/Sneakers",
    "pants-jeans": "Pants/Jeans",
    tops: "Tops",
    "bags-accessories": "Bags/Accessories",
    "jackets-coats": "Jackets/Coats",
  };
}

// Male sections use a "male-" tag prefix so male items never merge with the
// female closet (which keeps the original plain tags). `name` stays the base
// key for display-name lookup; `tag` is the gender-specific Cloudinary tag.
function getClosetSections(gender) {
  const p = gender === "male" ? "male-" : "";
  const firstSection =
    gender === "male"
      ? { name: "dress-shirts-suits", tag: "male-dress-shirts-suits", placeholderUrl: dressesSkirtsImg }
      : { name: "dresses-skirts", tag: "dresses-skirts", placeholderUrl: dressesSkirtsImg };
  return [
    firstSection,
    { name: "shoes-sneakers",   tag: `${p}shoes-sneakers`,   placeholderUrl: shoesSneakersImg },
    { name: "pants-jeans",      tag: `${p}pants-jeans`,      placeholderUrl: pantsJeansImg },
    { name: "tops",             tag: `${p}tops`,             placeholderUrl: topsImg },
    { name: "bags-accessories", tag: `${p}bags-accessories`, placeholderUrl: bagsAccessoriesImg },
    { name: "jackets-coats",    tag: `${p}jackets-coats`,    placeholderUrl: jacketsCoatsImg },
  ];
}

// Map a (possibly "male-"-prefixed) tag back to its display label
function tagToDisplayName(tag) {
  if (!tag) return "";
  const base = tag.replace(/^male-/, "");
  const names = getSectionTagToDisplayName();
  return names[base] || base;
}

const COLOR_PREFIX = "color:";

function getPageBgStyle(bgValue) {
  if (!bgValue) return {};
  if (bgValue.startsWith(COLOR_PREFIX)) {
    return {
      backgroundColor: bgValue.replace(COLOR_PREFIX, ""),
      backgroundImage: "none",
    };
  }
  return {
    backgroundImage: `url(${bgValue})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}

const PAGE_BG_KEY = "closet-page";

function ClosetData({
  selectedTab,
  isLoggedIn,
  userData,
  onUserUpdate,
  onRegisterOpenSection,
  onClearTab,
}) {
  const { backgrounds } = useBackground();

  const pageBg = backgrounds[PAGE_BG_KEY] || null; // eslint-disable-line no-unused-vars

  const [previewSelection, setPreviewSelection] = useState([]);
  const [closetItems, setClosetItems] = useState([]);
  const [sectionVideos, setSectionVideos] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [recentUpload, setRecentUpload] = useState(null); // {tag, url, mediaType, ts}
  const [addCategory, setAddCategory] = useState(null); // category for AddClothingModal
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTryOnOpen, setIsTryOnOpen] = useState(false);
  const [tryOnImageUrl, setTryOnImageUrl] = useState(null);
  const [tryOnSection, setTryOnSection] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  // Search → panel routing
  const [previewIncoming,  setPreviewIncoming]  = useState(null);
  const [plannerIncoming,  setPlannerIncoming]  = useState(null);
  const [packIncoming,     setPackIncoming]     = useState(null);
  const [donateIncoming,   setDonateIncoming]   = useState(null);

  const handleApplyItems = (items, target) => {
    const payload = { items, ts: Date.now() };
    if (target === "preview") setPreviewIncoming(payload);
    if (target === "planner") setPlannerIncoming(payload);
    if (target === "pack")    setPackIncoming(payload);
    if (target === "donate")  setDonateIncoming(payload);
  };

  const [isBgPickerOpen, setIsBgPickerOpen] = useState(false);
  const [bgPickerSection, setBgPickerSection] = useState(null);
  const [weekPlan, setWeekPlan] = useState({
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: [],
  });

  const [gender, setGender] = useState(
    () => localStorage.getItem(CLOSET_GENDER_KEY) || "female"
  );

  const { requirePro } = useTier();

  const handleGenderChange = (g) => {
    setGender(g);
    syncSetItem(CLOSET_GENDER_KEY, g);
    // Notify the header tabs so they switch to this gender's sections instantly
    try { window.dispatchEvent(new Event("wimc-gender-changed")); } catch {}
  };

  const closetSections = getClosetSections(gender);
  const sectionTagToDisplayName = getSectionTagToDisplayName(gender);
  // Gender-derived tag prefix for the side panels & search: male items live
  // under "male-*" tags; female keeps the original plain tags (data preserved).
  const genderPrefix = gender === "male" ? "male" : "";

  const fetchSectionItems = async (tag) => {
    setIsLoading(true);
    setError(null);
    try {
      const [imgs, vids] = await Promise.all([
        fetchImagesByTag(tag),
        fetchVideosByTag(tag),
      ]);
      setClosetItems(imgs || []);
      setSectionVideos(vids || []);
    } catch {
      setError("Failed to load closet items.");
    } finally {
      setIsLoading(false);
    }
  };

  const openSection = useCallback((tag) => {
    setSelectedSection(tag);
    setIsModalOpen(true);
    fetchSectionItems(tag);
  }, []);

  useEffect(() => {
    if (typeof onRegisterOpenSection === "function")
      onRegisterOpenSection(openSection);
  }, [onRegisterOpenSection, openSection]);

  // Purge items deleted elsewhere (Donate Bin's "Confirm removed from
  // closet") from this page's own closetItems — it's passed to Donate Bin
  // as its picker source, so a stale entry here could let a deleted photo
  // be re-added to a new donation set.
  useEffect(() => {
    const onRemoved = (e) => {
      const urls = e.detail?.urls;
      if (!Array.isArray(urls) || !urls.length) return;
      const removedSet = new Set(urls);
      setClosetItems((prev) => prev.filter((u) => !removedSet.has(u)));
    };
    window.addEventListener("wimc:closet-items-removed", onRemoved);
    return () => window.removeEventListener("wimc:closet-items-removed", onRemoved);
  }, []);

  useEffect(() => {
    if (isLoggedIn && selectedTab) {
      fetchSectionItems(selectedTab);
      setSelectedSection(selectedTab);
      setIsModalOpen(true);
    }
  }, [isLoggedIn, selectedTab]);

  // Add from inside an open section card: keep the card OPEN underneath so
  // the user sees the new item appear in the grid without reopening it.
  // selectedSection is left untouched (it may differ from the sub-section tag).
  const openAddForSection = (tag) => {
    setAddCategory(tag);
    setIsAddModalOpen(true);
  };
  const handleCardClick = (section) => {
    setSelectedSection(section);
    setIsModalOpen(true);
  };
  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedSection(null);
    onClearTab?.();
  };
  const resetModals = () => {
    setIsModalOpen(false);
    setIsAddModalOpen(false);
    setSelectedSection(null);
  };

  const handleAddClothing = (item) => {
    if (item?.mediaType === "video") {
      setSectionVideos((prev) => [...prev, item]);
    } else {
      const url = item?.mediaThumb || item?.mediaUrl || item?.imageUrl || item;
      if (url) setClosetItems((prev) => [...prev, url]);
    }
    // Tell the section modal about the new item so it appears immediately
    // (Cloudinary's tag-list CDN cache can lag for ~1 minute).
    {
      const url = item?.mediaUrl || item?.imageUrl || item?.mediaThumb;
      const tag = (item?.category || "").trim().toLowerCase();
      if (url && tag) {
        setRecentUpload({ tag, url, mediaType: item?.mediaType || "image", ts: Date.now() });
      }
    }
    logAppEvent("add_clothing_item", {
      media_type: item?.mediaType || "image",
      category: item?.category || "unknown",
    });
    setIsAddModalOpen(false);
    setAddCategory(null);
  };

  const handleTryOnFromCard = (section) => {
    if (!requirePro("Try-On Studio")) return; // Pro feature
    setTryOnImageUrl(closetItems.find((url) => url.includes(section)) || null);
    setTryOnSection(section);
    setIsTryOnOpen(true);
  };

  return (
    <main
      className="closet-data-page"
      style={getPageBgStyle(backgrounds[PAGE_BG_KEY])}
    >
      <header className="closet-data__header-actions">
        <div className="closet-data__gender-toggle">
          <button
            className={`closet-data__gender-btn${gender === "female" ? " is-active" : ""}`}
            onClick={() => handleGenderChange("female")}
          >
            ♀ Female
          </button>
          <button
            className={`closet-data__gender-btn${gender === "male" ? " is-active" : ""}`}
            onClick={() => handleGenderChange("male")}
          >
            ♂ Male
          </button>
        </div>
        <button
          className="add-clothing-button"
          onClick={() => setIsSearchOpen(true)}
        >
          🔍 Search My Closet
        </button>
        <button
          onClick={() => {
            resetModals();
            setIsAddModalOpen(true);
          }}
          className="add-clothing-button"
        >
          Add New Clothing Item
        </button>
      </header>

      {error && <p className="error-message">{error}</p>}
      {isLoading && <p className="loading-message">Loading...</p>}

      <section className="closet-data">
        <aside className="closet-data__side-left">
          <OutfitPreviewPanel onSelectionChange={setPreviewSelection} gender={gender} tagPrefix={genderPrefix} incomingItems={previewIncoming} />
          <aside className="closet-data__side-container">
            <ProGate feature="Outfit of the Day planner">
              <OutfitPlanner
                weekPlan={weekPlan}
                onChange={setWeekPlan}
                currentPreview={previewSelection}
                incomingItems={plannerIncoming}
                gender={gender}
                tagPrefix={genderPrefix}
                onSyncToTravelPack={(day, items) => setPackIncoming({ day, items })}
              />
            </ProGate>
            <ProGate feature="Travel Pack Planner">
              <TravelPackPanel
                currentPreview={previewSelection}
                incomingItems={packIncoming}
                gender={gender}
                tagPrefix={genderPrefix}
                onSyncToPlanner={(day, items) => {
                  setWeekPlan((prev) => {
                    const seen = new Set();
                    const uniq = [...(prev[day] || []), ...items].filter((it) => {
                      const key =
                        it.mediaUrl || it.imageUrl || JSON.stringify(it);
                      if (seen.has(key)) return false;
                      seen.add(key);
                      return true;
                    });
                    return { ...prev, [day]: uniq };
                  });
                }}
              />
            </ProGate>
          </aside>
          <ProGate feature="Donate Bin">
            <DonateBin clothingItems={closetItems} incomingItems={donateIncoming} gender={gender} tagPrefix={genderPrefix} />
          </ProGate>
        </aside>

        <div className="closet-data__cards-container">
          {closetSections.map((section) => {
            // Pinned card image takes priority; otherwise the card fetches its
            // own thumbnail by the gender-specific tag (so male/female stay
            // separate). Passing tag + undefined imageUrl triggers that fetch.
            const pinnedCardUrl = (() => {
              try { return localStorage.getItem(`wimc_card_image_${section.tag}`) || null; } catch { return null; }
            })();
            return (
              <ClosetSectionCard
                key={section.tag}
                sectionName={sectionTagToDisplayName[section.name]}
                tag={section.tag}
                imageUrl={pinnedCardUrl || undefined}
                placeholderUrl={section.placeholderUrl}
                onClick={() => handleCardClick(section.tag)}
                onAdd={() => {
                  resetModals();
                  setSelectedSection(section.tag);
                  setIsAddModalOpen(true);
                }}
                onTryOn={() => handleTryOnFromCard(section.tag)}
                onCustomizeBg={() => {
                  setBgPickerSection(section.tag);
                  setIsBgPickerOpen(true);
                }}
                sectionBackground={backgrounds[section.tag] || null}
              />
            );
          })}
        </div>

        <aside className="closet-data__side-right">
          <WishList userId="123" />
          <ShoppingList />
          <ProGate feature="Video Bin">
            <VideoBin videos={sectionVideos} />
          </ProGate>
        </aside>

        <ClosetSectionModal
          isOpen={isModalOpen}
          sectionName={tagToDisplayName(selectedSection)}
          tag={selectedSection}
          placeholderUrl={topsImg}
          onClose={handleModalClose}
          onAddItem={openAddForSection}
          recentUpload={recentUpload}
          onSwitchSection={(tag) => setSelectedSection(tag)}
          gender={gender}
          allSections={closetSections.map((s) => ({
            label: sectionTagToDisplayName[s.name] || s.tag,
            tag: s.tag,
          }))}
        />
        <AddClothingModal
          isOpen={isAddModalOpen}
          onClose={() => { setIsAddModalOpen(false); setAddCategory(null); }}
          onClothingAdded={handleAddClothing}
          initialCategory={addCategory || selectedSection}
          sections={closetSections.flatMap((s) => {
            const label =
              sectionTagToDisplayName[s.name] || sectionTagToDisplayName[s.tag] || s.tag;
            // Each card is split into sub-sections — expose each as its own
            // upload target so items land in the right collection. The first
            // sub-section keeps the card's own tag.
            const subs = getSubSections(s.tag, gender);
            if (subs) return subs.map((sub) => ({ value: sub.tag, label: sub.label }));
            return [{ value: s.tag, label }];
          })}
        />
      </section>

      <TryOnStudio
        isOpen={isTryOnOpen}
        onClose={() => setIsTryOnOpen(false)}
        initialImageUrl={tryOnImageUrl}
        initialSection={tryOnSection}
        gender={gender}
      />

      <BackgroundPicker
        isOpen={isBgPickerOpen}
        onClose={() => {
          setIsBgPickerOpen(false);
          setBgPickerSection(null);
        }}
        section={bgPickerSection}
      />

      <ClosetSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSectionSelect={(tag) => openSection(genderPrefix ? `${genderPrefix}-${tag}` : tag)}
        onApplyItems={handleApplyItems}
        gender={gender}
        tagPrefix={genderPrefix}
      />
    </main>
  );
}

export default ClosetData;

// import React, { useState, useEffect, useCallback } from "react";
// import ClosetSectionCard from "../components/ClosetSectionCard/ClosetSectionCard";
// import ClosetSectionModal from "../components/ClosetSectionModal/ClosetSectionModal";
// import DonateBin from "../components/DonateBin/DonateBin";
// import WishList from "../components/WishList/WishList";
// import AddClothingModal from "../components/AddClothingModal/AddClothingModal";
// import { fetchImagesByTag, fetchVideosByTag } from "../utils/CloudinaryAPI";
// import VideoBin from "../components/VideoBin/VideoBin";
// import OutfitPreviewPanel from "../components/OutfitPreviewPanel/OutfitPreviewPanel";
// import OutfitPlanner from "../components/OutfitPlanner/OutfitPlanner";
// import TravelPackPanel from "../components/TravelPackPanel/TravelPackPanel";
// import TryOnStudio from "../components/TryOnStudio/TryOnStudio";
// import BackgroundPicker from "../components/BackgroundPicker/BackgroundPicker";
// import ClosetSearch from "../components/ClosetSearch/ClosetSearch";
// import { useBackground } from "../context/BackgroundContext";
// import "./ClosetData.css";

// import dressesSkirtsImg from "../assets/images/dresses-skirts.jpg";
// import shoesSneakersImg from "../assets/images/shoes-sneakers.jpg";
// import pantsJeansImg from "../assets/images/pants-jeans.jpg";
// import topsImg from "../assets/images/tops.jpg";
// import bagsAccessoriesImg from "../assets/images/bags-accessories.jpg";
// import jacketsCoatsImg from "../assets/images/jackets-coats.jpg";

// const sectionTagToDisplayName = {
//   "dresses-skirts": "Dresses/Skirts",
//   "shoes-sneakers": "Shoes/Sneakers",
//   "pants-jeans": "Pants/Jeans",
//   tops: "Tops",
//   "bags-accessories": "Bags/Accessories",
//   "jackets-coats": "Jackets/Coats",
// };

// const closetSections = [
//   {
//     name: "dresses-skirts",
//     tag: "dresses-skirts",
//     placeholderUrl: dressesSkirtsImg,
//   },
//   {
//     name: "shoes-sneakers",
//     tag: "shoes-sneakers",
//     placeholderUrl: shoesSneakersImg,
//   },
//   { name: "pants-jeans", tag: "pants-jeans", placeholderUrl: pantsJeansImg },
//   { name: "tops", tag: "tops", placeholderUrl: topsImg },
//   {
//     name: "bags-accessories",
//     tag: "bags-accessories",
//     placeholderUrl: bagsAccessoriesImg,
//   },
//   {
//     name: "jackets-coats",
//     tag: "jackets-coats",
//     placeholderUrl: jacketsCoatsImg,
//   },
// ];

// const COLOR_PREFIX = "color:";

// function getPageBgStyle(bgValue) {
//   if (!bgValue) return {};
//   if (bgValue.startsWith(COLOR_PREFIX)) {
//     return {
//       backgroundColor: bgValue.replace(COLOR_PREFIX, ""),
//       backgroundImage: "none",
//     };
//   }
//   return {
//     backgroundImage: `url(${bgValue})`,
//     backgroundSize: "cover",
//     backgroundPosition: "center",
//   };
// }

// const PAGE_BG_KEY = "closet-page";

// function ClosetData({
//   selectedTab,
//   isLoggedIn,
//   userData,
//   onUserUpdate,
//   onRegisterOpenSection,
//   onClearTab,
// }) {
//   const { getBackground, backgrounds } = useBackground();

//   const pageBg = backgrounds[PAGE_BG_KEY] || null;

//   const [previewSelection, setPreviewSelection] = useState([]);
//   const [closetItems, setClosetItems] = useState([]);
//   const [sectionVideos, setSectionVideos] = useState([]);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [selectedSection, setSelectedSection] = useState(null);
//   const [isAddModalOpen, setIsAddModalOpen] = useState(false);
//   const [error, setError] = useState(null);
//   const [isLoading, setIsLoading] = useState(false);
//   const [isTryOnOpen, setIsTryOnOpen] = useState(false);
//   const [tryOnImageUrl, setTryOnImageUrl] = useState(null);
//   const [tryOnSection, setTryOnSection] = useState(null);
//   const [isSearchOpen, setIsSearchOpen] = useState(false);
//   const [isBgPickerOpen, setIsBgPickerOpen] = useState(false);
//   const [bgPickerSection, setBgPickerSection] = useState(null);
//   const [weekPlan, setWeekPlan] = useState({
//     Monday: [],
//     Tuesday: [],
//     Wednesday: [],
//     Thursday: [],
//     Friday: [],
//     Saturday: [],
//     Sunday: [],
//   });

//   const fetchSectionItems = async (tag) => {
//     setIsLoading(true);
//     setError(null);
//     try {
//       const [imgs, vids] = await Promise.all([
//         fetchImagesByTag(tag),
//         fetchVideosByTag(tag),
//       ]);
//       setClosetItems(imgs || []);
//       setSectionVideos(vids || []);
//     } catch {
//       setError("Failed to load closet items.");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const openSection = useCallback((tag) => {
//     setSelectedSection(tag);
//     setIsModalOpen(true);
//     fetchSectionItems(tag);
//   }, []);

//   useEffect(() => {
//     if (typeof onRegisterOpenSection === "function")
//       onRegisterOpenSection(openSection);
//   }, [onRegisterOpenSection, openSection]);

//   useEffect(() => {
//     if (isLoggedIn && selectedTab) fetchSectionItems(selectedTab);
//   }, [isLoggedIn, selectedTab]);

//   const openAddForSection = (tag) => {
//     setIsModalOpen(false);
//     setSelectedSection(tag);
//     setIsAddModalOpen(true);
//   };
//   const handleCardClick = (section) => {
//     setSelectedSection(section);
//     setIsModalOpen(true);
//   };
//   const handleModalClose = () => {
//     setIsModalOpen(false);
//     setSelectedSection(null);
//     onClearTab?.();
//   };
//   const resetModals = () => {
//     setIsModalOpen(false);
//     setIsAddModalOpen(false);
//     setSelectedSection(null);
//   };

//   const handleAddClothing = (item) => {
//     if (item?.mediaType === "video") {
//       setSectionVideos((prev) => [...prev, item]);
//     } else {
//       const url = item?.mediaThumb || item?.mediaUrl || item?.imageUrl || item;
//       if (url) setClosetItems((prev) => [...prev, url]);
//     }
//     setIsAddModalOpen(false);
//   };

//   const handleTryOnFromCard = (section) => {
//     setTryOnImageUrl(closetItems.find((url) => url.includes(section)) || null);
//     setTryOnSection(section);
//     setIsTryOnOpen(true);
//   };

//   return (
//     <main
//       className="closet-data-page"
//       style={getPageBgStyle(backgrounds[PAGE_BG_KEY])}
//     >
//       <header className="closet-data__header-actions">
//         <button
//           className="add-clothing-button"
//           onClick={() => setIsSearchOpen(true)}
//         >
//           🔍 Search My Closet
//         </button>
//         <button
//           onClick={() => {
//             resetModals();
//             setIsAddModalOpen(true);
//           }}
//           className="add-clothing-button"
//         >
//           Add New Clothing Item
//         </button>
//       </header>

//       {error && <p className="error-message">{error}</p>}
//       {isLoading && <p className="loading-message">Loading...</p>}

//       <section className="closet-data">
//         <aside className="closet-data__side-left">
//           <OutfitPreviewPanel onSelectionChange={setPreviewSelection} />
//           <aside className="closet-data__side-container">
//             <OutfitPlanner
//               weekPlan={weekPlan}
//               onChange={setWeekPlan}
//               currentPreview={previewSelection}
//             />
//             <TravelPackPanel
//               currentPreview={previewSelection}
//               onSyncToPlanner={(day, items) => {
//                 setWeekPlan((prev) => {
//                   const seen = new Set();
//                   const uniq = [...(prev[day] || []), ...items].filter((it) => {
//                     const key =
//                       it.mediaUrl || it.imageUrl || JSON.stringify(it);
//                     if (seen.has(key)) return false;
//                     seen.add(key);
//                     return true;
//                   });
//                   return { ...prev, [day]: uniq };
//                 });
//               }}
//             />
//           </aside>
//           <DonateBin clothingItems={closetItems} />
//         </aside>

//         <div className="closet-data__cards-container">
//           {closetSections.map((section) => {
//             const imageUrl =
//               closetItems.length > 0
//                 ? closetItems.find((item) => item.includes(section.tag)) ||
//                   section.placeholderUrl
//                 : section.placeholderUrl;
//             return (
//               <ClosetSectionCard
//                 key={section.name}
//                 sectionName={sectionTagToDisplayName[section.name]}
//                 imageUrl={imageUrl}
//                 placeholderUrl={section.placeholderUrl}
//                 onClick={() => handleCardClick(section.tag)}
//                 onAdd={() => {
//                   resetModals();
//                   setSelectedSection(section.tag);
//                   setIsAddModalOpen(true);
//                 }}
//                 onTryOn={() => handleTryOnFromCard(section.tag)}
//                 onCustomizeBg={() => {
//                   setBgPickerSection(section.tag);
//                   setIsBgPickerOpen(true);
//                 }}
//                 sectionBackground={backgrounds[section.tag] || null}
//               />
//             );
//           })}
//         </div>

//         <aside className="closet-data__side-right">
//           <WishList userId="123" />
//           <VideoBin videos={sectionVideos} />
//         </aside>

//         <ClosetSectionModal
//           isOpen={isModalOpen}
//           sectionName={selectedSection}
//           placeholderUrl={topsImg}
//           onClose={handleModalClose}
//           onAddItem={openAddForSection}
//         />
//         <AddClothingModal
//           isOpen={isAddModalOpen}
//           onClose={resetModals}
//           onClothingAdded={handleAddClothing}
//           initialCategory={selectedSection}
//         />
//       </section>

//       <TryOnStudio
//         isOpen={isTryOnOpen}
//         onClose={() => setIsTryOnOpen(false)}
//         initialImageUrl={tryOnImageUrl}
//         initialSection={tryOnSection}
//       />

//       <BackgroundPicker
//         isOpen={isBgPickerOpen}
//         onClose={() => {
//           setIsBgPickerOpen(false);
//           setBgPickerSection(null);
//         }}
//         section={bgPickerSection}
//       />

//       <ClosetSearch
//         isOpen={isSearchOpen}
//         onClose={() => setIsSearchOpen(false)}
//         onSectionSelect={(tag) => openSection(tag)}
//       />
//     </main>
//   );
// }

// export default ClosetData;
