import { initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Firebase Analytics — lazily initialized only after user consent.
// Call initFirebaseAnalytics() from utils/analytics.js once consent is given.
let _analytics = null;
export async function initFirebaseAnalytics() {
  if (_analytics) return _analytics;
  try {
    const supported = await isSupported();
    if (supported) {
      _analytics = getAnalytics(app);
    }
  } catch {
    // Analytics not supported in this environment (e.g. ad-blockers, SSR)
  }
  return _analytics;
}
export function getFirebaseAnalytics() { return _analytics; }

// Safari's Intelligent Tracking Prevention (ITP) can block IndexedDB and
// localStorage when they're accessed in a cross-origin context, causing
// auth/internal-error on sign-in.  We try each persistence tier in order
// until one succeeds:
//   1. indexedDB  — best (survives tab close on most browsers)
//   2. localStorage — good (blocked by Safari ITP in some configs)
//   3. sessionStorage — works in Safari ITP; user re-logs after tab close
(async () => {
  try {
    await setPersistence(auth, indexedDBLocalPersistence);
  } catch {
    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch {
      try {
        await setPersistence(auth, browserSessionPersistence);
      } catch {
        // inMemoryPersistence is the final fallback — auth state lost on refresh
      }
    }
  }
})();
