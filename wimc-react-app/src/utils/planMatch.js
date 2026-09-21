// Works out WHICH plan card (monthly vs annual) is the customer's current one.
//
// A user's `tier` says only "pro" or "pro_ai" — but each tier has a monthly AND
// an annual card, so comparing tiers alone marked BOTH as "Current Plan" (found
// on a real purchase 2026-09-21). The exact plan is recorded per billing source:
//   • App Store:  users/{uid}.appleProductId  (the exact product bought)
//   • Website:    users/{uid}.stripePriceId   (the exact Stripe price)
// If the exact plan can't be determined, NO card is marked current — better
// than wrongly marking two of them.

// Apple product id → the web pricing-card id, and the reverse identity.
export const APPLE_PRODUCT_TO_PLAN = {
  "com.gingerfaith.wimc.pro.monthly": "pro-monthly",
  "com.gingerfaith.wimc.pro.annual": "pro-annual",
  "com.gingerfaith.wimc.proai.monthly": "pro-ai-monthly",
  "com.gingerfaith.wimc.proai.annual": "pro-ai-annual",
};

const APPLE_PRODUCT = {
  pro: { monthly: "com.gingerfaith.wimc.pro.monthly", annual: "com.gingerfaith.wimc.pro.annual" },
  pro_ai: { monthly: "com.gingerfaith.wimc.proai.monthly", annual: "com.gingerfaith.wimc.proai.annual" },
};

// Every Stripe price we've ever sold, by billing interval — the current
// prices (from env) plus the grandfathered and legacy ones, because existing
// subscribers stay on their original price for life.
const env = (typeof process !== "undefined" && process.env) || {};
const STRIPE_MONTHLY = new Set([
  env.REACT_APP_PRICE_PRO_MONTHLY, env.REACT_APP_PRICE_PROAI_MONTHLY,
  "price_1U19OrFHY9B8ibv9KlJbydxd", "price_1U19TtFHY9B8ibv9a7FOiD3y", // $4.99 / $7.99 (grandfathered)
  "price_1Tb61FFHY9B8ibv9qQuXRN3v", "price_1Tb646FHY9B8ibv9eU0jyW6N", // legacy
].filter(Boolean));
const STRIPE_ANNUAL = new Set([
  env.REACT_APP_PRICE_PRO_ANNUAL, env.REACT_APP_PRICE_PROAI_ANNUAL,
  "price_1U19RCFHY9B8ibv9LvXxDSnQ", "price_1U19UnFHY9B8ibv9pQbLRuUe", // $39.99 / $79.99 (grandfathered)
  "price_1Tb64ZFHY9B8ibv9pOIT5Uo2", "price_1Tb64sFHY9B8ibv9VIKt86tq", // legacy
].filter(Boolean));

/**
 * The Apple product identifier of the user's current plan, or null if unknown.
 * `appleProductId` wins when the plan is billed by Apple; otherwise a website
 * (Stripe) plan is matched by its price id.
 */
export function currentProductIdentifier({ tier, appleProductId, stripePriceId }) {
  if (tier !== "pro" && tier !== "pro_ai") return null; // free → nothing is "current"
  if (appleProductId) return appleProductId;
  if (STRIPE_ANNUAL.has(stripePriceId)) return APPLE_PRODUCT[tier].annual;
  if (STRIPE_MONTHLY.has(stripePriceId)) return APPLE_PRODUCT[tier].monthly;
  return null;
}

/** The web pricing-card id ("pro-monthly", …) of the current plan, or null. */
export function currentPlanCardId(info) {
  const id = currentProductIdentifier(info);
  return id ? APPLE_PRODUCT_TO_PLAN[id] || null : null;
}
