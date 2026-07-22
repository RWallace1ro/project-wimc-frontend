import React from "react";
import "./ClosetInteriorBackdrop.css";

// The static "revealed background" layer, sitting BEHIND the item carousel
// and behind the animated swinging doors. Reuses the existing real closet
// photo (closet-door-reveal.jpg — already used elsewhere in the app) instead
// of a hand-drawn scene: real clothes, real shelving, real lighting, blurred
// just enough to read as "there's a closet back there" without competing with
// the sharp carousel items in front of it. Two translucent, slightly-ajar
// door panels sit on top of the photo for the "peeking through" effect.
//
// tint is an optional CSS color (e.g. a kid/pet palette accent) washed over
// the panels so the same base photo can still feel different per closet.
//
// fixed=true renders as a page-level backdrop (position:fixed, covers the
// viewport, sits behind scrolling content) — used when this is chosen as the
// closet/kids/pet PAGE background rather than the door-open reveal moment
// (which is already inside its own positioned door-container).
export default function ClosetInteriorBackdrop({ tint, fixed = false }) {
  const doorStyle = tint ? { "--wimc-backdrop-tint": tint } : undefined;
  return (
    <div
      className={`closet-interior-backdrop${fixed ? " closet-interior-backdrop--fixed" : ""}`}
      aria-hidden="true"
    >
      <div className="closet-interior-backdrop__photo" />
      <div className="closet-interior-backdrop__door closet-interior-backdrop__door--left" style={doorStyle} />
      <div className="closet-interior-backdrop__door closet-interior-backdrop__door--right" style={doorStyle} />
    </div>
  );
}
