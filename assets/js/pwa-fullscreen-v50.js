// pwa-fullscreen-v50.js - Fullscreen Mobile PWA Optimization
// Handles: viewport height, pull-to-refresh prevention, pinch zoom prevention, standalone detection, wake lock, orientation
(() => {
"use strict";

const html = document.documentElement;
const body = document.body;

// Set --app-height from visualViewport for accurate fullscreen
function setAppHeight(){
  const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  html.style.setProperty('--app-height', `${vh}px`);
  // Also set for old browsers fallback
  document.documentElement.style.setProperty('--app-height-fallback', `${vh}px`);
}

setAppHeight();
window.addEventListener('resize', setAppHeight);
if(window.visualViewport){
  window.visualViewport.addEventListener('resize', setAppHeight);
  window.visualViewport.addEventListener('scroll', setAppHeight);
}
window.addEventListener('orientationchange', () => {
  setTimeout(setAppHeight, 100);
  setTimeout(setAppHeight, 500);
});

// Detect PWA display mode
function detectDisplayMode(){
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
  const isMinimalUi = window.matchMedia('(display-mode: minimal-ui)').matches;
  const isIOSStandalone = window.navigator.standalone === true;
  const isPWA = isStandalone || isFullscreen || isIOSStandalone;

  html.classList.toggle('is-pwa', isPWA);
  html.classList.toggle('is-pwa-fullscreen', isFullscreen);
  html.classList.toggle('is-pwa-standalone', isStandalone || isIOSStandalone);
  html.classList.toggle('is-pwa-minimal', isMinimalUi);
  html.classList.toggle('is-browser', !isPWA);

  // For CSS targeting
  if(isPWA){
    body.dataset.pwa = 'true';
  } else {
    delete body.dataset.pwa;
  }

  return {isPWA, isFullscreen, isStandalone: isStandalone || isIOSStandalone};
}

detectDisplayMode();
window.matchMedia('(display-mode: standalone)').addEventListener('change', detectDisplayMode);
window.matchMedia('(display-mode: fullscreen)').addEventListener('change', detectDisplayMode);
window.matchMedia('(display-mode: minimal-ui)').addEventListener('change', detectDisplayMode);

// Prevent pull-to-refresh on mobile
let startY = 0;
document.addEventListener('touchstart', e => {
  if(e.touches.length === 1){
    startY = e.touches[0].clientY;
  }
}, {passive: true});

document.addEventListener('touchmove', e => {
  const scroll = document.getElementById('scroll');
  if(!scroll) return;

  const currentY = e.touches[0].clientY;
  const diff = currentY - startY;

  // If at top of scroll and pulling down, prevent refresh
  if(scroll.scrollTop <= 0 && diff > 0){
    // Only prevent if not in a dialog or map
    const target = e.target;
    const isMap = target.closest && target.closest('#map, .leaflet-container');
    const isDialog = target.closest && target.closest('dialog');
    if(!isMap && !isDialog){
      e.preventDefault();
    }
  }
}, {passive: false});

// Prevent pinch zoom (double tap zoom is handled by viewport meta, but extra safety)
document.addEventListener('touchstart', e => {
  if(e.touches.length > 1){
    e.preventDefault();
  }
}, {passive: false});

let lastTouchEnd = 0;
document.addEventListener('touchend', e => {
  const now = Date.now();
  if(now - lastTouchEnd <= 300){
    // Double tap - prevent if not on input
    const target = e.target;
    if(!(target.matches && target.matches('input, textarea, [contenteditable]'))){
      e.preventDefault();
    }
  }
  lastTouchEnd = now;
}, {passive: false});

// Prevent context menu on long press (app-like feel) - except on inputs
document.addEventListener('contextmenu', e => {
  const target = e.target;
  if(!(target.matches && target.matches('input, textarea, img, a, [contenteditable]'))){
    // Allow context menu on images and links for usability, but prevent on app chrome
    if(target.closest && target.closest('.topbar, .bottom, .side, nav')){
      e.preventDefault();
    }
  }
});

// Keep screen awake when in PWA and viewing activity or workout
let wakeLock = null;
async function requestWakeLock(){
  if(!('wakeLock' in navigator)) return;
  try{
    if(wakeLock) return;
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  }catch(e){
    // Wake lock failed - ignore
  }
}

function releaseWakeLock(){
  if(wakeLock){
    wakeLock.release().catch(()=>{});
    wakeLock = null;
  }
}

// Request wake lock when in activity detail or map visible
const observer = new MutationObserver(() => {
  const detail = document.getElementById('detail');
  const map = document.getElementById('map');
  if((detail && detail.children.length > 0) || (map && map.offsetParent !== null)){
    requestWakeLock();
  } else {
    releaseWakeLock();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  observer.observe(document.body, {childList: true, subtree: true});
  // Also listen for visibility change
  document.addEventListener('visibilitychange', () => {
    if(document.visibilityState === 'visible'){
      const detail = document.getElementById('detail');
      if(detail && detail.children.length > 0){
        requestWakeLock();
      }
    } else {
      releaseWakeLock();
    }
  });
});

// Handle back button via history API for dialog close
window.addEventListener('popstate', e => {
  const dialogs = document.querySelectorAll('dialog[open]');
  dialogs.forEach(d => {
    try{ d.close(); }catch{}
  });
});

// PWA install prompt handling (deferred)
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  // Show custom install UI if needed
  html.classList.add('can-install');
  // Dispatch event for app.js to handle
  window.dispatchEvent(new CustomEvent('pwa-install-available', {detail: e}));
});

window.addEventListener('appinstalled', () => {
  html.classList.remove('can-install');
  html.classList.add('is-installed');
  deferredPrompt = null;
  // Track install
  try{ localStorage.setItem('pwa-installed', 'true'); }catch{}
});

// Expose for manual install trigger
window.PWA = {
  getDeferredPrompt: () => deferredPrompt,
  promptInstall: async () => {
    if(!deferredPrompt) return false;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    html.classList.remove('can-install');
    return choice && choice.outcome === 'accepted';
  },
  isPWA: () => detectDisplayMode().isPWA,
  isFullscreen: () => detectDisplayMode().isFullscreen,
  setAppHeight,
  requestWakeLock,
  releaseWakeLock
};

// iOS standalone viewport fix - hide address bar
if(/iPhone|iPad|iPod/.test(navigator.userAgent)){
  window.addEventListener('load', () => {
    setTimeout(() => window.scrollTo(0, 1), 0);
  });
}

// Prevent scrolling body, only #scroll should scroll
document.addEventListener('wheel', e => {
  const scroll = document.getElementById('scroll');
  if(!scroll) return;
  const target = e.target;
  // If wheel outside scroll container, prevent
  if(!(target.closest && target.closest('#scroll, dialog, #map'))){
    if(Math.abs(e.deltaY) > 0){
      // Allow only if scroll is at edge? Actually prevent body scroll
      if(document.body.contains(target) && !target.closest('#scroll')){
        // Do nothing, body is fixed
      }
    }
  }
}, {passive: true});

console.log('[PWA Fullscreen v50] Initialized', detectDisplayMode());
})();
