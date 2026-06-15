/**
 * accountDeletion — full GDPR "right to erasure" for a WIMC account.
 *
 * deleteAllUserData(uid) removes every trace of a user's content across all
 * three stores BEFORE the Firebase Auth account itself is deleted by the caller:
 *
 *   1. Cloudinary images/videos — gathered from the user's own Firestore data
 *      (their syncdata values + profile avatar) and deleted via the signed
 *      deleteCloudinaryAsset function. The MAIN closet uses shared SECTION tags
 *      (common across all users), so we can only delete the assets this user
 *      references. KIDS & PET closets use per-profile-unique tags
 *      (kid-{id}-… / pet-{id}-…), so those are fetched BY TAG and deleted in
 *      full — the same complete cleanup, applied to every kid & pet item.
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
 *
 * scheduleDeletion(uid) — marks the account for deletion 14 days from now.
 *   Stores { pendingDeletion: true, deletionDate: <ISO string> } on the profile
 *   doc. Phase B (scheduled Cloud Function) will complete the erasure when the
 *   date arrives. The user can log back in and cancel any time before then.
 *
 * cancelDeletion(uid) — clears the pending-deletion flag.
 */

import { db } from "../firebase";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import { deleteImage, deleteVideo, fetchImagesByTag, fetchVideosByTag } from "./CloudinaryAPI";

// Section keys used by every closet. Kids/Pet closets prefix these with a
// per-profile id (kid-{id}-... / pet-{id}-...) so the resulting tags are unique
// to one user — safe to fetch & delete by tag (unlike the shared main-closet
// tags, which are common across all users).
const SECTION_KEYS = [
  "dresses-skirts", "dress-shirts-suits", "shoes-sneakers",
  "pants-jeans", "tops", "bags-accessories", "jackets-coats",
  "accessories", "fragrance", // bags-card sub-sections
];

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
  let kidPetProfiles = [];

  // ── 1a. Profile avatar URL ──────────────────────────────────────────────────
  try {
    const profileSnap = await getDoc(doc(db, "users", uid));
    const data = profileSnap.exists() ? profileSnap.data() : null;
    const avatar = data?.avatarUrl;
    if (typeof avatar === "string") {
      (avatar.match(CLOUDINARY_URL_RE) || []).forEach((u) => urls.add(u));
    }
    // Kids' + Pet profile photos live as fields on the user doc, not syncdata.
    kidPetProfiles = [
      ...(data?.kidsProfiles || []).map((p) => ({ ...p, _prefix: "kid" })),
      ...(data?.kidsDeleted  || []).map((p) => ({ ...p, _prefix: "kid" })),
      ...(data?.petProfiles  || []).map((p) => ({ ...p, _prefix: "pet" })),
      ...(data?.petDeleted   || []).map((p) => ({ ...p, _prefix: "pet" })),
    ];
    kidPetProfiles.forEach((prof) => {
      if (typeof prof?.photoUrl === "string") {
        (prof.photoUrl.match(CLOUDINARY_URL_RE) || []).forEach((u) => urls.add(u));
      }
    });
  } catch {
    /* non-fatal */
  }

  // ── 1a-ii. Kids/Pet closet items — fetch by per-profile tag ─────────────────
  // These tags (kid-{id}-tops, pet-{id}-jackets-coats, …) are unique to this
  // user, so a tag fetch returns ONLY their uploads — same complete cleanup the
  // main closet gets via referenced URLs, applied to every kid & pet item.
  try {
    const tagJobs = [];
    kidPetProfiles.forEach((prof) => {
      if (!prof?.id) return;
      SECTION_KEYS.forEach((sec) => {
        const tag = `${prof._prefix}-${prof.id}-${sec}`;
        tagJobs.push(
          fetchImagesByTag(tag).then((arr) => (arr || []).forEach((u) => urls.add(u))).catch(() => {}),
          fetchVideosByTag(tag).then((arr) => (arr || []).forEach((u) => urls.add(u))).catch(() => {}),
        );
      });
    });
    await Promise.all(tagJobs);
  } catch {
    /* non-fatal — fall back to whatever URLs we already collected */
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

// ── Grace-period helpers ──────────────────────────────────────────────────────

const GRACE_DAYS = 14;

/**
 * Schedule an account for deletion GRACE_DAYS from now.
 * Stores { pendingDeletion: true, deletionDate } on the profile doc so Phase B
 * (a scheduled Cloud Function) can complete the erasure when the date arrives.
 * The user remains fully active and can cancel until then.
 *
 * @param {string} uid
 * @returns {Promise<string>} ISO date string of the scheduled deletion date
 */
export async function scheduleDeletion(uid) {
  if (!uid) throw new Error("uid required");
  const deletionDate = new Date(
    Date.now() + GRACE_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  await setDoc(
    doc(db, "users", uid),
    { pendingDeletion: true, deletionDate },
    { merge: true },
  );
  return deletionDate;
}

/**
 * Cancel a pending deletion — clears the flag so the account is active again.
 * @param {string} uid
 */
export async function cancelDeletion(uid) {
  if (!uid) return;
  await updateDoc(doc(db, "users", uid), {
    pendingDeletion: false,
    deletionDate: null,
  });
}
