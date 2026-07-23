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
    const unsub = onSnapshot(
      ref,
      async (snap) => {
        // A cached snapshot claiming the document doesn't exist at all is
        // suspicious in a way an actual empty/missing doc from the SERVER
        // isn't — a real user account always has a doc (created at signup).
        // Confirmed via diagnostic logging: some devices get stuck serving a
        // stale "not found" result from local persistence indefinitely,
        // silently downgrading a paying user to Free forever since nothing
        // ever prompts a real server check. Explicitly bypass the cache with
        // one direct server read whenever this specific pattern shows up.
        if (snap.metadata.fromCache && !snap.exists()) {
          try {
            const serverSnap = await getDocFromServer(ref);
            const sd = serverSnap.exists() ? serverSnap.data() : {};
            const st = sd.tier;
            setTier(st === "pro" || st === "pro_ai" ? st : "free");
            setPriceId(sd.stripePriceId || null);
            setReady(true);
            return;
          } catch {
            // Genuinely offline with nothing cached — fall through to the
            // (also "free") value below; there's nothing better to show.
          }
        }
        const d = snap.exists() ? snap.data() : {};
        const t = d.tier;
        setTier(t === "pro" || t === "pro_ai" ? t : "free");
        setPriceId(d.stripePriceId || null);
        setReady(true);
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
