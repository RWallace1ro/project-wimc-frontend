/**
 * accountDeletion — full GDPR "right to erasure" for a WIMC account.
 *
 * deleteAllUserData(uid) removes every trace of a user's content across all
 * three stores BEFORE the Firebase Auth account itself is deleted by the caller:
 *
 *   1. Cloudinary images/videos — gathered from the user's own Firestore data
 *      (their syncdata values + profile avatar) and deleted via the signed
 *      deleteCloudinaryAsset function. Cloudinary is keyed by shared SECTION
 *      tags (not per-user), so we cannot delete "by tag" — we delete exactly the
 *      assets this user references, which are their own unique uploads.
 *   2. Firestore syncdata subcollection — deleting the parent users/{uid} doc
 *      does NOT cascade to subcollections, so each doc must be removed.
 *   3. sharedContent docs this user owns (their public share links).
 *   4. The users/{uid} profile doc itself.
 *
 * Cloudinary deletes are best-effort: a failed image delete never blocks the
 * account deletion (the user still gets erased from the app). Counts are
 * returned so the caller can surface a summary.
 *
 * Must be called while the user is still authenticated (Firestore rules require
 * request.auth.uid == uid for their own data).
 */

import { db } from "../firebase";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import { deleteImage, deleteVideo } from "./CloudinaryAPI";

// Matches any Cloudinary delivery URL (image or video, with or without
// transformation/version segments). Bounded by quote/space/backslash so it
// stops cleanly at the end of a URL embedded in stringified JSON.
const CLOUDINARY_URL_RE =
  /https:\/\/res\.cloudinary\.com\/[A-Za-z0-9_-]+\/(?:image|video)\/upload\/[^\s"'\\)]+/g;

// Shared app-default assets that belong to everyone — never delete these.
const PROTECTED_URLS = new Set([
  "https://res.cloudinary.com/djoh2vfhd/image/upload/v1729608070/2011-10-27_20.07.18_HDR_cdbudn.jpg",
]);

/**
 * @param {string} uid
 * @returns {Promise<{images:number, imageErrors:number, syncDocs:number, shares:number}>}
 */
export async function deleteAllUserData(uid) {
  const result = { images: 0, imageErrors: 0, syncDocs: 0, shares: 0 };
  if (!uid) return result;

  const urls = new Set();

  // ── 1a. Profile avatar URL ──────────────────────────────────────────────────
  try {
    const profileSnap = await getDoc(doc(db, "users", uid));
    const avatar = profileSnap.exists() ? profileSnap.data()?.avatarUrl : null;
    if (typeof avatar === "string") {
      (avatar.match(CLOUDINARY_URL_RE) || []).forEach((u) => urls.add(u));
    }
  } catch {
    /* non-fatal */
  }

  // ── 1b. Image/video URLs embedded in syncdata values ────────────────────────
  let syncSnap = null;
  try {
    syncSnap = await getDocs(collection(db, "users", uid, "syncdata"));
    syncSnap.forEach((d) => {
      const v = d.data()?.value;
      if (typeof v === "string") {
        (v.match(CLOUDINARY_URL_RE) || []).forEach((u) => urls.add(u));
      }
    });
  } catch {
    /* if we cannot read syncdata, skip image cleanup but still try the rest */
  }

  // ── 2. Delete the Cloudinary assets (best-effort) ───────────────────────────
  for (const url of urls) {
    if (PROTECTED_URLS.has(url)) continue;
    try {
      if (url.includes("/video/upload/")) {
        await deleteVideo(url);
      } else {
        await deleteImage(url);
      }
      result.images += 1;
    } catch {
      result.imageErrors += 1; // orphaned asset; never blocks account deletion
    }
  }

  // ── 3. Delete the syncdata subcollection docs ───────────────────────────────
  if (syncSnap) {
    for (const d of syncSnap.docs) {
      try {
        await deleteDoc(d.ref);
        result.syncDocs += 1;
      } catch {
        /* best-effort */
      }
    }
  }

  // ── 4. Delete share links this user owns ────────────────────────────────────
  try {
    const sharesSnap = await getDocs(
      query(collection(db, "sharedContent"), where("ownerId", "==", uid)),
    );
    for (const d of sharesSnap.docs) {
      try {
        await deleteDoc(d.ref);
        result.shares += 1;
      } catch {
        /* best-effort */
      }
    }
  } catch {
    /* non-fatal */
  }

  // ── 5. Delete the profile doc itself ────────────────────────────────────────
  try {
    await deleteDoc(doc(db, "users", uid));
  } catch {
    /* best-effort */
  }

  return result;
}
