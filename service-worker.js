const CACHE="fitness-ai-hub-v8.2.0-iphone14-flush";
const SHELL=[
  "./","./index.html","./dashboard.html","./manifest.json",
  "./assets/css/app.css",
  "./assets/js/app.js","./assets/js/pwa.js","./assets/js/auth.js","./assets/js/config.js","./assets/js/supabase.js","./assets/js/charts.js","./assets/js/ai.js","./assets/js/nutrition.js","./assets/js/dashboard.js",
  "./assets/icons/icon-192.png","./assets/icons/icon-512.png","./assets/icons/apple-touch-icon.png"
];
self.addEventListener("install",e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL).catch(()=>c.addAll(SHELL.filter(u=>!u.includes('icons'))))));
  self.skipWaiting()
});
self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))));
  self.clients.claim()
});
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET"||new URL(e.request.url).origin!==location.origin)return;
  e.respondWith(
    fetch(e.request).then(r=>{
      if(r.ok){
        const copy=r.clone();
        caches.open(CACHE).then(c=>c.put(e.request,copy))
      }
      return r
    }).catch(()=>caches.match(e.request).then(r=>r||caches.match("./dashboard.html")))
  )
});
