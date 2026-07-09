/**
 * closetDupeCheck — "Do I already own this?" check for the Shopping List.
 *
 * Opt-in, single-AI-request pass: for each shopping list item, guess its
 * likely closet section(s) with the same free keyword matcher AI Stylist
 * uses (extractSections — no AI call), fetch those sections' photos, then
 * ask a single vision request whether any closet photo is essentially the
 * same item as a listed one. Kept in its own module (not sharing code with
 * ClosetSearch.js) so this feature can't destabilize the existing, working
 * closet search flow.
 */
import { aiProxyFetch } from "./aiProxy";
import { fetchImagesByTag } from "./CloudinaryAPI";
import { sectionTagsWithSubs } from "./closetSubsections";
import { extractSections } from "./outfitBuilder";

const MAX_LIST_ITEMS = 15;   // keep the prompt (and AI cost) bounded
const MAX_CLOSET_IMAGES = 24; // vision request practical limit

async function postProxy(body) {
  const res = await aiProxyFetch(body, { feature: "ai_shopping_closet_check" });
  const data = await res.json();
  if (!res.ok) {
    const msg =
      (typeof data?.error === "string" ? data.error : data?.error?.message) ||
      `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

/**
 * @param {Array<{id:string,name:string,detail?:string}>} items - unchecked shopping list items
 * @param {"male"|"female"} gender
 * @returns {Promise<{ matchesById: Record<string,string>, checkedCount: number, errored: boolean }>}
 *   matchesById: shopping-list item id -> matched closet photo URL
 */
export async function checkShoppingListAgainstCloset(items, gender = "female") {
  const candidates = items.filter((it) => it.name?.trim()).slice(0, MAX_LIST_ITEMS);
  if (!candidates.length) return { matchesById: {}, checkedCount: 0, errored: false };

  // 1) Keyword-guess each item's likely section(s) — free, no AI call.
  const sectionTagsByItem = candidates.map((it) => {
    const text = `${it.name} ${it.detail || ""}`;
    const sections = extractSections(text, gender);
    return sections.map((s) => s.tag);
  });
  const allTags = Array.from(new Set(sectionTagsByItem.flat()));
  if (!allTags.length) return { matchesById: {}, checkedCount: 0, errored: false };

  // 2) Fetch candidate closet photos for those sections (incl. sub-sections).
  const expandedTags = Array.from(new Set(allTags.flatMap((t) => sectionTagsWithSubs(t))));
  let closetUrls = [];
  try {
    const lists = await Promise.all(expandedTags.map((t) => fetchImagesByTag(t).catch(() => [])));
    closetUrls = Array.from(new Set(lists.flat())).slice(0, MAX_CLOSET_IMAGES);
  } catch {
    return { matchesById: {}, checkedCount: candidates.length, errored: true };
  }
  if (!closetUrls.length) return { matchesById: {}, checkedCount: candidates.length, errored: false };

  // 3) One vision request: does any closet photo look like the same item as
  //    a listed one?
  const listBlock = candidates
    .map((it, i) => `${i}: "${it.name}"${it.detail ? ` — ${it.detail}` : ""}`)
    .join("\n");

  const content = [
    {
      type: "text",
      text: `The user has these shopping list items they're considering buying:
${listBlock}

I will show you photos of items ALREADY IN their closet, each labeled "Closet Item N".

Your job: for each closet item, decide if it is essentially the SAME item as one of the numbered shopping list items above — same garment type AND same main color/style. Be strict: a similar-but-different-color item is NOT a match.

First, go through each closet item briefly, one line each, e.g.:
Closet Item 0: black leather ankle boots — matches list item 0
Closet Item 1: red sneakers — no match

Then, on its own line at the very end, give ONLY a JSON object:
{"matches": [{"listIndex": 0, "closetIndex": 0}]}
If nothing matches, end with exactly: {"matches": []}`,
    },
  ];
  closetUrls.forEach((url, i) => {
    const visionUrl = url?.replace("/upload/", "/upload/f_auto,q_auto,w_500,c_limit/") || url;
    content.push({ type: "text", text: `Closet Item ${i}:` });
    content.push({ type: "image", source: { type: "url", url: visionUrl } });
  });

  try {
    const data = await postProxy({
      model: "claude-sonnet-4-5",
      max_tokens: 900,
      messages: [{ role: "user", content }],
    });
    const text = data.content?.[0]?.text || "";
    const jsonMatch = text.match(/\{\s*"matches"\s*:\s*\[[^\]]*\]\s*\}/is);
    const matchesById = {};
    if (jsonMatch) {
      const { matches } = JSON.parse(jsonMatch[0]);
      if (Array.isArray(matches)) {
        for (const m of matches) {
          const item = candidates[m.listIndex];
          const url = closetUrls[m.closetIndex];
          if (item && url && !matchesById[item.id]) matchesById[item.id] = url;
        }
      }
    }
    return { matchesById, checkedCount: candidates.length, errored: false };
  } catch (e) {
    // Surface the real reason (e.g. the daily-limit message) instead of a
    // generic "couldn't complete" that hides why it actually failed.
    return { matchesById: {}, checkedCount: candidates.length, errored: true, errorMessage: e?.message };
  }
}
