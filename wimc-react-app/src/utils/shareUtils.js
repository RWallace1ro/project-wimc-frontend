import { db, auth } from '../firebase';
import { collection, addDoc, getDoc, doc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { syncSetItem } from './syncStore';

/** Stable app base URL (origin + PUBLIC_URL), independent of the current route.
 *  Produces e.g. https://rwallace1ro.github.io/project-wimc-frontend
 *  We use a real path (/shared), NOT a #hash, so BrowserRouter matches it and
 *  the GitHub Pages 404 SPA-redirect can restore the deep link for non-app users. */
function appBase() {
  const { origin } = window.location;
  const pub = process.env.PUBLIC_URL || "";
  return `${origin}${pub}`.replace(/\/+$/, '');
}

// ── View-only link (Cloudinary JSON → encoded app URL) ─────────────────────────
export function appShareUrl(cloudinaryUrl, type) {
  const encoded = btoa(cloudinaryUrl);
  return `${appBase()}/shared?src=${encodeURIComponent(encoded)}&type=${encodeURIComponent(type)}`;
}
export function decodeShareSrc(encoded) {
  try { return atob(decodeURIComponent(encoded)); } catch { return null; }
}

// ── Collaborative (editable) Firestore doc ─────────────────────────────────────
export async function createCollabDoc(type, data) {
  try {
    const ref = await addDoc(collection(db, 'sharedContent'), {
      type,
      data,
      ownerId: auth.currentUser?.uid ?? null,
      ownerName: auth.currentUser?.displayName ?? 'WIMC User',
      createdAt: new Date().toISOString(),
      anyoneCanEdit: true,
      checkedItems: {},
      comments: {},
    });
    return `${appBase()}/shared?collab=${ref.id}&type=${encodeURIComponent(type)}`;
  } catch (e) {
    // Callers mostly show a generic "Export failed" message — log the real
    // Firestore error here (e.g. a rules rejection, or an oversized/undefined
    // field in `data`) so it's still visible in DevTools console.
    console.error(`createCollabDoc(${type}) failed:`, e);
    throw e;
  }
}
export async function getCollabDoc(id) {
  try {
    const snap = await getDoc(doc(db, 'sharedContent', id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch { return null; }
}
export async function toggleCollabItem(docId, key, value) {
  try {
    await updateDoc(doc(db, 'sharedContent', docId), { [`checkedItems.${key}`]: value });
  } catch {}
}

// Save (or clear) a per-item note/suggestion left by a recipient with edit
// access. Stored as { text, ts } so the owner can see when it was left.
export async function setCollabComment(docId, key, text) {
  try {
    const trimmed = (text || "").trim().slice(0, 280);
    await updateDoc(doc(db, 'sharedContent', docId), {
      [`comments.${key}`]: trimmed
        ? { text: trimmed, ts: new Date().toISOString() }
        : null,
    });
  } catch (e) {
    console.error("setCollabComment failed:", e);
  }
}

// ── My Shares (owner-side list + unread-comment tracking) ──────────────────────
// Query without orderBy to avoid needing a Firestore composite index — sort
// client-side instead (same approach used by the account-deletion finalizer).
export async function listMyShares(uid) {
  if (!uid) return [];
  try {
    const q = query(collection(db, 'sharedContent'), where('ownerId', '==', uid));
    const snap = await getDocs(q);
    const shares = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    shares.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return shares;
  } catch (e) {
    console.error('listMyShares failed:', e);
    return [];
  }
}

// Most recent comment timestamp on a share, or null if it has none.
export function getLastCommentAt(share) {
  const comments = share?.comments || {};
  let max = null;
  for (const v of Object.values(comments)) {
    if (v?.ts && (!max || v.ts > max)) max = v.ts;
  }
  return max;
}

// "Last viewed by the owner" is tracked in the owner's own synced storage
// (not on the public sharedContent doc) — it's private to the owner and this
// way needs no extra Firestore permission for writing to someone else-visible
// data.
const SHARE_VIEWED_PREFIX = 'wimc_share_viewed_';
export function markShareViewed(shareId) {
  try { syncSetItem(SHARE_VIEWED_PREFIX + shareId, new Date().toISOString()); } catch {}
}
export function getShareViewedAt(shareId) {
  try { return localStorage.getItem(SHARE_VIEWED_PREFIX + shareId); } catch { return null; }
}

// Count of the owner's shares that have a comment newer than the owner last
// viewed that share — used for the header notification badge.
export function countUnreadShares(shares) {
  return shares.reduce((n, s) => {
    const lastComment = getLastCommentAt(s);
    if (!lastComment) return n;
    const viewedAt = getShareViewedAt(s.id);
    return !viewedAt || lastComment > viewedAt ? n + 1 : n;
  }, 0);
}

// ── Web Share API — share a clothing image as a real file ─────────────────────
export async function shareItemImage(imageUrl, opts = {}) {
  const { title = 'My Closet Item', text = 'From my WIMC closet 👗' } = opts;
  if (!imageUrl) return 'no-url';
  if (typeof navigator.canShare === 'function') {
    try {
      const resp = await fetch(imageUrl, { mode: 'cors' });
      const blob = await resp.blob();
      const ext  = blob.type.includes('png') ? 'png' : 'jpg';
      const file = new File([blob], `wimc-item.${ext}`, { type: blob.type || 'image/jpeg' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title, text });
        return 'shared-file';
      }
    } catch (e) { if (e?.name === 'AbortError') return 'aborted'; }
  }
  if (navigator.share) {
    try { await navigator.share({ title, text, url: imageUrl }); return 'shared-url'; }
    catch (e) { if (e?.name === 'AbortError') return 'aborted'; }
  }
  try { await navigator.clipboard.writeText(imageUrl); return 'clipboard'; } catch {}
  return 'unsupported';
}

// ── Web Share API — share an app link ─────────────────────────────────────────
export async function shareAppLink({ title, text, url }) {
  if (navigator.share) {
    try { await navigator.share({ title, text, url }); return 'shared'; }
    catch (e) { if (e?.name === 'AbortError') return 'aborted'; }
  }
  try { await navigator.clipboard.writeText(url); return 'clipboard'; } catch {}
  return 'unsupported';
}

// ── SMS / text-message deep-link ─────────────────────────────────────────────
// Returns an sms: URI that pre-fills a new text message.
// Works on iOS (iMessage), Android (Messages), and macOS (Continuity).
export function smsShareUrl(url, text = '') {
  const body = text ? `${text}
${url}` : url;
  return `sms:?body=${encodeURIComponent(body)}`;
}