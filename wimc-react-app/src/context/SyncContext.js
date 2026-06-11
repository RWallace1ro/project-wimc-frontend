import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { hydrateFromFirestore, subscribeToRemoteChanges } from "../utils/syncStore";

const SyncContext = createContext({
  syncing: false,
  remoteUpdated: false,
  dismissRemoteUpdate: () => {},
});

export function useSyncContext() {
  return useContext(SyncContext);
}

/**
 * SyncProvider
 *
 * Wrap the authenticated portion of the app with this provider.
 * It does two things:
 *
 * 1. On mount (login), calls hydrateFromFirestore so localStorage is
 *    populated with the latest data before components render.
 *
 * 2. Subscribes to real-time Firestore changes. If another device writes
 *    new data, we update localStorage and show a non-intrusive banner
 *    ("Updated on another device — reload to see changes").
 */
export function SyncProvider({ uid, children }) {
  const [syncing, setSyncing] = useState(true);   // true while hydrating
  const [remoteUpdated, setRemoteUpdated] = useState(false);
  const unsubRef = useRef(null);
  const hydrated = useRef(false);

  // Hydrate localStorage from Firestore once when uid becomes available
  useEffect(() => {
    if (!uid || hydrated.current) return;
    hydrated.current = true;

    hydrateFromFirestore(uid).finally(() => {
      setSyncing(false);
    });

    // Subscribe to future remote changes from other devices
    unsubRef.current = subscribeToRemoteChanges(uid, (_changedKey) => {
      setRemoteUpdated(true);
    });

    return () => {
      unsubRef.current?.();
    };
  }, [uid]);

  const dismissRemoteUpdate = useCallback(() => {
    setRemoteUpdated(false);
  }, []);

  // While hydrating a logged-in user's cloud data, hold back the app so
  // components initialize from the LATEST localStorage (not stale device
  // state). Logged-out users (uid=null) are never gated.
  const gating = Boolean(uid) && syncing;

  return (
    <SyncContext.Provider value={{ syncing, remoteUpdated, dismissRemoteUpdate }}>
      {gating ? (
        <div style={{
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          color: "#64748b",
          fontSize: 14,
        }}>
          <span style={{ fontSize: 32 }}>🔄</span>
          Syncing your closet…
        </div>
      ) : (
        children
      )}
      {remoteUpdated && (
        <div style={{
          position: "fixed",
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          background: "#0f172a",
          color: "#fff",
          padding: "10px 18px",
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 500,
          display: "flex",
          alignItems: "center",
          gap: 12,
          boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
          zIndex: 9999,
          whiteSpace: "nowrap",
        }}>
          🔄 Another device updated your data
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "5px 12px",
              background: "#7c3aed",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Reload
          </button>
          <button
            onClick={dismissRemoteUpdate}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.6)",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
              padding: 0,
            }}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}
    </SyncContext.Provider>
  );
}
