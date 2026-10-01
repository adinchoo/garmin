const CACHE_NAME = "fitness-ai-hub-v3.0";
const APP_SHELL = ["./", "./index.html", "./dashboard.html", "./manifest.json", "./assets/css/app.css", "./assets/js/app.js", "./assets/js/auth.js", "./assets/js/config.js", "./assets/js/supabase.js", "./assets/js/charts.js", "./assets/js/ai.js", "./assets/js/nutrition.js", "./assets/js/dashboard.js"];
self.addEventListener("install", event => { event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))); self.skipWaiting(); });
self.addEventListener("activate", event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))); self.clients.claim(); });
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(response => { const copy=response.clone(); caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy)); return response; }).catch(()=>caches.match(event.request).then(r=>r||caches.match("./index.html"))));
});
