// BookMeBadminton Progressive Web App Service Worker
// Cache Versioning
const CACHE_NAME = "bmb-static-v2";
const OFFLINE_URL = "/offline";

const PRECACHE_ASSETS = [
  "/",
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/icon-maskable-192x192.png",
  "/icons/icon-maskable-512x512.png",
  "/icons/apple-touch-icon.png",
  "/logo.png",
  "/court_image/c1.jpeg",
  "/court_image/c2.jpeg",
];

// Install Event: pre-cache critical app shell & offline fallback
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        return self.skipWaiting();
      })
      .catch((err) => {
        console.warn("[SW] Pre-caching encountered an issue:", err);
      })
  );
});

// Activate Event: purge outdated caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// Fetch Event: Conservative, security-first caching
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Never intercept or cache non-GET requests (POST, PUT, DELETE)
  if (request.method !== "GET") {
    return;
  }

  // 2. Never cache ANY /api/ requests:
  // Live availability, booking creation, payments, matches, notifications must always be live.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({
            success: false,
            code: "OFFLINE",
            message: "You are currently offline. Live court availability and booking operations require an active network connection.",
          }),
          {
            status: 503,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
            },
          }
        );
      })
    );
    return;
  }

  // 3. Navigation requests (HTML pages): Network-first with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // If offline, try cache first, then fallback to /offline
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          const offlinePage = await caches.match(OFFLINE_URL);
          return offlinePage || Response.error();
        })
    );
    return;
  }

  // 4. Static assets (images, fonts, scripts, stylesheets): Stale-While-Revalidate or Cache-First
  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/court_image/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".woff2");

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached, but revalidate in background
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, networkResponse);
                });
              }
            })
            .catch(() => {
              // Ignore background fetch failure when offline
            });
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 5. Default fallback to standard fetch
  event.respondWith(fetch(request));
});
