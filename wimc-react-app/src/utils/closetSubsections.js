/**
 * closetSubsections — fixed sub-sections for each closet section card.
 *
 * Unisex: one ADULT profile, one KID profile (no more male/female split —
 * the closet's gender toggle was removed). "kind" (adult/kid/pet) is still
 * derived from the tag prefix (kid-{id}-/pet-{id}-/main).
 *
 * "Dresses/Skirts" and "Dress Shirts/Suits" are both now permanent,
 * always-visible cards for everyone (previously one replaced the other based
 * on gender) — everything else stays 6 shared cards, so the closet has 7
 * cards total.
 *
 * Rules (unchanged from the original Bags/Accessories pattern):
 *  - Card NAMES and underlying Cloudinary TAGS never change.
 *  - The FIRST sub-section (`slug: null`) reuses the card's own tag, so existing
 *    items appear there; each additional sub-section gets its own new tag.
 *  - Per-closet scoping is preserved via the tag prefix (kid-{id}-/pet-{id}-/…).
 */

// slug: null → use the card's own (main) tag.
const ADULT = {
  "dresses-skirts": [
    { label: "👗 Dresses", plain: "Dresses", slug: null },
    { label: "🩳 Skirts",  plain: "Skirts",  slug: "skirts" },
  ],
  "dress-shirts-suits": [
    { label: "👔 Dress Shirts", plain: "Dress Shirts", slug: null },
    { label: "🤵 Suits",        plain: "Suits",        slug: "suits" },
  ],
  "shoes-sneakers": [
    { label: "👞 Shoes",          plain: "Shoes",          slug: null },
    { label: "👟 Sneakers",       plain: "Sneakers",       slug: "sneakers" },
    { label: "👠 Heels",          plain: "Heels",          slug: "heels" },
    { label: "🩴 Sandals/Slides", plain: "Sandals/Slides", slug: "sandals-slides" },
  ],
  "pants-jeans": [
    { label: "👖 Pants", plain: "Pants", slug: null },
    { label: "👖 Jeans", plain: "Jeans", slug: "jeans" },
  ],
  tops: [
    { label: "👔 Shirts/Blouses", plain: "Shirts/Blouses", slug: null },
    { label: "👕 T-Shirts",       plain: "T-Shirts",       slug: "t-shirts" },
    { label: "🧶 Sweaters",       plain: "Sweaters",       slug: "sweaters" },
  ],
  "bags-accessories": [
    { label: "👜 Bags",        plain: "Bags",        slug: null },
    { label: "🕶️ Accessories", plain: "Accessories", slug: "accessories" },
    { label: "🌸 Fragrance",   plain: "Fragrance",   slug: "fragrance" },
  ],
  "jackets-coats": [
    { label: "🧥 Jackets", plain: "Jackets", slug: null },
    { label: "🥼 Coats",   plain: "Coats",   slug: "coats" },
  ],
};

const KID = {
  "dresses-skirts": [
    { label: "👗 Dresses", plain: "Dresses", slug: null },
    { label: "🩳 Skirts",  plain: "Skirts",  slug: "skirts" },
  ],
  "dress-shirts-suits": [
    { label: "👕 Button-Ups",   plain: "Button-Ups",   slug: null },
    { label: "👔 Dress Shirts", plain: "Dress Shirts", slug: "dress-shirts" },
    { label: "🤵 Suits",        plain: "Suits",        slug: "suits" },
  ],
  "shoes-sneakers": [
    { label: "👞 Shoes",          plain: "Shoes",          slug: null },
    { label: "👟 Sneakers",       plain: "Sneakers",       slug: "sneakers" },
    { label: "🩴 Sandals/Slides", plain: "Sandals/Slides", slug: "sandals-slides" },
  ],
  "pants-jeans": [
    { label: "👖 Pants", plain: "Pants", slug: null },
    { label: "👖 Jeans", plain: "Jeans", slug: "jeans" },
  ],
  tops: [
    { label: "👔 Shirts",   plain: "Shirts",   slug: null },
    { label: "👕 T-Shirts", plain: "T-Shirts", slug: "t-shirts" },
    { label: "🧶 Sweaters", plain: "Sweaters", slug: "sweaters" },
  ],
  "bags-accessories": [
    { label: "👜 Bags",        plain: "Bags",        slug: null },
    { label: "🕶️ Accessories", plain: "Accessories", slug: "accessories" },
    { label: "🌸 Fragrance",   plain: "Fragrance",   slug: "fragrance" },
  ],
  "jackets-coats": [
    { label: "🧥 Jackets", plain: "Jackets", slug: null },
    { label: "🥼 Coats",   plain: "Coats",   slug: "coats" },
  ],
};

const PROFILES = [ADULT, KID];

// Base cards with no sub-sections of their own — still need to be recognized
// by splitSectionTag/kindOf (so donatePrefixForTag and account-deletion sweeps
// work for kid-{id}-blazers / pet-{id}-blazers tags), but deliberately absent
// from ADULT/KID above so getSubSectionDefs returns null and no redundant
// single-item sub-tab renders.
const EXTRA_BASE_SLUGS = ["blazers"];

const BASE_SLUGS = Array.from(
  new Set([...PROFILES.flatMap((p) => Object.keys(p)), ...EXTRA_BASE_SLUGS])
);

// Every sub-section slug across both profiles (excludes the null "main tag"
// entries). Single source of truth for anything that needs to enumerate every
// possible Cloudinary tag a closet card could use — e.g. account deletion.
export const ALL_SUBSECTION_SLUGS = Array.from(
  new Set(
    PROFILES.flatMap((p) => Object.values(p)).flatMap((defs) =>
      defs.map((d) => d.slug).filter(Boolean),
    ),
  ),
);

// Every base card slug (dresses-skirts, tops, …) — the plain section tags
// before any sub-section suffix.
export { BASE_SLUGS };

// Split a full section tag into its base slug + per-closet prefix.
function splitSectionTag(sectionTag = "") {
  for (const base of BASE_SLUGS) {
    if (sectionTag === base) return { base, prefix: "" };
    if (sectionTag.endsWith(`-${base}`)) {
      return { base, prefix: sectionTag.slice(0, sectionTag.length - base.length) };
    }
  }
  return null;
}

function kindOf(prefix) {
  if (prefix.startsWith("pet-")) return "pet";
  if (prefix.startsWith("kid-")) return "kid";
  return "adult";
}

// The per-closet key prefix (matching DonateBin's `tagPrefix` prop) that owns
// a given section tag — "kid-{id}", "pet-{id}", or "" for the main closet.
// Used to find the right localStorage donate-bin lists when a tag's closet
// needs to be inferred from an item's current section tag alone.
export function donatePrefixForTag(sectionTag) {
  const split = splitSectionTag(sectionTag || "");
  if (!split) return "";
  return split.prefix.replace(/-$/, "");
}

/**
 * Sub-section definitions for a base slug + context. Returns [{label, plain,
 * slug}] (slug null = the card's own tag), or null. `kind`: "adult" | "kid".
 * Accepts (and ignores) a legacy `gender` key for callers that still pass
 * one — the closet is unisex now, so it no longer affects which defs come
 * back.
 */
export function getSubSectionDefs(baseSlug, { kind = "adult" } = {}) {
  if (kind === "pet") return null;
  const profile = kind === "kid" ? KID : ADULT;
  return profile[baseSlug] || null;
}

/**
 * Sub-sections for a full section tag, or null. Returns [{label, plain, tag}]
 * with the first entry mapped to the card's own tag.
 */
export function getSubSections(sectionTag) {
  const split = splitSectionTag(sectionTag);
  if (!split) return null;
  const { base, prefix } = split;
  const kind = kindOf(prefix);
  const defs = getSubSectionDefs(base, { kind });
  if (!defs) return null;
  return defs.map((d) => ({
    label: d.label,
    plain: d.plain,
    tag: d.slug ? `${prefix}${d.slug}` : sectionTag,
  }));
}

/**
 * All Cloudinary tags that could belong to a section (main + every
 * sub-section tag), deduped. Used so fetch coverage always finds items sorted
 * into any sub-section.
 */
export function sectionTagsWithSubs(sectionTag) {
  const split = splitSectionTag(sectionTag);
  if (!split || kindOf(split.prefix) === "pet") return [sectionTag];
  const { base, prefix } = split;
  const slugs = new Set();
  for (const profile of PROFILES) {
    const defs = profile[base];
    if (defs) defs.forEach((d) => slugs.add(d.slug));
  }
  if (slugs.size === 0) return [sectionTag];
  const seen = new Set();
  const tags = [];
  for (const slug of slugs) {
    const t = slug ? `${prefix}${slug}` : sectionTag;
    if (!seen.has(t)) { seen.add(t); tags.push(t); }
  }
  return tags;
}
