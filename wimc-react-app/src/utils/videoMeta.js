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

// Give a freshly saved video a real title instead of leaving it "Untitled"
// until the user manually renames it — never overwrites a title that's
// already there (e.g. a previous rename).
export function setVideoTitleIfMissing(videoUrl, title) {
  if (!videoUrl || !title) return;
  const meta = loadVideoMeta();
  if (meta[videoUrl]?.title) return;
  meta[videoUrl] = { ...(meta[videoUrl] || {}), title };
  saveVideoMeta(meta);
}

// ── Deleted-videos trash (30-day grace period) ──────────────────────────────
// Per-user, synced list — there's no global collection of every user's videos
// the way sharedContent works for shares, so the 30-day auto-purge is checked
// client-side (opportunistically, whenever Video Bin opens) rather than by a
// server-side scheduled function.
export const VIDEO_TRASH_KEY = "wimc_video_trash";
export const VIDEO_TRASH_DAYS = 30;

export function loadVideoTrash() {
  try {
    return JSON.parse(localStorage.getItem(VIDEO_TRASH_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveVideoTrash(list) {
  try {
    syncSetItem(VIDEO_TRASH_KEY, JSON.stringify(list));
  } catch {}
}

// Add a video to trash (does NOT touch Cloudinary — that only happens on
// permanent delete or once the 30-day window elapses).
export function trashVideo(entry) {
  const list = loadVideoTrash();
  const next = [{ ...entry, deletedAt: new Date().toISOString() }, ...list.filter((x) => x.url !== entry.url)];
  saveVideoTrash(next);
  return next;
}

// Remove a video from trash (used by both Restore and permanent-delete).
export function removeFromVideoTrash(url) {
  const next = loadVideoTrash().filter((x) => x.url !== url);
  saveVideoTrash(next);
  return next;
}

export function daysUntilPurge(deletedAt) {
  const elapsed = (Date.now() - new Date(deletedAt).getTime()) / (24 * 60 * 60 * 1000);
  return Math.max(0, Math.ceil(VIDEO_TRASH_DAYS - elapsed));
}

export function isPastPurgeWindow(deletedAt) {
  const elapsed = (Date.now() - new Date(deletedAt).getTime()) / (24 * 60 * 60 * 1000);
  return elapsed >= VIDEO_TRASH_DAYS;
}
