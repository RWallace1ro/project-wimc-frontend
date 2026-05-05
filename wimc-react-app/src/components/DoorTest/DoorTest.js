// import React, { useState, useRef } from "react";

// export default function DoorTest() {
//   const [armed, setArmed] = useState(false);
//   const [gone, setGone] = useState(false);
//   const [word, setWord] = useState(false);
//   const [show, setShow] = useState(false);
//   const timers = useRef([]);

//   const open = () => {
//     timers.current.forEach(clearTimeout);
//     setGone(false);
//     setArmed(false);
//     setWord(false);
//     setShow(true);

//     const t1 = setTimeout(() => {
//       setArmed(true);
//       setWord(true);
//     }, 50);
//     const t2 = setTimeout(() => {
//       setWord(false);
//     }, 1650);
//     const t3 = setTimeout(() => {
//       setGone(true);
//       setShow(false);
//     }, 3200);
//     timers.current = [t1, t2, t3];
//   };

//   return (
//     <div style={{ padding: 40 }}>
//       <h2>Door Animation Test</h2>
//       <button
//         onClick={open}
//         style={{ padding: "10px 20px", fontSize: 16, cursor: "pointer" }}
//       >
//         Open Doors
//       </button>

//       {show && !gone && (
//         <>
//           {/* Doors */}
//           <div
//             style={{
//               position: "fixed",
//               top: "50%",
//               left: "50%",
//               transform: "translate(-50%, -50%)",
//               width: 700,
//               height: 500,
//               display: "flex",
//               zIndex: 9999,
//               overflow: "hidden",
//               borderRadius: 12,
//               background: "linear-gradient(135deg, #1a1a2e, #16213e)",
//             }}
//           >
//             {/* Left door */}
//             <div
//               style={{
//                 width: "50%",
//                 height: "100%",
//                 background: "linear-gradient(135deg, #e74c3c, #c0392b)",
//                 transformOrigin: "left",
//                 transform: armed ? "translateX(-100%)" : "translateX(0)",
//                 transition: "transform 3000ms ease",
//                 willChange: "transform",
//               }}
//             />
//             {/* Right door */}
//             <div
//               style={{
//                 width: "50%",
//                 height: "100%",
//                 background: "linear-gradient(135deg, #c0392b, #e74c3c)",
//                 transformOrigin: "right",
//                 transform: armed ? "translateX(100%)" : "translateX(0)",
//                 transition: "transform 3000ms ease",
//                 willChange: "transform",
//               }}
//             />
//           </div>

//           {/* Word */}
//           <div
//             style={{
//               position: "fixed",
//               top: "50%",
//               left: "50%",
//               transform: "translate(-50%, -50%)",
//               fontSize: 52,
//               fontWeight: 800,
//               color: "#fff",
//               textShadow: "0 4px 24px rgba(0,0,0,0.8)",
//               opacity: word ? 1 : 0,
//               transition: "opacity 1400ms ease",
//               zIndex: 10000,
//               pointerEvents: "none",
//               whiteSpace: "nowrap",
//             }}
//           >
//             Donating
//           </div>
//         </>
//       )}
//     </div>
//   );
// }
