'use strict';
const CACHE_NAME = 'fitness-ai-shell-v15';
const SHELL = [
  './', './index.html', './dashboard.html', './offline.html', './manifest.json',
  './assets/css/app.css', './assets/css/ios-fullscreen.css', './assets/css/ios-redesign.css', './assets/css/ios-next.css',
  './assets/js/config.js', './assets/js/core.js', './assets/js/splash.js', './assets/js/pwa.js', './assets/js/supabase.js',
  './assets/js/auth.js', './assets/js/nutrition.js', './assets/js/app.js', './assets/js/ui-v13.js', './assets/js/trends-v13.js', './assets/js/coach-v13.js',
  './assets/icons/icon-192.png', './assets/icons/icon-512.png', './assets/icons/apple-touch-icon.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('fitness-ai-shell-') && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/rest/v1/') || url.pathname.includes('/auth/v1/') || url.pathname.includes('/functions/v1/')) return;
  event.respondWith(fetch(req).then(response => {
    if (response && response.ok && (req.mode === 'navigate' || /\.(?:html|css|js|json|png|svg|webp|woff2?)$/i.test(url.pathname))) {
      const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
    }
    return response;
  }).catch(() => caches.match(req).then(cached => cached || (req.mode === 'navigate' ? caches.match('./offline.html') : Response.error()))));
});
