/**
 * WIMC Service Worker
 *
 * Caching strategy:
 *  - Hashed static assets (/static/js, /static/css, /static/media)
 *      → Cache-First: filenames contain a content hash that changes on every
 *        new build, so stale entries are never served for new code.
 *  - App shell / HTML (index.html, bare app routes)
 *      → Network-First with offline fallback: always fetches fresh HTML after
 *        a deploy; falls back to cached shell when offline.
 *  - External APIs (Firebase, Cloudinary, Sentry, etc.)
 *      → Network-Only: never cache dynamic API responses.
 *
 * Self-activates immediately (skipWaiting + clients.claim) so new deploys
 * take effect on the very next navigation without requiring a tab close.
 */

const CACHE_VERSION = "wimc-v1";
const SHELL_CACHE   = `${CACHE_VERSION}-shell`;
const ASSET_CACHE   = `${CACHE_VERSION}-assets`;

const APP_BASE = "/project-wimc-frontend";

// External origins we should never cache
const NETWORK_ONLY_ORIGINS = [
  "firestore.googleapis.com",
  "firebase.googleapis.com",
  "identitytoolkit.googleapis.com",
  "securetoken.googleapis.com",
  "cloudfunctions.net",
  "res.cloudinary.com",
  "api.cloudinary.com",
  "widget.cloudinary.com",
  "ingest.sentry.io",
  "openweathermap.org",
];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    // Pre-cache the app shell (index.html)
    caches.open(SHELL_CACHE).then((cache) =>
      cache.add(APP_BASE + "/")
    ).catch(() => {
      // If pre-caching fails (e.g. offline install), that's fine — we'll cache
      // on first navigation.
    })
  );
  // Activate immediately — don't wait for old tabs to close
  self.skipWaiting();
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("wimc-") && k !== SHELL_CACHE && k !== ASSET_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  // Take control of all open tabs immediately
  self.clients.claim();
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== "GET") return;

  // Network-only for external API origins
  if (NETWORK_ONLY_ORIGINS.some((origin) => url.hostname.includes(origin))) {
    return; // Let the browser handle it normally
  }

  // Network-only for chrome-extension or non-http(s) schemes
  if (!url.protocol.startsWith("http")) return;

  // ── Hashed static assets → Cache-First ──────────────────────────────────
  if (url.pathname.match(/\/static\/(js|css|media)\//)) {
    event.respondWith(
      caches.open(ASSET_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            if (response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          });
        })
      )
    );
    return;
  }

  // ── App shell + same-origin routes → Network-First ──────────────────────
  if (url.origin === self.location.origin && url.pathname.startsWith(APP_BASE)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          // Offline fallback: serve cached shell, or cached page if available
          caches.match(request).then(
            (cached) => cached || caches.match(APP_BASE + "/")
          )
        )
    );
    return;
  }
});
