import React, { useEffect, useState } from "react";
import { fetchImagesForSection } from "../../utils/CloudinaryAPI";
import "./ClosetDoorCarousel.css";

// A handful of representative sections — enough variety without firing off
// a fetch per every closet card just to build a decorative strip.
const SAMPLE_SECTIONS = ["tops", "dresses-skirts", "shoes-sneakers", "jackets-coats"];
const MAX_ITEMS = 16;

// e_improve auto-corrects brightness/contrast/color — included in the base
// Cloudinary plan (no paid add-on), unlike true AI background removal. Makes
// a dim/uneven phone photo read a lot closer to a clean product shot.
function toThumb(url) {
  return url?.replace("/upload/", "/upload/f_auto,q_auto,e_improve,w_240,c_limit/") || url;
}

// Drop-in v2 for the door-open animation: a scrolling strip of the user's
// OWN closet photos, revealed as the doors slide open, instead of always
// showing the same static stock photo. Falls back to rendering nothing
// (letting the static closet photo underneath show through) when the user
// has no items yet in the sampled sections — e.g. brand-new accounts.
export default function ClosetDoorCarousel({ tagPrefix = "" }) {
  const [images, setImages] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const lists = await Promise.all(
          SAMPLE_SECTIONS.map((s) => {
            const tag = tagPrefix ? `${tagPrefix}-${s}` : s;
            return fetchImagesForSection(tag).catch(() => []);
          }),
        );
        // Interleave across sections (rather than dumping one section's
        // worth first) so a quick glimpse always shows some variety.
        const interleaved = [];
        const max = Math.max(...lists.map((l) => l.length), 0);
        for (let i = 0; i < max; i++) {
          lists.forEach((l) => { if (l[i]) interleaved.push(l[i]); });
        }
        if (!cancelled) setImages(interleaved.slice(0, MAX_ITEMS));
      } catch {
        if (!cancelled) setImages([]);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [tagPrefix]);

  if (!images.length) return null;

  // Duplicate the list so the marquee loop has no visible seam.
  const loop = [...images, ...images];

  return (
    <div className="door-carousel" aria-hidden="true">
      <div className="door-carousel__track">
        {loop.map((url, i) => (
          <div className="door-carousel__item" key={i}>
            <img src={toThumb(url)} alt="" />
          </div>
        ))}
      </div>
    </div>
  );
}
