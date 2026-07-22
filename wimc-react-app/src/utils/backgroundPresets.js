import closetInteriorImg from "../assets/images/closet-door-reveal.jpg";

// Closet-buildout-style backgrounds — real wall panel finishes + subtle,
// minor-detail wallpapers (not busy/loud prints that would distract from
// the clothing items shown on top of them). Shared by the closet page
// background picker (UserSettingsModal) and the per-section-card background
// picker (BackgroundPicker) so both offer the same photo set.
//
// Colored panels/wallpapers below are generated as inline SVG data URIs
// rather than stock photos — every stock photo search for "colored wall
// panel" turned up real rooms with furniture/pillows/lamps in frame, which
// is exactly what these backgrounds need to avoid. Generating them
// guarantees a clean, decor-free, closet-appropriate texture in any color.

// Every consumer applies these with backgroundSize:"cover" (stretched to
// fill, never tiled), so each SVG is authored at roughly a real wall-photo
// aspect ratio (3:2) with enough repeats to still read as a fine texture
// once stretched across a large card or page background.
function slatPanelSVG(base, groove) {
  const W = 900, H = 600, PITCH = 30;
  const count = Math.floor(W / PITCH);
  const grooves = Array.from({ length: count }, (_, i) => `<rect x="${i * PITCH + PITCH - 3}" y="0" width="3" height="${H}"/>`).join("");
  const highlights = Array.from({ length: count }, (_, i) => `<rect x="${i * PITCH}" y="0" width="${PITCH * 0.4}" height="${H}"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="${base}"/>
    <g fill="${groove}" opacity="0.5">${grooves}</g>
    <g fill="#ffffff" opacity="0.07">${highlights}</g>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function dotWallpaperSVG(base, dot) {
  const W = 900, H = 600, PITCH = 45;
  const cols = Math.ceil(W / PITCH) + 1;
  const rows = Math.ceil(H / PITCH) + 1;
  const dots = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const offset = r % 2 === 0 ? 0 : PITCH / 2;
      dots.push(`<circle cx="${c * PITCH + offset}" cy="${r * PITCH}" r="4" fill="${dot}" opacity="${r % 2 === 0 ? 1 : 0.5}"/>`);
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="${base}"/>
    ${dots.join("")}
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function stripeWallpaperSVG(base, stripe) {
  const W = 900, H = 600, PITCH = 36;
  const count = Math.floor(W / PITCH);
  const stripes = Array.from({ length: count }, (_, i) => `<rect x="${i * PITCH}" y="0" width="7" height="${H}" fill="${stripe}" opacity="0.32"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="${base}"/>
    ${stripes}
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// Multi-color pastel stripes — playful, kid-friendly variant of stripeWallpaperSVG.
function rainbowStripeWallpaperSVG(base, colors) {
  const W = 900, H = 600, PITCH = 40;
  const count = Math.floor(W / PITCH);
  const stripes = Array.from({ length: count }, (_, i) =>
    `<rect x="${i * PITCH}" y="0" width="10" height="${H}" fill="${colors[i % colors.length]}" opacity="0.4"/>`
  ).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="${base}"/>
    ${stripes}
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// Small 4-point stars scattered on a plain field — playful, minor-detail
// wallpaper aimed at kids' closets.
function starWallpaperSVG(base, star) {
  const W = 900, H = 600, PITCH = 60;
  const cols = Math.ceil(W / PITCH) + 1;
  const rows = Math.ceil(H / PITCH) + 1;
  const starPath = (cx, cy, s) =>
    `M${cx} ${cy - s} L${cx + s * 0.28} ${cy - s * 0.28} L${cx + s} ${cy} L${cx + s * 0.28} ${cy + s * 0.28} L${cx} ${cy + s} L${cx - s * 0.28} ${cy + s * 0.28} L${cx - s} ${cy} L${cx - s * 0.28} ${cy - s * 0.28} Z`;
  const stars = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const offset = r % 2 === 0 ? 0 : PITCH / 2;
      stars.push(`<path d="${starPath(c * PITCH + offset, r * PITCH, 6)}" fill="${star}" opacity="${r % 2 === 0 ? 0.8 : 0.45}"/>`);
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="${base}"/>
    ${stars.join("")}
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const BACKGROUND_PRESETS = [
  // ── Real closet interior (same photo used behind the door-open reveal
  //    animation — real clothes, shelving, and lighting) ──
  {
    id: "closet-interior-photo",
    label: "Closet Interior",
    url: closetInteriorImg,
  },

  // ── Wood-tone wall panels (real photos, verified decor-free) ──
  {
    id: "pine-slat-panels",
    label: "Natural Pine Wall Panels",
    url: "https://images.unsplash.com/photo-1722109997425-40f920848aed?w=1200&q=80",
  },
  {
    id: "golden-ribbed-panels",
    label: "Golden Ribbed Panels",
    url: "https://images.unsplash.com/photo-1517196084897-498e0abd7c2d?w=1200&q=80",
  },

  // ── Colored wall panels (generated — guaranteed clean, no furniture/decor) ──
  {
    id: "sage-panels",
    label: "Sage Green Wall Panels",
    url: slatPanelSVG("#9CAF88", "#7C9067"),
  },
  {
    id: "dusty-blue-panels",
    label: "Dusty Blue Wall Panels",
    url: slatPanelSVG("#8FA8C4", "#6E88A6"),
  },
  {
    id: "blush-panels",
    label: "Blush Pink Wall Panels",
    url: slatPanelSVG("#E3B7B0", "#C99089"),
  },
  {
    id: "terracotta-panels",
    label: "Terracotta Wall Panels",
    url: slatPanelSVG("#C1704F", "#A15738"),
  },
  {
    id: "charcoal-panels",
    label: "Charcoal Wall Panels",
    url: slatPanelSVG("#4A4E55", "#33363B"),
  },
  {
    id: "taupe-panels",
    label: "Warm Taupe Wall Panels",
    url: slatPanelSVG("#B8A99A", "#98897A"),
  },

  // ── Wallpapers with minor, non-distracting detail ──
  {
    id: "sage-leaf-wallpaper",
    label: "Sage Leaf Wallpaper",
    url: "https://images.unsplash.com/photo-1690269529398-cdfc35b5dd6d?w=1200&q=80",
  },
  {
    id: "ivory-wave-wallpaper",
    label: "Ivory Wave Wallpaper",
    url: "https://images.unsplash.com/photo-1714636608872-048fc9231892?w=1200&q=80",
  },
  {
    id: "warm-linen-wallpaper",
    label: "Warm Linen Wallpaper",
    url: "https://images.unsplash.com/photo-1686806372785-fcfe9efa9b70?w=1200&q=80",
  },
  {
    id: "soft-dot-wallpaper",
    label: "Soft Dot Wallpaper",
    url: dotWallpaperSVG("#F5F1EA", "#C9BFAF"),
  },
  {
    id: "pinstripe-wallpaper",
    label: "Powder Blue Pinstripe Wallpaper",
    url: stripeWallpaperSVG("#EFF4F8", "#8FA8C4"),
  },
];

// Same closet-wall photos/panels as the main list, plus extra bright,
// playful colors and patterns for Kids Closet backgrounds.
export const KID_BACKGROUND_PRESETS = [
  ...BACKGROUND_PRESETS,
  {
    id: "sunny-yellow-panels",
    label: "Sunny Yellow Wall Panels",
    url: slatPanelSVG("#F4C84C", "#D9A934"),
  },
  {
    id: "coral-panels",
    label: "Coral Wall Panels",
    url: slatPanelSVG("#F08A6C", "#D46B4C"),
  },
  {
    id: "mint-panels",
    label: "Bright Mint Wall Panels",
    url: slatPanelSVG("#7FD8BE", "#5CB89E"),
  },
  {
    id: "lavender-panels",
    label: "Lavender Wall Panels",
    url: slatPanelSVG("#B8A9E3", "#9683C9"),
  },
  {
    id: "star-wallpaper",
    label: "Starry Wallpaper",
    url: starWallpaperSVG("#EAF2FB", "#6E88A6"),
  },
  {
    id: "rainbow-stripe-wallpaper",
    label: "Rainbow Stripe Wallpaper",
    url: rainbowStripeWallpaperSVG("#FFFDF7", ["#F4C84C", "#F08A6C", "#7FD8BE", "#8FA8C4", "#B8A9E3"]),
  },
];
