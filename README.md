# adinchoo/garmin - Full Package with iPhone Fullscreen Fix

This is the full repository package with original filenames preserved.

## What was fixed for iPhone 14 edge-to-edge:

### index.html & dashboard.html
- Viewport: `width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no`
- Added: `apple-mobile-web-app-capable=yes`
- Added: `apple-mobile-web-app-status-bar-style=black-translucent`
- CSS: html/body reset margin/padding 0, width/height 100%, 100dvh
- .app: position:fixed, inset:0, min-height 100dvh, env(safe-area-inset-*)
- overflow:hidden on body, internal scroll on .main
- bottom-nav respects env(safe-area-inset-bottom)

### Other files (original like):
- css/style.css (full CSS extracted + fix)
- js/app.js (original logic preserved)
- js/dashboard.js (original logic preserved)
- manifest.json (display: fullscreen)
- sw.js (PWA service worker)
- icons/ (place your 192 & 512 pngs)

All colors (#08111f), nav, bindings preserved.
Desktop behavior unchanged.

## Install
Copy all files to your repo root, overwriting.
