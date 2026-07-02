/**
 * closetSubsections — fixed sub-sections for each closet section card.
 *
 * Four profiles: adult-female, adult-male, kids-female, kids-male. The kid's
 * gender is NOT in the storage tag, so callers pass `gender`; the kid-vs-adult
 * "kind" is derived from the tag prefix (kid-/pet-/main).
 *
 * Rules (unchanged from the original Bags/Accessories pattern):
 *  - Card NAMES and underlying Cloudinary TAGS never change.
 *  - The FIRST sub-section (`slug: null`) reuses the card's own tag, so existing
 *    items appear there; each additional sub-section gets its own new tag.
 *  - Per-closet scoping is preserved via the tag prefix (male-/kid-{id}-/…).
 */

// slug: null → use the card's own (main) tag.
const ADULT_FEMALE = {
  "dresses-skirts": [
    { label: "👗 Dresses", plain: "Dresses", slug: null },
    { label: "🩳 Skirts",  plain: "Skirts",  slug: "skirts" },
  ],
  "shoes-sneakers": [
    { label: "👟 Sneakers",       plain: "Sneakers",       slug: null },
    { label: "👠 Heels",          plain: "Heels",          slug: "heels" },
    { label: "🩴 Sandals/Slides", plain: "Sandals/Slides", slug: "sandals-slides" },
  ],
  "pants-jeans": [
    { label: "👖 Pants", plain: "Pants", slug: null },
    { label: "👖 Jeans", plain: "Jeans", slug: "jeans" },
  ],
  tops: [
    { label: "👚 Sweaters/Blouses", plain: "Sweaters/Blouses", slug: null },
    { label: "👔 Shirts",           plain: "Shirts",           slug: "shirts" },
    { label: "👕 T-Shirts",         plain: "T-Shirts",         slug: "t-shirts" },
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

const ADULT_MALE = {
  "dress-shirts-suits": [
    { label: "👔 Dress Shirts", plain: "Dress Shirts", slug: null },
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
    { label: "👔 Casual Shirts", plain: "Casual Shirts", slug: null },
    { label: "👕 T-Shirts",      plain: "T-Shirts",      slug: "t-shirts" },
    { label: "🧶 Sweaters",      plain: "Sweaters",      slug: "sweaters" },
  ],
  "bags-accessories": [
    { label: "👜 Bags",        plain: "Bags",        slug: null },
    { label: "⌚ Accessories", plain: "Accessories", slug: "accessories" },
    { label: "🧴 Fragrance",   plain: "Fragrance",   slug: "fragrance" },
  ],
  "jackets-coats": [
    { label: "🧥 Jackets", plain: "Jackets", slug: null },
    { label: "🥼 Coats",   plain: "Coats",   slug: "coats" },
  ],
};

const KID_FEMALE = {
  "dresses-skirts": [
    { label: "👗 Dresses", plain: "Dresses", slug: null },
    { label: "🩳 Skirts",  plain: "Skirts",  slug: "skirts" },
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
    { label: "🧶 Sweaters", plain: "Sweaters", slug: null },
    { label: "👔 Shirts",   plain: "Shirts",   slug: "shirts" },
    { label: "👕 T-Shirts", plain: "T-Shirts", slug: "t-shirts" },
  ],
  "bags-accessories": [
    { label: "👜 Bags",        plain: "Bags",        slug: null },
    { label: "📿 Accessories", plain: "Accessories", slug: "accessories" },
    { label: "🌸 Fragrance",   plain: "Fragrance",   slug: "fragrance" },
  ],
  "jackets-coats": [
    { label: "🧥 Jackets", plain: "Jackets", slug: null },
    { label: "🥼 Coats",   plain: "Coats",   slug: "coats" },
  ],
};

const KID_MALE = {
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
    { label: "⌚ Accessories", plain: "Accessories", slug: "accessories" },
    { label: "🧴 Fragrance",   plain: "Fragrance",   slug: "fragrance" },
  ],
  "jackets-coats": [
    { label: "🧥 Jackets", plain: "Jackets", slug: null },
    { label: "🥼 Coats",   plain: "Coats",   slug: "coats" },
  ],
};

const PROFILES = [ADULT_FEMALE, ADULT_MALE, KID_FEMALE, KID_MALE];
const BASE_SLUGS = Array.from(new Set(PROFILES.flatMap((p) => Object.keys(p))));

// Every sub-section slug across all 4 profiles (excludes the null "main tag"
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

/**
 * Sub-section definitions for a base slug + context. Returns [{label, plain,
 * slug}] (slug null = the card's own tag), or null. `kind`: "adult" | "kid".
 */
export function getSubSectionDefs(baseSlug, { gender = "female", kind = "adult" } = {}) {
  if (kind === "pet") return null;
  const profile = kind === "kid"
    ? (gender === "male" ? KID_MALE : KID_FEMALE)
    : (gender === "male" ? ADULT_MALE : ADULT_FEMALE);
  return profile[baseSlug] || null;
}

/**
 * Sub-sections for a full section tag, or null. Returns [{label, plain, tag}]
 * with the first entry mapped to the card's own tag. `gender` is required for
 * kids closets (their tag doesn't encode gender); for the main closet it
 * defaults from the tag's male- prefix.
 */
export function getSubSections(sectionTag, gender) {
  const split = splitSectionTag(sectionTag);
  if (!split) return null;
  const { base, prefix } = split;
  const kind = kindOf(prefix);
  const g = gender || (prefix === "male-" ? "male" : "female");
  const defs = getSubSectionDefs(base, { gender: g, kind });
  if (!defs) return null;
  return defs.map((d) => ({
    label: d.label,
    plain: d.plain,
    tag: d.slug ? `${prefix}${d.slug}` : sectionTag,
  }));
}

/**
 * All Cloudinary tags that could belong to a section (main + every gender's
 * sub-section tags), deduped. Gender-agnostic on purpose so fetch coverage
 * works without knowing the closet's gender.
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
