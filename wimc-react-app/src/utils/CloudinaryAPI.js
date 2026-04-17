import { Cloudinary } from "@cloudinary/url-gen";

// ===== Env =====
const CLOUD_NAME = process.env.REACT_APP_CLOUD_NAME;
const UPLOAD_PRESET = process.env.REACT_APP_UPLOAD_PRESET; // unsigned preset

// ===== Base endpoints =====
const IMG_ENDPOINT = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
const VID_ENDPOINT = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`;
const RAW_ENDPOINT = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`;

// Cloudinary client for AdvancedImage usage
export const cld = new Cloudinary({ cloud: { cloudName: CLOUD_NAME } });

// ===== Generic uploader (adds folder + tags when provided) =====
async function uploadTo(endpoint, fileOrBlob, { folder, tags } = {}) {
  const formData = new FormData();
  formData.append("file", fileOrBlob);
  formData.append("upload_preset", UPLOAD_PRESET);
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
