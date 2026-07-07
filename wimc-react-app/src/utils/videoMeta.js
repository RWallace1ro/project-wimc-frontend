/**
 * videoMeta — shared per-video metadata store (title, added date, and the
 * closet item that was tried on when the video was recorded/uploaded).
 *
 * Shared between TryOnStudio (writes refImage at upload time) and VideoBin
 * (reads everything to render titles/dates and pick a thumbnail).
 */
import { syncSetItem } from "./syncStore";

export const VIDEO_META_KEY = "wimc_video_meta";

export function loadVideoMeta() {
  try {
    return JSON.parse(localStorage.getItem(VIDEO_META_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveVideoMeta(meta) {
  try {
    syncSetItem(VIDEO_META_KEY, JSON.stringify(meta));
  } catch {}
}

// Record which closet item (if any) was being tried on when a video was
// recorded/uploaded — lets Video Bin show that item's photo as the video's
// thumbnail instead of an auto-extracted (and sometimes blank/odd) video frame.
export function setVideoRefImage(videoUrl, refImage) {
  if (!videoUrl || !refImage) return;
  const meta = loadVideoMeta();
  meta[videoUrl] = { ...(meta[videoUrl] || {}), refImage };
  saveVideoMeta(meta);
}
