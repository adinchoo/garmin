'use strict';
const CACHE_NAME = 'fitness-ai-shell-v16';
const SHELL = [
  './index.html', './dashboard.html', './offline.html', './manifest.json',
  './assets/css/app.css', './assets/css/ios-fullscreen.css', './assets/css/ios-redesign.css', './assets/css/ios-next.css',
  './assets/js/config.js', './assets/js/core.js', './assets/js/splash.js', './assets/js/pwa.js', './assets/js/supabase.js',
  './assets/js/auth.js', './assets/js/nutrition.js', './assets/js/app.js', './assets/js/ui-v13.js', './assets/js/trends-v13.js', './assets/js/coach-v13.js',
  './assets/icons/icon-192.png', './assets/icons/icon-512.png', './assets/icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // A single optional shell asset should not prevent the entire PWA update from installing.
    await Promise.all(SHELL.map(async path => {
      try {
        const absolute = new URL(path, self.registration.scope).href;
        const response = await fetch(absolute, { cache: 'reload' });
        if (response.ok) await cache.put(absolute, response);
      } catch (error) {
        // Keep installing; the navigation fallback remains available when cached.
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('fitness-ai-shell-') && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Keep authenticated Supabase requests out of the app shell cache.
  if (/\/(?:rest|auth|functions)\/v1\//.test(url.pathname)) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response && response.ok && (request.mode === 'navigate' || /\.(?:html|css|js|json|png|svg|webp|woff2?)$/i.test(url.pathname))) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {}));
      }
      return response;
    } catch (error) {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (request.mode === 'navigate') {
        const offline = await caches.match(new URL('./offline.html', self.registration.scope).href);
        if (offline) return offline;
      }
      return new Response('', { status: 503, statusText: 'Offline' });
    }
  })());
});
