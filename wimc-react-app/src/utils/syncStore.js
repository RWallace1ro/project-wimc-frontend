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

// ── Pending-write queue ──────────────────────────────────────────────────────
// A Firestore write made while offline used to just fail silently — the
// localStorage write still succeeded, so the UI looked correct, but the very
// next hydrateFromFirestore() (which runs on every page refresh/login) would
// overwrite localStorage with the stale cloud copy that never got the change,
// silently erasing anything added while offline. Queue failed writes here and
// replay them — on reconnect and before every hydrate — so the cloud catches
// up before anything can stomp the local copy.
const QUEUE_KEY = "__wimc_sync_queue";

function readQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeQueue(queue) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {}
}

// Queue by (uid, key) — a later write to the same key replaces the earlier
// queued entry rather than piling up redundant retries. The queue is a single
// shared localStorage list across whoever is logged in on this browser, so
// every entry MUST remember which account it belongs to.
function enqueue(entry) {
  const queue = readQueue().filter((q) => !(q.key === entry.key && q.uid === entry.uid));
  queue.push(entry);
  writeQueue(queue);
}

// Attempt to push every queued entry belonging to the CURRENTLY logged-in
// account to Firestore. Entries queued under a different (e.g. previously
// logged-out) account are left untouched — flushing them under whoever
// happens to be signed in now would silently copy one user's private data
// into another user's Firestore document the next time they share a
// browser. Those entries simply wait until their own owner logs back in.
export async function flushPendingSync() {
  const queue = readQueue();
  if (!queue.length) return;
  const uid = getUid();
  if (!uid) return;

  const stillPending = [];
  for (const entry of queue) {
    if (entry.uid !== uid) {
      stillPending.push(entry); // not ours — leave queued for its real owner
      continue;
    }
    try {
      await setDoc(doc(db, "users", uid, "syncdata", fsKey(entry.key)), {
        key: entry.key,
        value: entry.deleted ? null : entry.value,
        deleted: entry.deleted,
        updatedAt: entry.updatedAt,
      });
    } catch {
      stillPending.push(entry);
    }
  }
  writeQueue(stillPending);
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => { flushPendingSync(); });
}

// ── Write ────────────────────────────────────────────────────────────────────
export function syncSetItem(key, value) {
  localStorage.setItem(key, value);
  if (NO_SYNC.has(key)) return;
  const uid = getUid();
  if (!uid) return;
  const updatedAt = Date.now();
  setDoc(
    doc(db, "users", uid, "syncdata", fsKey(key)),
    { key, value, updatedAt, deleted: false }
  ).catch(() => {
    // Offline or otherwise unreachable — localStorage already has the
    // correct value; queue the cloud write so it isn't lost on next hydrate.
    enqueue({ key, value, deleted: false, updatedAt, uid });
  });
}

export function syncRemoveItem(key) {
  localStorage.removeItem(key);
  if (NO_SYNC.has(key)) return;
  const uid = getUid();
  if (!uid) return;
  const updatedAt = Date.now();
  setDoc(
    doc(db, "users", uid, "syncdata", fsKey(key)),
    { key, value: null, deleted: true, updatedAt }
  ).catch(() => {
    enqueue({ key, value: null, deleted: true, updatedAt, uid });
  });
}

// ── Hydrate ──────────────────────────────────────────────────────────────────
// Call once when the user logs in, before components mount.
// Pulls all Firestore syncdata docs into localStorage so every page reads
// the latest cross-device state.
export async function hydrateFromFirestore(uid) {
  // Replay any writes that failed (offline) during a previous session FIRST —
  // otherwise this hydrate would immediately overwrite localStorage with the
  // stale cloud copy those queued writes were trying to correct.
  await flushPendingSync();
  try {
    const colRef = collection(db, "users", uid, "syncdata");
    const snap = await getDocs(colRef);
    // Only THIS account's still-pending keys should block a cloud read from
    // landing in localStorage — a stray entry left behind by a different
    // account that previously used this browser must never suppress or
    // otherwise interact with this account's own hydrate.
    const pendingKeys = new Set(
      readQueue().filter((q) => q.uid === uid).map((q) => q.key)
    );
    snap.forEach((docSnap) => {
      const { key, value, deleted } = docSnap.data();
      if (!key) return;
      // Still queued (flush above failed again, e.g. still offline) — don't
      // let this stale cloud read clobber the not-yet-synced local value.
      if (pendingKeys.has(key)) return;
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
