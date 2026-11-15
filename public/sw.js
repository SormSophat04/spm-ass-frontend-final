const CACHE_NAME = "acadcoord-student-pwa-v2";
const PRECACHE_URLS = [
  "/attendance",
  "/quizzes",
  "/lifecycle",
  "/leaves",
  "/notes",
  "/login",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {
        // Ignore individual precache misses during dev builds
      });
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
            return Promise.resolve();
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Bypass cache for live APIs, uploaded files, SSE streams, and Next.js HMR sockets
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/uploads/") ||
    url.pathname.includes("webpack-hmr") ||
    request.headers.get("accept")?.includes("text/event-stream")
  ) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === "basic"
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (request.mode === "navigate") {
            return caches.match("/attendance");
          }
          return new Response("Offline — Reconnecting to campus network...", {
            status: 503,
            headers: { "Content-Type": "text/plain" },
          });
        });
      })
  );
});
