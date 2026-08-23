const CACHE_NAME = "people-life-h5-v1";
const CORE_ASSETS = [
  "/",
  "/public/styles.css",
  "/public/app.mjs",
  "/public/manifest.webmanifest",
  "/public/vendor/phosphor/style.css",
  "/public/vendor/phosphor/Phosphor-Duotone.woff2",
  "/public/assets/icons/app-icon.svg",
  "/public/assets/game-shell/title-1978.webp",
  "/public/assets/life-stage/primary-1984-base.webp",
  "/public/assets/life-stage/character-age-atlas-v1.webp"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/", copy));
          return response;
        })
        .catch(() => caches.match("/")),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    })),
  );
});
