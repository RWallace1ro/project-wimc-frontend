import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { doc, onSnapshot } from "firebase/firestore";
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
    // TEMP DIAGNOSTIC — remove once the tier-display bug is confirmed fixed.
    console.log("[WIMC tier-diag] effect running, uid:", uid);
    if (!uid) {
      console.log("[WIMC tier-diag] no uid — defaulting to free");
      setTier("free"); setPriceId(null); setReady(true); return;
    }
    setReady(false);
    const ref = doc(db, "users", uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const d = snap.exists() ? snap.data() : {};
        const t = d.tier;
        console.log(
          "[WIMC tier-diag] snapshot received — exists:", snap.exists(),
          "| fromCache:", snap.metadata.fromCache,
          "| hasPendingWrites:", snap.metadata.hasPendingWrites,
          "| raw tier field:", JSON.stringify(t),
          "| full doc:", JSON.stringify(d),
        );
        setTier(t === "pro" || t === "pro_ai" ? t : "free");
        setPriceId(d.stripePriceId || null);
        setReady(true);
      },
      // A genuine snapshot error (not "offline" — Firestore's persistent
      // local cache now serves cached data for that case, so onSnapshot
      // still fires the success callback above while offline). Don't
      // downgrade a paying user's tier just because one refresh failed —
      // keep whatever the last known value was and let the UI proceed.
      (err) => {
        console.log("[WIMC tier-diag] onSnapshot ERROR:", err?.code, err?.message);
        setReady(true);
      },
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
