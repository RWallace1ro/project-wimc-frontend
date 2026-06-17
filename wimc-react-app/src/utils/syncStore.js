/**
 * syncStore — localStorage + Firestore write-through layer
 *
 * Any call to syncSetItem / syncRemoveItem writes to localStorage immediately
 * (so the UI stays fast) and also pushes to the user's Firestore syncdata
 * subcollection in the background.
 *
 * On a new device, call hydrateFromFirestore(uid) before rendering to pull
 * all cloud data into localStorage.
 */

import { db, auth } from "../firebase";
import {
  doc,
  setDoc,
  collection,
  getDocs,
  onSnapshot,
} from "firebase/firestore";

// ── Keys that are device-local and should NOT be synced ──────────────────────
const NO_SYNC = new Set([
  // wimc_tour_seen is now synced so the onboarding tour auto-shows once per
  // ACCOUNT (every new sign-up sees it once, across all their devices).
  "wimc_local_outfits", // legacy local backup
]);

// Firestore document IDs cannot contain '/' — replace with '__'
function fsKey(key) {
  return key.replace(/\//g, "__");
}

function getUid() {
  return auth.currentUser?.uid ?? null;
}

// ── Write ────────────────────────────────────────────────────────────────────
export function syncSetItem(key, value) {
  localStorage.setItem(key, value);
  if (NO_SYNC.has(key)) return;
  const uid = getUid();
  if (!uid) return;
  setDoc(
    doc(db, "users", uid, "syncdata", fsKey(key)),
    { key, value, updatedAt: Date.now(), deleted: false }
  ).catch(() => {}); // fail silently — localStorage is always written first
}

export function syncRemoveItem(key) {
  localStorage.removeItem(key);
  if (NO_SYNC.has(key)) return;
  const uid = getUid();
  if (!uid) return;
  setDoc(
    doc(db, "users", uid, "syncdata", fsKey(key)),
    { key, value: null, deleted: true, updatedAt: Date.now() }
  ).catch(() => {});
}

// ── Hydrate ──────────────────────────────────────────────────────────────────
// Call once when the user logs in, before components mount.
// Pulls all Firestore syncdata docs into localStorage so every page reads
// the latest cross-device state.
export async function hydrateFromFirestore(uid) {
  try {
    const colRef = collection(db, "users", uid, "syncdata");
    const snap = await getDocs(colRef);
    snap.forEach((docSnap) => {
      const { key, value, deleted } = docSnap.data();
      if (!key) return;
      if (deleted) {
        localStorage.removeItem(key);
      } else if (value !== null && value !== undefined) {
        localStorage.setItem(key, value);
      }
    });
  } catch {
    // Firestore unreachable (offline / rules not yet set) — use localStorage
  } finally {
    // Notify contexts (e.g. BackgroundContext) that localStorage was refreshed
    // from the cloud so they can re-read and restore the user's customizations.
    try { window.dispatchEvent(new Event("wimc-hydrated")); } catch {}
  }
}

// ── Real-time listener ───────────────────────────────────────────────────────
// Subscribe to remote changes. When another device writes, the callback fires
// with the changed key so the app can react (e.g. show a "refresh" banner).
export function subscribeToRemoteChanges(uid, onChange) {
  const colRef = collection(db, "users", uid, "syncdata");
  return onSnapshot(colRef, (snap) => {
    snap.docChanges().forEach((change) => {
      if (change.type === "modified" || change.type === "added") {
        const { key, value, deleted } = change.doc.data();
        if (!key) return;
        // Only act on changes that originated from ANOTHER device.
        // Our own writes already updated localStorage synchronously.
        const current = localStorage.getItem(key);
        const incoming = deleted ? null : value;
        if (current !== incoming) {
          if (deleted) {
            localStorage.removeItem(key);
          } else if (incoming !== null && incoming !== undefined) {
            localStorage.setItem(key, incoming);
          }
          onChange(key); // notify the UI
        }
      }
    });
  }, () => {}); // ignore snapshot errors (offline etc.)
}
