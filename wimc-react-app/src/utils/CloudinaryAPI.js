import { Cloudinary } from "@cloudinary/url-gen";
import { auth } from "../firebase";
import { sectionTagsWithSubs } from "./closetSubsections";

// ── Per-user tag scoping ─────────────────────────────────────────────────────
// CRITICAL: every closet tag ("tops", "male-shoes-sneakers", "kid-abc-tops",
// etc.) used to be a completely GLOBAL Cloudinary tag with no per-user
// scoping at all — every signed-up account uploaded to and fetched from the
// exact same tag namespace, so any user could see every other user's closet
// photos for a given section (confirmed via a real cross-account leak during
// testing). Fixing this here, at the network-call boundary, covers every
// upload/fetch call in the app without touching ~25 other call sites, since
// they all funnel through uploadImage/uploadVideo/uploadReceipt/
// fetchImagesByTag/fetchVideosByTag — and since this prefixing happens AFTER
// closetSubsections.js has already done its sub-section tag expansion (that
// logic only ever sees the original bare tags), nothing there needs to
// change either.
//
// One call site was missed on the first pass: components/ImageUpload/
// ImageUpload.js drives Cloudinary's hosted upload WIDGET directly
// (window.cloudinary.createUploadWidget) for the "web search"/URL/cloud-
// drive picker — it never calls uploadImage() here, so it was building its
// own unscoped `tags: [tag]` config and re-opening the exact same
// cross-account collision this file exists to prevent, just for that one
// upload path. Exported scopedTag() so that call site can scope its own
// tag before handing it to the widget.
function currentUid() {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    // Every legitimate call path here requires a signed-in user already
    // (uploads are rejected server-side without one). If this ever fires,
    // something is calling a closet API without auth — fail toward an
    // isolated, non-colliding tag rather than silently falling back to the
    // old global/shared namespace.
    console.error("Cloudinary tag requested with no signed-in user.");
    return "anon-unscoped";
  }
  return uid;
}
export function scopedTag(tag) {
  return `${currentUid()}-${tag}`;
}

// Build request headers with the current user's Firebase ID token so the
// cloudinarySign / deleteCloudinaryAsset functions can require authentication.
async function authHeaders() {
  const headers = { "Content-Type": "application/json" };
  try {
    const token = await auth.currentUser?.getIdToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    /* not signed in — request will be rejected by the function */
  }
  return headers;
}

// ===== Env =====
const CLOUD_NAME = process.env.REACT_APP_CLOUD_NAME;
const UPLOAD_PRESET = process.env.REACT_APP_UPLOAD_PRESET; // signed preset
const API_KEY = process.env.REACT_APP_CLOUDINARY_API_KEY;
const SIGN_URL = process.env.REACT_APP_CLOUDINARY_SIGN_URL; // Firebase Function

// ===== Base endpoints =====
const IMG_ENDPOINT = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
const VID_ENDPOINT = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`;
const RAW_ENDPOINT = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`;

// Cloudinary client for AdvancedImage usage
export const cld = new Cloudinary({ cloud: { cloudName: CLOUD_NAME } });

// ===== Fetch a server-generated signature for signed uploads =====
async function getSignature(params) {
  const res = await fetch(SIGN_URL, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    // Callers up the chain (share/export features) mostly swallow this into
    // a generic "Export failed" message — log the real reason here so it's
    // still visible in DevTools console regardless.
    const t = await res.text().catch(() => "");
    console.error(`getSignature failed: ${res.status} ${t}`);
    throw new Error(`Failed to get upload signature (${res.status})`);
  }
  return res.json(); // { timestamp, signature }
}

// ===== Generic uploader (signed — API secret never leaves the server) =====
async function uploadTo(endpoint, fileOrBlob, { folder, tags, filename } = {}) {
  // 1. Get signature from Firebase Function
  const { timestamp, signature } = await getSignature({
    upload_preset: UPLOAD_PRESET,
    ...(folder && { folder }),
    ...(tags && { tags }),
  });

  // 2. Build signed FormData
  const formData = new FormData();
  // A plain Blob (e.g. from uploadRawJSON) has no filename by default, so
  // Cloudinary can't detect its format from the extension and rejects it
  // ("unknown file format not allowed"). A real File object already carries
  // its own name, so `filename` is only needed for Blob-based uploads.
  if (filename) formData.append("file", fileOrBlob, filename);
  else formData.append("file", fileOrBlob);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("api_key", API_KEY);
  formData.append("timestamp", timestamp);
  formData.append("signature", signature);
  if (folder) formData.append("folder", folder);
  if (tags) formData.append("tags", tags);

  const res = await fetch(endpoint, { method: "POST", body: formData });
  if (!res.ok) {
    const t = await res.text();
    // Same reasoning as above — log before throwing so the real Cloudinary
    // error (e.g. a disallowed "raw"/json format on the upload preset) is
    // visible even though most callers show a generic error to the user.
    console.error(`Cloudinary upload failed: ${res.status} ${t} (endpoint: ${endpoint}, folder: ${folder})`);
    throw new Error(`Cloudinary upload failed: ${res.status} ${t}`);
  }
  return res.json(); // { secure_url, public_id, version, ... }
}

// ===== Upload helpers =====

export async function uploadImage(file, sectionTag = "default") {
  try {
    return await uploadTo(IMG_ENDPOINT, file, {
      folder: "closet-items",
      tags: scopedTag(sectionTag),
    });
  } catch (err) {
    console.error("Error uploading image:", err);
    return null;
  }
}

// uploadVideo(file, sectionTag?)
export async function uploadVideo(file, sectionTag = "default") {
  try {
    return await uploadTo(VID_ENDPOINT, file, {
      folder: "closet-items",
      tags: scopedTag(sectionTag),
    });
  } catch (err) {
    console.error("Error uploading video:", err);
    return null;
  }
}

// uploadReceipt(file) — uploads receipt images/PDFs to the dedicated "receipts" folder
export async function uploadReceipt(file) {
  try {
    return await uploadTo(IMG_ENDPOINT, file, {
      folder: "receipts",
      tags: scopedTag("receipts"),
    });
  } catch (err) {
    console.error("Error uploading receipt:", err);
    return null;
  }
}

// uploadRawJSON(obj) — host a shareable outfit JSON without a backend
export async function uploadRawJSON(jsonObj, folder = "wimc/outfits") {
  const blob = new Blob([JSON.stringify(jsonObj)], {
    type: "application/json",
  });

  return uploadTo(RAW_ENDPOINT, blob, { folder, filename: "data.json" });
}

// ===== Transform helpers (safe to use anywhere) =====
export function imageThumb(url) {
  return url?.replace("/upload/", "/upload/f_auto,q_auto,w_600,c_limit/");
}

// Responsive srcSet string for Cloudinary images
export function imageSrcSet(url) {
  if (!url || !url.includes("res.cloudinary.com")) return undefined;
  const sizes = [300, 600, 900, 1200];
  return sizes
    .map((w) => `${url.replace("/upload/", `/upload/f_auto,q_auto,w_${w},c_limit/`)} ${w}w`)
    .join(", ");
}

// Video poster — grabs the very FIRST frame (so_0). A fixed later offset like
// so_3 (3 seconds in) 404s for any video shorter than that, which is common
// for quick recordings — so_0 always exists as long as the video has at
// least one frame.
// Was appending ".jpg" onto the URL as-is (e.g. "...video.mp4.jpg") instead
// of replacing the video extension — Cloudinary can't resolve that double
// extension, so the poster image 404s and every video thumbnail that falls
// back to this (i.e. wasn't given an explicit refImage) silently shows
// nothing. Now identical to safeVideoPoster's correct extension-replace
// logic; kept both names since call sites use either.
export function videoPoster(url) {
  if (!url) return "";
  const withTransform = url.replace("/upload/", "/upload/so_0,du_0/");
  return withTransform.replace(/\.(mp4|mov|webm|mkv|m4v)(\?.*)?$/i, ".jpg");
}

export function safeVideoPoster(url) {
  return videoPoster(url);
}

// Stream-friendly delivery for videos
export function videoStream(url) {
  return url?.replace("/upload/", "/upload/f_auto,q_auto/");
}

// ===== Listing by tag =====
// Images by tag (requires "Auto-create image list" in Cloudinary settings)
export const fetchImagesByTag = async (tag) => {
  const url = `https://res.cloudinary.com/${CLOUD_NAME}/image/list/${scopedTag(tag)}.json`;
  try {
    const response = await fetch(url, { method: "GET" });
    if (!response.ok) {
      // Cloudinary returns 404 for a tag that simply has no items yet — every
      // brand-new sub-section (e.g. "heels", "skirts") 404s until the user
      // uploads something to it. That's expected, not an error, so it's
      // silent; only log truly unexpected statuses.
      if (response.status !== 404) {
        console.error(`fetchImagesByTag("${tag}") failed: ${response.status} ${response.statusText}`);
      }
      return [];
    }
    const data = await response.json();
    const images = (data.resources || []).map(
      (item) =>
        `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/v${item.version}/${item.public_id}.${item.format}`,
    );
    return images;
  } catch (error) {
    console.error("Error fetching images by tag:", error);
    return [];
  }
};

// Fetch all images for a section, merging its sub-section tags so items sorted
// into sub-sections (e.g. Skirts under Dresses/Skirts) are never missed.
// Returns a deduped array of URLs — same shape as fetchImagesByTag.
export const fetchImagesForSection = async (sectionTag) => {
  const tags = sectionTagsWithSubs(sectionTag);
  if (tags.length <= 1) return fetchImagesByTag(sectionTag);
  const lists = await Promise.all(tags.map((t) => fetchImagesByTag(t)));
  const seen = new Set();
  const out = [];
  for (const url of lists.flat()) {
    if (url && !seen.has(url)) { seen.add(url); out.push(url); }
  }
  return out;
};

// ===== Delete helpers =====

// Derive the delete-function URL from the sign URL (same base, different name)
const DELETE_URL = SIGN_URL
  ? SIGN_URL.replace(/\/cloudinarySign([/?].*)?$/, "/deleteCloudinaryAsset")
  : "";

/**
 * Extract the Cloudinary public_id from a full delivery URL.
 * Handles transformation segments (f_auto, q_auto, w_600, so_3, etc.)
 * and version segments (v1234567890).
 *
 * e.g. .../upload/f_auto,q_auto,w_600,c_limit/v1234/closet-items/abc.jpg
 *      → "closet-items/abc"
 */
export function extractPublicId(url) {
  if (!url || !url.includes("/upload/")) return "";
  const afterUpload = url.split("/upload/")[1];
  if (!afterUpload) return "";

  const segments = afterUpload.split("/");
  const publicIdParts = [];
  let foundContent = false;

  for (const seg of segments) {
    if (!foundContent) {
      // Skip version segments: v followed by digits only
      if (/^v\d+$/.test(seg)) continue;
      // Skip transformation segments: contain a comma or start with a known prefix
      if (
        seg.includes(",") ||
        /^(f_|q_|w_|h_|c_|e_|l_|so_|du_|fl_|r_|b_|bo_|co_|dpr_|g_|o_|p_|pg_|t_|x_|y_|z_|ar_|aspect_ratio_)/.test(seg)
      ) continue;
      foundContent = true;
    }
    publicIdParts.push(seg);
  }

  const withExt = publicIdParts.join("/");
  // Strip file extension (and any query string)
  return withExt.replace(/\.[^./?]+(\?.*)?$/, "");
}

async function callDelete(publicId, resourceType) {
  if (!publicId) throw new Error("Could not extract public_id from URL");
  if (!DELETE_URL) throw new Error("REACT_APP_CLOUDINARY_SIGN_URL not configured");

  const res = await fetch(DELETE_URL, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({
      public_id: publicId,
      resource_type: resourceType,
      api_key: API_KEY,
      cloud_name: CLOUD_NAME,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Delete failed (${res.status}): ${text}`);
  }
  return res.json(); // { result: "ok" } on success
}

export async function deleteImage(url) {
  return callDelete(extractPublicId(url), "image");
}

export async function deleteVideo(url) {
  return callDelete(extractPublicId(url), "video");
}

/**
 * Transfer an item to a different section by re-uploading under the new tag
 * then deleting the original.  Throws on failure so the caller can show an error.
 *
 * @param {string} url          - Full Cloudinary delivery URL of the original asset
 * @param {string} newSectionTag - Target Cloudinary tag (e.g. "tops" or "kid-abc-tops")
 * @param {"image"|"video"} resourceType
 * @returns {Promise<string>}   - Delivery URL of the newly-uploaded copy
 */
export async function transferItem(url, newSectionTag, resourceType = "image") {
  // 1. Fetch the original as a blob
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Could not fetch original asset (${response.status})`);
  const blob = await response.blob();

  // 2. Re-upload under the new section tag
  const uploadResult =
    resourceType === "video"
      ? await uploadVideo(blob, newSectionTag)
      : await uploadImage(blob, newSectionTag);

  if (!uploadResult?.secure_url)
    throw new Error("Re-upload to new section failed — no URL returned");

  // 3. Delete the original (requires a valid Cloudinary API key in env)
  try {
    if (resourceType === "video") await deleteVideo(url);
    else await deleteImage(url);
  } catch (deleteErr) {
    // The copy exists in the new section; the original still exists too.
    // Surface the underlying cause so the user knows the API key needs fixing.
    throw new Error(
      `Copied to "${newSectionTag}" but could not delete original: ${deleteErr.message}`,
    );
  }

  return uploadResult.secure_url;
}

// Videos by tag (requires the equivalent video list manifest enabled)
export const fetchVideosByTag = async (tag) => {
  const url = `https://res.cloudinary.com/${CLOUD_NAME}/video/list/${scopedTag(tag)}.json`;
  try {
    const response = await fetch(url, { method: "GET" });
    if (!response.ok) {
      // Same reasoning as fetchImagesByTag — a 404 just means this tag has
      // no videos yet, which is normal for most sub-sections.
      if (response.status !== 404) {
        console.error(`fetchVideosByTag("${tag}") failed: ${response.status} ${response.statusText}`);
      }
      return [];
    }
    const data = await response.json();
    const videos = (data.resources || []).map(
      (item) =>
        // deliver through streaming-friendly URL
        `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/f_auto,q_auto/v${item.version}/${item.public_id}.${item.format}`,
    );
    return videos;
  } catch (error) {
    console.error("Error fetching videos by tag:", error);
    return [];
  }
};

// Fetch all videos for a section, merging its sub-section tags — the video
// counterpart to fetchImagesForSection, same reasoning.
export const fetchVideosForSection = async (sectionTag) => {
  const tags = sectionTagsWithSubs(sectionTag);
  if (tags.length <= 1) return fetchVideosByTag(sectionTag);
  const lists = await Promise.all(tags.map((t) => fetchVideosByTag(t)));
  const seen = new Set();
  const out = [];
  for (const url of lists.flat()) {
    if (url && !seen.has(url)) { seen.add(url); out.push(url); }
  }
  return out;
};
