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
  ready: false,
  isPro: false,
  isProAI: false,
  requirePro: () => true,
  requireProAI: () => true,
});

export function useTier() {
  return useContext(TierContext);
}

// pro_ai satisfies pro; pro satisfies pro; free satisfies neither.
function tierMeets(tier, required) {
  if (required === "pro_ai") return tier === "pro_ai";
  if (required === "pro") return tier === "pro" || tier === "pro_ai";
  return true; // free / unknown requirement
}

export function TierProvider({ uid, children }) {
  const [tier, setTier] = useState("free");
  const [ready, setReady] = useState(false);
  const [modal, setModal] = useState({ open: false, feature: "", requiredTier: "pro" });

  useEffect(() => {
    if (!uid) { setTier("free"); setReady(true); return; }
    setReady(false);
    const ref = doc(db, "users", uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const t = snap.exists() ? snap.data().tier : "free";
        setTier(t === "pro" || t === "pro_ai" ? t : "free");
        setReady(true);
      },
      () => { setTier("free"); setReady(true); }, // offline / rules → assume free
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
    <TierContext.Provider value={{ tier, ready, isPro, isProAI, requirePro, requireProAI }}>
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
