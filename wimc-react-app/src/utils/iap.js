// src/utils/iap.js
//
// Native (iOS) In-App Purchase via RevenueCat — the counterpart to
// src/utils/billing.js (Stripe, web-only). Apple Guideline 3.1.1 requires any
// subscription the app's accounts can unlock to be purchasable via real
// Apple IAP, so on native this is the ONLY purchase path; Stripe/billing.js
// stays web-only.
//
// RevenueCat's `app_user_id` is set to the signed-in Firebase uid (see
// configureIAP below) so its webhook (functions/index.js revenuecatWebhook)
// can write straight to users/{uid} with no separate customer-id lookup —
// mirrors how Stripe's checkout stamps firebaseUID onto the subscription.
//
// Product IDs (must match App Store Connect + RevenueCat dashboard exactly):
//   com.gingerfaith.wimc.pro.monthly
//   com.gingerfaith.wimc.pro.annual
//   com.gingerfaith.wimc.proai.monthly
//   com.gingerfaith.wimc.proai.annual
// Entitlement identifiers (RevenueCat dashboard, referenced by
// functions/index.js ENTITLEMENT_TO_TIER): "pro", "pro_ai"

import { Capacitor } from "@capacitor/core";
import { Purchases, LOG_LEVEL } from "@revenuecat/purchases-capacitor";

export const NATIVE_PLATFORM = Capacitor.isNativePlatform();

// One codebase, two stores. The same RevenueCat project (and the same
// "pro" / "pro_ai" entitlements) serves the App Store on iPhone and Google Play
// on Android; only the public SDK key and the store's own product ids differ.
const PLATFORM = Capacitor.getPlatform(); // "ios" | "android" | "web"
export const IAP_STORE =
  PLATFORM === "android" ? "PLAY_STORE" : PLATFORM === "ios" ? "APP_STORE" : null;

/** Customer-facing store name for copy — "Google Play" vs "the App Store". */
export function storeName(store = IAP_STORE) {
  return store === "PLAY_STORE" ? "Google Play" : "the App Store";
}

// Google Play subscriptions are "<subscriptionId>:<basePlanId>". The rest of the
// app identifies a plan by its App Store product id (planMatch.js, Pricing.js),
// so Play ids are mapped onto those. Kept in sync with
// functions/index.js PLAY_TO_CANONICAL_PRODUCT.
const PLAY_TO_CANONICAL_PRODUCT = {
  "wimc_pro:monthly": "com.gingerfaith.wimc.pro.monthly",
  "wimc_pro:annual": "com.gingerfaith.wimc.pro.annual",
  "wimc_pro_ai:monthly": "com.gingerfaith.wimc.proai.monthly",
  "wimc_pro_ai:annual": "com.gingerfaith.wimc.proai.annual",
};
export function canonicalProductId(productId) {
  if (!productId) return null;
  return PLAY_TO_CANONICAL_PRODUCT[productId] || productId;
}

// Set from RevenueCat dashboard → Project Settings → API Keys → Apple App
// Store key (public, safe to ship in the client — it only allows purchases
// tied to whichever appUserID is configured, not account-wide access).
const REVENUECAT_IOS_API_KEY = process.env.REACT_APP_REVENUECAT_IOS_API_KEY;
// RevenueCat dashboard → Project Settings → API Keys → Google Play key (also a
// public SDK key; starts with "goog_").
const REVENUECAT_ANDROID_API_KEY = process.env.REACT_APP_REVENUECAT_ANDROID_API_KEY;
const REVENUECAT_API_KEY =
  PLATFORM === "android" ? REVENUECAT_ANDROID_API_KEY : REVENUECAT_IOS_API_KEY;

let configured = false;
let configuredForUid = null;

/**
 * Call once a Firebase uid is known (mirrors TierContext's uid effect).
 * Safe to call again if the uid changes (e.g. sign-out/sign-in as a
 * different account) — RevenueCat's logIn/logOut keeps entitlements scoped
 * to the correct account.
 */
export async function configureIAP(uid) {
  if (!NATIVE_PLATFORM || !uid) return;
  if (!REVENUECAT_API_KEY) {
    console.error(`configureIAP: no RevenueCat API key for ${PLATFORM} (REACT_APP_REVENUECAT_${PLATFORM === "android" ? "ANDROID" : "IOS"}_API_KEY is not set)`);
    return;
  }

  if (!configured) {
    await Purchases.setLogLevel({ level: LOG_LEVEL.WARN });
    await Purchases.configure({ apiKey: REVENUECAT_API_KEY, appUserID: uid });
    configured = true;
    configuredForUid = uid;
    return;
  }

  if (configuredForUid !== uid) {
    await Purchases.logIn({ appUserID: uid });
    configuredForUid = uid;
  }
}

/** Call on sign-out so a shared/reused device doesn't leak entitlements. */
export async function logOutIAP() {
  if (!NATIVE_PLATFORM || !configured) return;
  try {
    await Purchases.logOut();
  } catch {
    // "logOut called but the user is already anonymous" — harmless.
  }
  configuredForUid = null;
}

/**
 * Returns the current default Offering's packages (as configured in the
 * RevenueCat dashboard), or null if unavailable (not configured yet, no
 * network, or no Offering set up).
 */
export async function getOfferingPackages() {
  if (!NATIVE_PLATFORM) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages || null;
  } catch (err) {
    console.error("getOfferingPackages error:", err);
    return null;
  }
}

/**
 * Buys a package. Resolves with the resulting tier ("pro" | "pro_ai") on
 * success so the caller can optimistically reflect it before Firestore's
 * webhook-driven update lands (usually seconds later). On failure throws an
 * Error with a `.cancelled` boolean — true when the user simply dismissed
 * Apple's purchase sheet (not a real error; callers should stay silent).
 */
export async function purchasePackage(pkg) {
  try {
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    return tierFromEntitlements(customerInfo);
  } catch (e) {
    throw normalizePurchaseError(e);
  }
}

// RevenueCat's cancellation signal arrives inconsistently across the
// Capacitor bridge — sometimes `userCancelled: true`, sometimes only
// `code: "1"` (PURCHASE_CANCELLED_ERROR), sometimes just a message string.
// Collapse all of them to one `.cancelled` flag.
function normalizePurchaseError(e) {
  const cancelled =
    e?.userCancelled === true ||
    String(e?.code) === "1" ||
    /cancel/i.test(e?.message || "");
  const err = new Error(e?.message || "Purchase could not be completed.");
  err.cancelled = cancelled;
  return err;
}

/** Restore Purchases — required by Apple on any IAP purchase screen. */
export async function restorePurchases() {
  const { customerInfo } = await Purchases.restorePurchases();
  return tierFromEntitlements(customerInfo);
}

function tierFromEntitlements(customerInfo) {
  const active = customerInfo?.entitlements?.active || {};
  if (active.pro_ai) return "pro_ai";
  if (active.pro) return "pro";
  return "free";
}
