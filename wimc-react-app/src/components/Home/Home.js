import React, { useState, Suspense, lazy } from "react";
import { useNavigate } from "react-router-dom";
import { useWIMCTour } from "../WIMCTourVideo/useTour";
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

  const handleExploreClick = () => {
    setDoorsVisible(true);
    // Small delay so the browser paints the closed state before animating
    setTimeout(() => setDoorsOpen(true), 100);
    // Navigate slightly after the 4 s animation completes
    setTimeout(() => {
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
            is-open triggers the CSS keyframe animation from closed → open. */}
        <div className={`door-container${doorsVisible ? " is-visible" : ""}${doorsOpen ? " is-open" : ""}`}>
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
//             <p>Manage your wardrobe with ease!</p>
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
//             <p>Manage your wardrobe with ease!</p>
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
//           <p>Manage your wardrobe with ease!</p>
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
