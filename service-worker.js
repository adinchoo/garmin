const CACHE = "fitness-ai-hub-v10.0.0-activity-intelligence";

const SHELL = [
  "./",
  "./index.html",
  "./dashboard.html",
  "./manifest.json",

  "./assets/css/app.css",
  "./assets/css/mobile-v9.css",
  "./assets/css/activity-intelligence.css",

  "./assets/js/app.js",
  "./assets/js/pwa.js",
  "./assets/js/auth.js",
  "./assets/js/config.js",
  "./assets/js/supabase.js",
  "./assets/js/charts.js",
  "./assets/js/ai.js",
  "./assets/js/nutrition.js",
  "./assets/js/dashboard.js",
  "./assets/js/activity-intelligence.js",

  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/apple-touch-icon.png"
];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));self.skipWaiting()});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))));self.clients.claim()});
self.addEventListener("fetch",event=>{if(event.request.method!=="GET")return;const url=new URL(event.request.url);if(url.origin!==location.origin)return;event.respondWith(fetch(event.request).then(response=>{if(response.ok)caches.open(CACHE).then(cache=>cache.put(event.request,response.clone()));return response}).catch(()=>caches.match(event.request).then(hit=>hit||caches.match("./index.html"))))});
