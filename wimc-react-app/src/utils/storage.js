const KEY = "wimc_local_outfits";

export function saveLocalOutfit(outfit) {
  const all = JSON.parse(localStorage.getItem(KEY) || "[]");
  all.push(outfit);
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function getLocalOutfits() {
  return JSON.parse(localStorage.getItem(KEY) || "[]");
}
