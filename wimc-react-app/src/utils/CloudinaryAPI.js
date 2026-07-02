import { Cloudinary } from "@cloudinary/url-gen";
import { auth } from "../firebase";
import { sectionTagsWithSubs } from "./closetSubsections";

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
  if (!res.ok) throw new Error("Failed to get upload signature");
  return res.json(); // { timestamp, signature }
}

// ===== Generic uploader (signed — API secret never leaves the server) =====
async function uploadTo(endpoint, fileOrBlob, { folder, tags } = {}) {
  // 1. Get signature from Firebase Function
  const { timestamp, signature } = await getSignature({
    upload_preset: UPLOAD_PRESET,
    ...(folder && { folder }),
    ...(tags && { tags }),
  });

  // 2. Build signed FormData
  const formData = new FormData();
  formData.append("file", fileOrBlob);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("api_key", API_KEY);
  formData.append("timestamp", timestamp);
  formData.append("signature", signature);
  if (folder) formData.append("folder", folder);
  if (tags) formData.append("tags", tags);

  const res = await fetch(endpoint, { method: "POST", body: formData });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Cloudinary upload failed: ${res.status} ${t}`);
  }
  return res.json(); // { secure_url, public_id, version, ... }
}

// ===== Upload helpers =====

export async function uploadImage(file, sectionTag = "default") {
  try {
    return await uploadTo(IMG_ENDPOINT, file, {
      folder: "closet-items",
      tags: sectionTag,
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
      tags: sectionTag,
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
      tags: "receipts",
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

  return uploadTo(RAW_ENDPOINT, blob, { folder });
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

// Primary video poster attempt (frame at 3s -> jpg appended)
export function videoPoster(url) {
  return url ? url.replace("/upload/", "/upload/so_3,du_0/") + ".jpg" : "";
}

export function safeVideoPoster(url) {
  if (!url) return "";
  const withTransform = url.replace("/upload/", "/upload/so_3,du_0/");
  return withTransform.replace(/\.(mp4|mov|webm|mkv|m4v)(\?.*)?$/i, ".jpg");
}

// Stream-friendly delivery for videos
export function videoStream(url) {
  return url?.replace("/upload/", "/upload/f_auto,q_auto/");
}

// ===== Listing by tag =====
// Images by tag (requires "Auto-create image list" in Cloudinary settings)
export const fetchImagesByTag = async (tag) => {
  const url = `https://res.cloudinary.com/${CLOUD_NAME}/image/list/${tag}.json`;
  try {
    const response = await fetch(url, { method: "GET" });
    if (!response.ok) {
      throw new Error(`Failed to fetch images by tag: ${response.statusText}`);
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
  const url = `https://res.cloudinary.com/${CLOUD_NAME}/video/list/${tag}.json`;
  try {
    const response = await fetch(url, { method: "GET" });
    if (!response.ok) {
      throw new Error(`Failed to fetch videos by tag: ${response.statusText}`);
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
