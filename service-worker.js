const CACHE_NAME = "fitness-ai-hub-v1";

const FILES = [
  "./",
  "./index.html",
  "./dashboard.html",
  "./manifest.json",
  "./assets/css/app.css",
  "./assets/js/app.js",
  "./assets/js/auth.js",
  "./assets/js/config.js",
  "./assets/js/dashboard.js",
  "./assets/js/supabase.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES))
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});