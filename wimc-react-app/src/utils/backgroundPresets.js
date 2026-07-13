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

export const BACKGROUND_PRESETS = [
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
