import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { doc, onSnapshot, getDocFromServer } from "firebase/firestore";
import { db } from "../firebase";
import UpgradeModal from "../components/UpgradeModal/UpgradeModal";

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
  const badge = requiredTier === "pro_ai" ? "🔒 Pro + AI" : "🔒 Pro";
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
  const [modal, setModal] = useState({ open: false, feature: "", requiredTier: "pro" });

  useEffect(() => {
    if (!uid) { setTier("free"); setPriceId(null); setReady(true); return; }
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
    <TierContext.Provider value={{ tier, priceId, ready, isPro, isProAI, requirePro, requireProAI }}>
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
