// mhs.alumni offline helper (service worker). Hand-written, no libraries.
// - App files (scripts, styles, fonts, icons) are kept after first use, so the app opens fast.
// - Pages are fetched fresh when online; a copy of recently opened pages is kept for when the
//   phone is offline. Pages with private or restricted details, admin pages and forms are never kept.
// - Offline and not saved: a friendly "You're offline" page.
// - Signing out clears the saved pages (see the sign-out route and sw-register.tsx).

const VERSION = "v1";
const STATIC = `mhs-static-${VERSION}`;
const PAGES = `mhs-pages-${VERSION}`;
const OFFLINE_URL = "/offline";
const MAX_PAGES = 40;
const MAX_FILES = 200;

// Never saved: admin, sign-in and sign-out, forms that send things, and pages holding
// restricted details (profile with next of kin, cases for support).
const NEVER_SAVE = [/^\/admin/, /^\/auth/, /^\/login/, /^\/join/, /^\/api/, /^\/pledge/, /^\/give/, /^\/track/, /^\/app\/profile/, /^\/app\/support/, /^\/app\/terminate/, /^\/app\/confirm/];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC).then((c) => c.addAll([OFFLINE_URL, "/icons/icon-192.png"])).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("mhs-") && k !== STATIC && k !== PAGES).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "clear-pages") event.waitUntil(caches.delete(PAGES));
});

// Keep only the newest entries (old app files pile up after each update otherwise).
async function trim(cache, max) {
  const keys = (await cache.keys()).filter((k) => new URL(k.url).pathname !== OFFLINE_URL);
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function page(request, url) {
  const save = !NEVER_SAVE.some((r) => r.test(url.pathname));
  try {
    const response = await fetch(request);
    if (save && response.ok && response.type === "basic" && !response.redirected) {
      const cache = await caches.open(PAGES);
      await cache.delete(url.pathname);
      await cache.put(url.pathname, response.clone());
      trim(cache, MAX_PAGES);
    }
    return response;
  } catch {
    const saved = save ? await caches.match(url.pathname, { cacheName: PAGES }) : undefined;
    return saved ?? (await caches.match(OFFLINE_URL, { cacheName: STATIC })) ?? Response.error();
  }
}

async function appFile(request) {
  const hit = await caches.match(request, { cacheName: STATIC });
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    const cache = await caches.open(STATIC);
    await cache.put(request, response.clone());
    trim(cache, MAX_FILES);
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") return event.respondWith(page(request, url));
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/brand/")) {
    return event.respondWith(appFile(request));
  }
  // Everything else (data for in-app page changes, images, server actions) goes to the network as usual.
});
