import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { doc, onSnapshot, getDocFromServer } from "firebase/firestore";
import { Capacitor } from "@capacitor/core";
import { db } from "../firebase";
import UpgradeModal from "../components/UpgradeModal/UpgradeModal";
import { configureIAP, logOutIAP } from "../utils/iap";

// Same reasoning as Pricing.js/UpgradeModal.js/FAQ.js — naming a specific
// paid tier in the native app's UI (even just a lock badge) is treated by
// Apple as an implicit offer to sell it.
const NATIVE_PLATFORM = Capacitor.isNativePlatform();

/**
 * TierContext — the single source of truth for the signed-in user's plan.
 *
 * Reads users/{uid}.tier in real time (so an upgrade made in another tab or by
 * the Stripe webhook reflects immediately). Exposes gate helpers that pop the
 * UpgradeModal when a user lacks the required tier.
 *
 * tier values: "free" | "pro" | "pro_ai"
 */

const TierContext = createContext({
  tier: "free",
  priceId: null,
  ready: false,
  isPro: false,
  isProAI: false,
  // Where a paid plan was bought — an account can hold an App Store plan, a
  // Stripe (website) plan, or both. Drives which cancel/manage instructions
  // Settings shows (Apple subscriptions can't be managed from the Stripe
  // portal, and vice versa).
  viaApple: false,
  viaStripe: false,
  requirePro: () => true,
  requireProAI: () => true,
});

export function useTier() {
  return useContext(TierContext);
}

/**
 * ProGate — wraps an inline feature panel. For users who lack the required tier
 * it renders the panel dimmed + non-interactive with a "🔒 Pro" badge; the
 * first click opens the upgrade modal instead of activating the panel. Users
 * who meet the tier get the panel untouched.
 */
export function ProGate({ feature, requiredTier = "pro", children }) {
  const { isPro, isProAI, requirePro, requireProAI } = useTier();
  const allowed = requiredTier === "pro_ai" ? isProAI : isPro;
  if (allowed) return children;

  const gate = requiredTier === "pro_ai" ? requireProAI : requirePro;
  const badge = NATIVE_PLATFORM
    ? "🔒 Upgrade"
    : requiredTier === "pro_ai" ? "🔒 Pro + AI" : "🔒 Pro";
  return (
    <div
      className="pro-gate"
      role="button"
      tabIndex={0}
      onClickCapture={(e) => { e.preventDefault(); e.stopPropagation(); gate(feature); }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); gate(feature); } }}
    >
      <div className="pro-gate__content" aria-hidden="true">{children}</div>
      <span className="pro-gate__badge">{badge}</span>
    </div>
  );
}

// pro_ai satisfies pro; pro satisfies pro; free satisfies neither.
function tierMeets(tier, required) {
  if (required === "pro_ai") return tier === "pro_ai";
  if (required === "pro") return tier === "pro" || tier === "pro_ai";
  return true; // free / unknown requirement
}

export function TierProvider({ uid, children }) {
  const [tier, setTier] = useState("free");
  const [priceId, setPriceId] = useState(null);
  const [ready, setReady] = useState(false);
  const [sources, setSources] = useState({ viaApple: false, viaStripe: false });
  const [modal, setModal] = useState({ open: false, feature: "", requiredTier: "pro" });

  // RevenueCat must know which Firebase account is purchasing so its webhook
  // (functions/index.js revenuecatWebhook) can write to the right users/{uid}
  // doc. No-ops on web — NATIVE_PLATFORM-gated inside configureIAP itself.
  useEffect(() => {
    if (uid) configureIAP(uid);
    else logOutIAP();
  }, [uid]);

  useEffect(() => {
    if (!uid) {
      setTier("free"); setPriceId(null);
      setSources({ viaApple: false, viaStripe: false });
      setReady(true); return;
    }
    setReady(false);
    const ref = doc(db, "users", uid);
    // Two confirmed real-device bugs traced to Firestore's local persistence
    // cache silently serving stale data forever, with nothing ever prompting
    // a real server check to correct it: (1) a cached "document doesn't
    // exist" result on one device, (2) cached "exists but wrong/old tier"
    // on another (e.g. laptop still showing Free after the account was
    // upgraded, while phone correctly showed Pro+AI — same account,
    // genuinely different cached snapshots per device). Both are covered by
    // the same fix: any time the FIRST snapshot for this mount comes from
    // cache, kick off exactly one direct server read in the background and
    // apply it if it disagrees with the cached value — cache is only ever
    // used for the instant-first-paint, never trusted as the final answer.
    let didServerCheck = false;
    const applyDoc = (d) => {
      const t = d?.tier;
      setTier(t === "pro" || t === "pro_ai" ? t : "free");
      setPriceId(d?.stripePriceId || null);
      // Accounts that subscribed on the website before Apple IAP existed have
      // `tier` but no `stripeTier` until their doc is next written (see
      // syncEffectiveTier's backfill) — so a paid tier with no Apple plan
      // behind it is treated as a Stripe plan.
      const isPaid = (v) => v === "pro" || v === "pro_ai";
      const apple = isPaid(d?.appleTier);
      setSources({
        viaApple: apple,
        viaStripe: isPaid(d?.stripeTier) || (isPaid(t) && !apple),
      });
      setReady(true);
    };
    const unsub = onSnapshot(
      ref,
      (snap) => {
        applyDoc(snap.exists() ? snap.data() : {});
        if (snap.metadata.fromCache && !didServerCheck) {
          didServerCheck = true;
          getDocFromServer(ref)
            .then((serverSnap) => applyDoc(serverSnap.exists() ? serverSnap.data() : {}))
            .catch(() => {}); // genuinely offline — cached value above stands
        }
      },
      // A genuine snapshot error (not "offline" — Firestore's persistent
      // local cache now serves cached data for that case, so onSnapshot
      // still fires the success callback above while offline). Don't
      // downgrade a paying user's tier just because one refresh failed —
      // keep whatever the last known value was and let the UI proceed.
      () => { setReady(true); },
    );
    return () => unsub();
  }, [uid]);

  const isPro = tier === "pro" || tier === "pro_ai";
  const isProAI = tier === "pro_ai";

  // require<Tier>(featureName): returns true if allowed; otherwise opens the
  // upgrade modal and returns false so the caller can bail.
  const gate = useCallback((required, feature) => {
    if (tierMeets(tier, required)) return true;
    setModal({ open: true, feature: feature || "", requiredTier: required });
    return false;
  }, [tier]);

  const requirePro = useCallback((feature) => gate("pro", feature), [gate]);
  const requireProAI = useCallback((feature) => gate("pro_ai", feature), [gate]);

  return (
    <TierContext.Provider value={{ tier, priceId, ready, isPro, isProAI, viaApple: sources.viaApple, viaStripe: sources.viaStripe, requirePro, requireProAI }}>
      {children}
      <UpgradeModal
        open={modal.open}
        feature={modal.feature}
        requiredTier={modal.requiredTier}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
      />
    </TierContext.Provider>
  );
}
