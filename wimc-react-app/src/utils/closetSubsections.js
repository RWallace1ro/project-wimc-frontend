/**
 * closetSubsections — fixed sub-sections for each closet section card.
 *
 * Generalizes the original Bags/Accessories pattern to every card. Rules:
 *  - The card NAME and its underlying Cloudinary TAG never change.
 *  - The FIRST sub-section reuses the card's existing tag, so all existing
 *    items appear there. Each additional sub-section gets its own new tag.
 *  - Per-closet scoping is preserved automatically: the prefix is whatever
 *    comes before the base slug, e.g.
 *      "dresses-skirts"           → skirts                    (female main)
 *      "male-tops"                → male-shirts / male-t-shirts(male main)
 *      "kid-abc-shoes-sneakers"   → kid-abc-sneakers          (kids)
 *      "pet-xyz-bags-accessories" → pet-xyz-accessories / …   (pets)
 */

// Base slug → sub-sections. `slug: null` means "use the card's own tag"
// (always the first entry, so existing items stay put).
const SUBSECTIONS = {
  "dresses-skirts": [
    { label: "👗 Dresses", plain: "Dresses", slug: null },
    { label: "🩳 Skirts",  plain: "Skirts",  slug: "skirts" },
  ],
  // Male first card
  "dress-shirts-suits": [
    { label: "👔 Dress Shirts", plain: "Dress Shirts", slug: null },
    { label: "🤵 Suits",        plain: "Suits",        slug: "suits" },
  ],
  "shoes-sneakers": [
    { label: "👞 Shoes",    plain: "Shoes",    slug: null },
    { label: "👟 Sneakers", plain: "Sneakers", slug: "sneakers" },
  ],
  "pants-jeans": [
    { label: "👖 Pants", plain: "Pants", slug: null },
    { label: "👖 Jeans", plain: "Jeans", slug: "jeans" },
  ],
  tops: [
    { label: "👚 Blouses",  plain: "Blouses",  slug: null },
    { label: "👔 Shirts",   plain: "Shirts",   slug: "shirts" },
    { label: "👕 T-Shirts", plain: "T-Shirts", slug: "t-shirts" },
  ],
  "bags-accessories": [
    { label: "👜 Bags",        plain: "Bags",        slug: null },
    { label: "💍 Accessories", plain: "Accessories", slug: "accessories" },
    { label: "🌸 Fragrance",   plain: "Fragrance",   slug: "fragrance" },
  ],
  "jackets-coats": [
    { label: "🧥 Jackets", plain: "Jackets", slug: null },
    { label: "🥼 Coats",   plain: "Coats",   slug: "coats" },
  ],
};

// Male "Tops" card uses different sub-sections than female.
const MALE_OVERRIDES = {
  tops: [
    { label: "👔 Casual Shirts", plain: "Casual Shirts", slug: null },
    { label: "👕 T-Shirts",      plain: "T-Shirts",      slug: "t-shirts" },
  ],
};

// Split a full section tag into its base slug + per-closet prefix.
function splitSectionTag(sectionTag = "") {
  for (const base of Object.keys(SUBSECTIONS)) {
    if (sectionTag === base) return { base, prefix: "" };
    if (sectionTag.endsWith(`-${base}`)) {
      return { base, prefix: sectionTag.slice(0, sectionTag.length - base.length) };
    }
  }
  return null;
}

/**
 * Sub-sections for a section tag, or null if the section has none defined.
 * Returns [{ label, plain, tag }] with the first entry mapped to the card's
 * own tag.
 */
export function getSubSections(sectionTag) {
  const split = splitSectionTag(sectionTag);
  if (!split) return null;
  const { base, prefix } = split;
  const defs = (prefix === "male-" && MALE_OVERRIDES[base]) || SUBSECTIONS[base];
  if (!defs) return null;
  return defs.map((d) => ({
    label: d.label,
    plain: d.plain,
    tag: d.slug ? `${prefix}${d.slug}` : sectionTag,
  }));
}

/**
 * All Cloudinary tags that belong to a section (main + sub-sections), deduped.
 * Use this anywhere that needs full coverage of a card's items (search, AI
 * fetches) so items sorted into sub-sections aren't missed.
 */
export function sectionTagsWithSubs(sectionTag) {
  const subs = getSubSections(sectionTag);
  if (!subs) return [sectionTag];
  const tags = subs.map((s) => s.tag);
  return tags.includes(sectionTag) ? tags : [sectionTag, ...tags];
}
