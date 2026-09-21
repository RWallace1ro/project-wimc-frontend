// Detects that a NEWER version of the site has been published while the app is
// still open, so the update bar can offer a refresh.
//
// Why this exists alongside the service-worker banner: the service worker is
// what normally notices a new deploy, but iPhone's app wrapper (WKWebView)
// doesn't support service workers, so inside the App Store app that detector
// never runs — fixes only appeared after the user force-quit the app.
//
// How it works with no service worker: every build's main script has a name
// containing a content hash (static/js/main.<hash>.js). The running page knows
// its own hash; a freshly fetched index.html reveals the newest one. If they
// differ, a newer deploy is live.

const MAIN_SCRIPT_RE = /static\/js\/main\.([A-Za-z0-9]+)\.js/;

/** main.<hash>.js → "<hash>" from a chunk of HTML (or a script URL). */
export function extractMainHash(text) {
  const m = MAIN_SCRIPT_RE.exec(text || "");
  return m ? m[1] : null;
}

/** The hash of the bundle THIS page is running, or null (dev server etc.). */
export function runningMainHash(doc) {
  for (const s of Array.from(doc.scripts || [])) {
    const h = extractMainHash(s.src);
    if (h) return h;
  }
  return null;
}

/** Only "outdated" when both sides are known and differ — never guess. */
export function isOutdated(running, latest) {
  return Boolean(running) && Boolean(latest) && running !== latest;
}

/** Newest deployed main-bundle hash, read from a cache-busted index.html. */
export async function fetchLatestMainHash({ fetchImpl, base }) {
  const res = await fetchImpl(`${base}/index.html?_v=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) return null;
  return extractMainHash(await res.text());
}

/**
 * Reload, but bypass the HTTP cache. GitHub Pages lets browsers cache
 * index.html for 10 minutes, so a plain reload() can hand back the OLD page
 * and the update bar would immediately reappear. A unique query string forces
 * a fresh fetch. (index.js strips the parameter again on startup.)
 */
export function reloadFresh(win) {
  try {
    const u = new URL(win.location.href);
    u.searchParams.set("_r", String(Date.now()));
    win.location.replace(u.toString());
  } catch {
    win.location.reload();
  }
}

/** Remove the cache-busting parameter so URLs stay tidy / shareable. */
export function stripRefreshParam(win) {
  try {
    const u = new URL(win.location.href);
    if (!u.searchParams.has("_r")) return;
    u.searchParams.delete("_r");
    win.history.replaceState(null, "", u.pathname + u.search + u.hash);
  } catch { /* cosmetic only */ }
}

/**
 * Start watching. Checks shortly after load, whenever the app returns to the
 * foreground (the common case on iPhone, where apps are suspended rather than
 * reloaded), when the network comes back, and on a slow interval. Stops after
 * the first positive result. Returns { stop, check } (check is exposed for
 * tests).
 */
export function startVersionWatch({
  onOutdated,
  win,
  fetchImpl,
  base = "",
  minGapMs = 60 * 1000,
  intervalMs = 5 * 60 * 1000,
  startupDelayMs = 5000,
}) {
  const running = runningMainHash(win.document);
  if (!running) return { stop() {}, check: async () => false }; // nothing to compare against

  let done = false;
  let inflight = false;
  let last = 0;
  let timer = null;
  let startup = null;

  const stop = () => {
    done = true;
    win.document.removeEventListener("visibilitychange", onVisible);
    win.removeEventListener("pageshow", check);
    win.removeEventListener("online", check);
    win.removeEventListener("focus", check);
    if (timer) win.clearInterval(timer);
    if (startup) win.clearTimeout(startup);
  };

  async function check() {
    if (done || inflight) return false;
    const now = Date.now();
    if (now - last < minGapMs) return false; // don't hammer on rapid focus flips
    last = now;
    inflight = true;
    try {
      const latest = await fetchLatestMainHash({ fetchImpl, base });
      if (isOutdated(running, latest)) {
        stop();
        onOutdated(latest);
        return true;
      }
    } catch {
      /* offline or transient — try again on the next trigger */
    } finally {
      inflight = false;
    }
    return false;
  }

  function onVisible() {
    if (win.document.visibilityState === "visible") check();
  }

  win.document.addEventListener("visibilitychange", onVisible);
  win.addEventListener("pageshow", check);
  win.addEventListener("online", check);
  win.addEventListener("focus", check);
  timer = win.setInterval(check, intervalMs);
  startup = win.setTimeout(check, startupDelayMs);

  return { stop, check };
}
