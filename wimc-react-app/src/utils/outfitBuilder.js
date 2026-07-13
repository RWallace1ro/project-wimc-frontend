/**
 * outfitBuilder — shared logic for turning an AI text response into a visual,
 * pick-able outfit board built from the user's own closet photos.
 *
 * Used by AI Stylist ("Build This Outfit") and AI Style Feedback ("Build
 * This Look" — the items it recommended to complete the outfit).
 */
import { aiProxyFetch } from "./aiProxy";

// Unisex closet: one fixed 8-section list, same for everyone.
export function getClosetSections() {
  return [
    { label: "Dresses/Skirts",     tag: "dresses-skirts" },
    { label: "Dress Shirts/Suits", tag: "dress-shirts-suits" },
    { label: "Shoes/Sneakers",     tag: "shoes-sneakers" },
    { label: "Pants/Jeans",        tag: "pants-jeans" },
    { label: "Tops",               tag: "tops" },
    { label: "Bags/Accessories",   tag: "bags-accessories" },
    { label: "Jackets/Coats",      tag: "jackets-coats" },
    { label: "Blazers",            tag: "blazers" },
  ];
}

// Keywords that map to each base tag
const SECTION_KEYWORDS = {
  "dresses-skirts":   ["dress", "dresses", "skirt", "skirts", "gown"],
  "dress-shirts-suits": ["suit", "suits", "dress shirt", "dress shirts", "tie", "ties"],
  "shoes-sneakers":   ["shoe", "shoes", "sneaker", "sneakers", "boot", "boots", "heel", "heels", "loafer", "loafers", "sandal", "sandals"],
  "pants-jeans":      ["pant", "pants", "jean", "jeans", "trouser", "trousers", "chino", "chinos", "legging", "leggings", "shorts"],
  "tops":             ["top", "tops", "shirt", "shirts", "blouse", "blouses", "t-shirt", "tee", "tees", "sweater", "sweaters", "tank", "polo"],
  "bags-accessories": ["bag", "bags", "handbag", "accessory", "accessories", "purse", "clutch", "belt", "belts", "scarf", "scarves", "hat", "hats"],
  "jackets-coats":    ["jacket", "jackets", "coat", "coats", "cardigan", "cardigans", "hoodie", "hoodies", "vest", "vests"],
  "blazers":          ["blazer", "blazers", "sport coat", "sport coats"],
};

// Find which closet sections are mentioned in an AI message.
// Strategy 1: parse [Section Name] brackets from ✨ outfit lines.
// Strategy 2: exact label match anywhere in the text.
// Strategy 3: broad keyword fallback for natural-language responses.
export function extractSections(text) {
  const sections = getClosetSections();

  const outfitLines = text.match(/✨[^\n]*/g) || [];
  if (outfitLines.length) {
    const mentioned = new Set();
    outfitLines.forEach((line) => {
      (line.match(/\[([^\]]+)\]/g) || []).forEach((m) =>
        mentioned.add(m.slice(1, -1).trim().toLowerCase())
      );
    });
    if (mentioned.size >= 2) {
      const bracketMatched = sections.filter((s) =>
        [...mentioned].some((name) => name === s.label.toLowerCase())
      );
      if (bracketMatched.length >= 2) return bracketMatched;
    }
  }

  const exactMatched = sections.filter((s) =>
    new RegExp(s.label.replace(/[/\\^$*+?.()|[\]{}]/g, "\\$&"), "i").test(text)
  );
  if (exactMatched.length >= 2) return exactMatched;

  const words = text.toLowerCase();
  return sections.filter((s) => {
    const keywords = SECTION_KEYWORDS[s.tag] || [];
    return keywords.some((kw) => {
      const re = new RegExp(`\\b${kw.replace(/[-]/g, "[-\\s]?")}s?\\b`);
      return re.test(words);
    });
  });
}

// Cloudinary transform: small thumbnails for AI vision (saves tokens)
const thumbUrl = (url) => url.replace("/upload/", "/upload/w_400,c_limit,q_auto/");

// Ask Claude (vision) to pick the best item from each section to match the
// outfit/feedback text. Returns { [tag]: index } or null on failure/no match.
export async function aiPickItems(outfitText, sections, imagesByTag, feature = "ai_stylist_outfit_pick") {
  const MAX_PER_SECTION = 8;
  const content = [];
  const included = []; // [{tag, label, count}] in order sent

  sections.forEach((s) => {
    const urls = (imagesByTag[s.tag] || []).slice(0, MAX_PER_SECTION);
    if (!urls.length) return;
    included.push({ tag: s.tag, label: s.label, count: urls.length });
    content.push({ type: "text", text: `Section "${s.label}" — ${urls.length} item${urls.length !== 1 ? "s" : ""}, numbered 1 to ${urls.length}:` });
    urls.forEach((url) => {
      content.push({ type: "image", source: { type: "url", url: thumbUrl(url) } });
    });
  });

  if (!included.length) return null;

  content.push({
    type: "text",
    text: `Outfit suggestion: "${outfitText}"

Look at the closet item photos above. For each section, pick the ONE item (by its number, 1-based, in the order shown) that best matches this outfit suggestion in style, color, and occasion.

Respond with ONLY a JSON object mapping section label to chosen item number, e.g. {"Tops": 2, "Pants/Jeans": 1}. No other text.`,
  });

  try {
    const res = await aiProxyFetch(
      { model: "claude-sonnet-4-5", max_tokens: 200, messages: [{ role: "user", content }] },
      { feature }
    );
    const data = await res.json();
    if (!res.ok) return null;
    const text = data.content?.[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const picks = JSON.parse(jsonMatch[0]);
    const indexes = {};
    included.forEach(({ tag, label, count }) => {
      const n = parseInt(picks[label], 10);
      if (n >= 1 && n <= count) indexes[tag] = n - 1;
    });
    return Object.keys(indexes).length ? indexes : null;
  } catch {
    return null;
  }
}
