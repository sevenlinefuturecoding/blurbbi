/**
 * Blurbbi Progressive Web App Service Worker
 * Version: 1.0.0
 *
 * Implements:
 * - Cache-first for static assets (hashed JS, CSS, fonts, icons)
 * - Network-first with offline fallback for HTML navigation
 * - Network-only bypass for Supabase API, auth, and realtime channels
 * - Fast activation via skipWaiting() and clients.claim()
 */

const CACHE_VERSION = "blurbbi-v1";
const STATIC_CACHE = `blurbbi-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `blurbbi-runtime-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

const PRECACHE_ASSETS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/favicon.svg",
  "/favicon.ico",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-192.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
];

// 1. Install Event: Cache app shell essentials
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

// 2. Activate Event: Clean up outdated caches & claim clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name !== STATIC_CACHE && name !== RUNTIME_CACHE) {
              return caches.delete(name);
            }
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// 3. Fetch Event Handler
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignore non-GET requests (POST, PUT, DELETE, etc.)
  if (request.method !== "GET") {
    return;
  }

  // Bypass chrome-extension and external analytics/Supabase realtime
  if (
    url.protocol.startsWith("chrome-extension") ||
    url.hostname.includes("supabase.co") ||
    url.pathname.includes("/rest/v1/") ||
    url.pathname.includes("/realtime/")
  ) {
    return;
  }

  // A. Page Navigations: Network-first with offline.html fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          const offlineFallback = await caches.match(OFFLINE_URL);
          return (
            offlineFallback ||
            new Response("Offline - Check your internet connection.", {
              headers: { "Content-Type": "text/plain" },
            })
          );
        }),
    );
    return;
  }

  // B. Static Assets (hashed js, css, fonts, images): Cache-first
  const isStatic =
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/fonts/") ||
    url.hostname.includes("fonts.googleapis.com") ||
    url.hostname.includes("fonts.gstatic.com") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|woff2?|css|js)$/);

  if (isStatic) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          // Return cached asset immediately, update in background
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(STATIC_CACHE).then((cache) => cache.put(request, networkResponse));
              }
            })
            .catch(() => {});
          return cached;
        }

        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        });
      }),
    );
    return;
  }

  // C. Default: Network with runtime cache fallback
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
        }
        return networkResponse;
      })
      .catch(() => caches.match(request)),
  );
});

// 4. Message listener (for triggering instant updates)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

