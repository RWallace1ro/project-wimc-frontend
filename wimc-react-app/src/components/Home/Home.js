import React, { useState, useRef, useEffect, Suspense, lazy } from "react";
import { useNavigate } from "react-router-dom";
import { useWIMCTour } from "../WIMCTourVideo/useTour";
import ClosetDoorCarousel from "../common/ClosetDoorCarousel";
import ClosetInteriorBackdrop from "../common/ClosetInteriorBackdrop";
import "./Home.css";

const WIMCTourVideo = lazy(() => import("../WIMCTourVideo/WIMCTourVideo"));

function Home() {
  // Two-step state: first make the container visible (doors CLOSED),
  // then 100 ms later add the animation class.
  // The delay guarantees the browser has painted the "doors closed" frame
  // before the CSS animation fires — prevents the snap-open glitch on refresh.
  const [doorsVisible, setDoorsVisible] = useState(false);
  const [doorsOpen, setDoorsOpen] = useState(false);
  const navigate = useNavigate();

  const { isOpen: isTourOpen, openTour, closeTour } = useWIMCTour();

  // These two timers were never cancelled — if the app got backgrounded/
  // suspended (tab minimized, PWA sent to background, device locked) after
  // a click but before the 4.5s finished, the pending navigate() timer kept
  // ticking in the suspended page. On resume, sometimes well after the
  // animation "should" have finished, it fires almost immediately — jumping
  // straight to /closet-data with no visible animation at all, completely
  // disconnected from whatever's currently on screen. Confirmed via screen
  // recording: reproduces specifically after the app sat closed for a
  // while (session persisted, no fresh login), never when logging back in
  // or navigating away and back — both of those remount this component
  // fresh, which happened to clear the stale timers as a side effect.
  // Tracking the IDs and clearing them on unmount (and before arming new
  // ones) fixes it at the source instead of relying on that side effect.
  const openTimerRef = useRef(null);
  const navTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      clearTimeout(openTimerRef.current);
      clearTimeout(navTimerRef.current);
    };
  }, []);

  const handleExploreClick = () => {
    clearTimeout(openTimerRef.current);
    clearTimeout(navTimerRef.current);
    setDoorsVisible(true);
    // Small delay so the browser paints the closed state before animating
    openTimerRef.current = setTimeout(() => setDoorsOpen(true), 100);
    // Navigate slightly after the 4 s animation completes
    navTimerRef.current = setTimeout(() => {
      navigate("/closet-data");
    }, 4500);
  };

  return (
    <>
      <main className="home">
        {/* Wrapper groups the white box + tour button so they center together */}
        <div className="home__group">
          <section className="home__content">
            <header className="home__header">
              <h1 className="home__title">
                Welcome to What's In My Closet (WIMC)
              </h1>
              <p className="home__description">
                Organize and manage your closet effortlessly. Add, view, and
                donate your clothing items.
              </p>
            </header>
            <div className="home__actions">
              <button onClick={handleExploreClick} className="home__link">
                Explore Your Closet
              </button>
            </div>
            <footer className="home__footer">
              <p>Manage your closet with ease!</p>
            </footer>
          </section>

          {/* Tour button sits directly below the white box, hidden when doors open */}
          {!doorsVisible && (
            <div className="home__tour-below">
              <button onClick={openTour} className="home__tour-btn">
                🎬 Watch App Tour
              </button>
            </div>
          )}
        </div>

        {/* door-container: is-visible shows the container (doors CLOSED);
            is-open triggers the CSS keyframe animation from closed → open.
            ClosetDoorCarousel fetches + renders ~18 real closet photos from
            Cloudinary on mount — if that work is still in flight right when
            doorsOpen flips (very likely if the user clicks Explore quickly
            after landing on Home, before the fetch has had time to finish),
            it can occupy the main thread for long enough that the 4s door
            animation never gets a chance to actually paint at all: the
            elapsed wall-clock animation time runs out silently while the
            thread is busy, so it visually "snaps" straight from closed doors
            to the closet-data page with no perceptible sliding. Deferring
            the carousel's mount until the animation has already started
            gives the slide a clear first stretch of main-thread time; the
            carousel then loads in behind it while the doors are still
            opening, which is a big enough window that the currently-visible
            portion of the reveal is never empty. */}
        <div className={`door-container${doorsVisible ? " is-visible" : ""}${doorsOpen ? " is-open" : ""}`}>
          <ClosetInteriorBackdrop />
          {doorsOpen && <ClosetDoorCarousel />}
          <div className="door-left"></div>
          <div className="door-right"></div>
        </div>
      </main>

      <Suspense fallback={null}>
        <WIMCTourVideo isOpen={isTourOpen} onClose={closeTour} autoPlay={true} />
      </Suspense>
    </>
  );
}

export default Home;

// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import WIMCTourVideo, { useWIMCTour } from "../WIMCTourVideo/WIMCTourVideo";
// import "./Home.css";

// function Home() {
//   const [doorsOpen, setDoorsOpen] = useState(false);
//   const navigate = useNavigate();

//   const { isOpen: isTourOpen, openTour, closeTour } = useWIMCTour();

//   const handleExploreClick = () => {
//     setDoorsOpen(true);
//     setTimeout(() => {
//       navigate("/closet-data");
//     }, 3000);
//   };

//   return (
//     <>
//       <main className="home">
//         <section className="home__content">
//           <header className="home__header">
//             <h1 className="home__title">
//               Welcome to What's In My Closet (WIMC)
//             </h1>
//             <p className="home__description">
//               Organize and manage your closet effortlessly. Add, view, and
//               donate your clothing items.
//             </p>
//           </header>
//           <div className="home__actions">
//             <button onClick={handleExploreClick} className="home__link">
//               Explore Your Closet
//             </button>
//             <button onClick={openTour} className="home__tour-btn">
//               🎬 Watch App Tour
//             </button>
//           </div>
//           <footer className="home__footer">
//             <p>Manage your closet with ease!</p>
//           </footer>
//         </section>
//         <div className={`door-container${doorsVisible ? " is-visible" : ""}${doorsOpen ? " is-open" : ""}`}>
//           <div className="door-left"></div>
//           <div className="door-right"></div>
//         </div>
//       </main>

//       <WIMCTourVideo isOpen={isTourOpen} onClose={closeTour} autoPlay={true} />
//     </>
//   );
// }

// export default Home;

// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import WIMCTourVideo, {
//   useWIMCTour,
// } from "../components/WIMCTourVideo/WIMCTourVideo";
// import "./Home.css";

// function Home() {
//   const [doorsOpen, setDoorsOpen] = useState(false);
//   const navigate = useNavigate();

//   const { isOpen: isTourOpen, openTour, closeTour } = useWIMCTour();

//   const handleExploreClick = () => {
//     setDoorsOpen(true);
//     setTimeout(() => {
//       navigate("/closet-data");
//     }, 3000);
//   };

//   return (
//     <>
//       <main className="home">
//         <section className="home__content">
//           <header className="home__header">
//             <h1 className="home__title">
//               Welcome to What's In My Closet (WIMC)
//             </h1>
//             <p className="home__description">
//               Organize and manage your closet effortlessly. Add, view, and
//               donate your clothing items.
//             </p>
//           </header>
//           <div className="home__actions">
//             <button onClick={handleExploreClick} className="home__link">
//               Explore Your Closet
//             </button>
//             <button onClick={openTour} className="home__tour-btn">
//               🎬 Watch App Tour
//             </button>
//           </div>
//           <footer className="home__footer">
//             <p>Manage your closet with ease!</p>
//           </footer>
//         </section>
//         <div className={`door-container${doorsVisible ? " is-visible" : ""}${doorsOpen ? " is-open" : ""}`}>
//           <div className="door-left"></div>
//           <div className="door-right"></div>
//         </div>
//       </main>

//       <WIMCTourVideo isOpen={isTourOpen} onClose={closeTour} autoPlay={true} />
//     </>
//   );
// }

// export default Home;

// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import "./Home.css";

// function Home() {
//   const [doorsOpen, setDoorsOpen] = useState(false);
//   const navigate = useNavigate();

//   const handleExploreClick = () => {
//     setDoorsOpen(true);
//     setTimeout(() => {
//       navigate("/closet-data");
//     }, 3000);
//   };

//   return (
//     <main className="home">
//       <section className="home__content">
//         <header className="home__header">
//           <h1 className="home__title">Welcome to What's In My Closet (WIMC)</h1>
//           <p className="home__description">
//             Organize and manage your closet effortlessly. Add, view, and donate
//             your clothing items.
//           </p>
//         </header>
//         <div className="home__actions">
//           <button onClick={handleExploreClick} className="home__link">
//             Explore Your Closet
//           </button>
//         </div>
//         <footer className="home__footer">
//           <p>Manage your closet with ease!</p>
//         </footer>
//       </section>
//       <div className={`door-container ${doorsOpen ? "active" : ""}`}>
//         <div className="door-left"></div>
//         <div className="door-right"></div>
//       </div>
//     </main>
//   );
// }

// export default Home;
