self.addEventListener('install', event => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('fitness-ai-shell-')&&k!=='fitness-ai-shell-v40').map(k=>caches.delete(k)));await self.clients.claim()})()));
