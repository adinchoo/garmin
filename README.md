# Fitness AI Hub v8.0 Fullscreen PWA

Rebuilt from v7.0 to support TRUE fullscreen PWA.

## What's new for fullscreen
- **manifest.json**: `display: fullscreen` + `display_override: [fullscreen, standalone, minimal-ui]` + `orientation: any` + launch_handler
- **index.html & dashboard.html**: Added `mobile-web-app-capable`, `apple-touch-fullscreen`, `screen-orientation` meta, and fullscreen fab button
- **assets/js/pwa.js** (NEW): Handles --vh / --app-height, standalone detection, Fullscreen API (requestFullscreen with navigationUI:hide), orientation lock, wake lock, beforeinstallprompt, iOS standalone quirks
- **assets/css/app.css**: Uses `var(--app-height)` + `100dvh` + `100svh` + `-webkit-fill-available`, adds `:fullscreen` styles, `.fs-fab` floating button that auto-hides in PWA mode, fixes 100% height for body.dashboard-page in all modes
- **assets/js/app.js**: Adds F key toggle, fsButton / fsFab listeners
- **service-worker.js**: Bump to `fitness-ai-hub-v8.0.0-fullscreen` and includes pwa.js

## Fullscreen behavior
- **Android Chrome PWA**: When installed, launches edge-to-edge, no URL bar, hides system nav with display:fullscreen
- **iOS Safari PWA**: Uses black-translucent + viewport-fit=cover + safe-area insets, still fills screen
- **Browser fallback**: Press ⛶ button in top bar or floating bottom-right, or press F key to enter browser Fullscreen API. Automatically locks orientation if supported.

## Deploy
1. Replace all files (keep your assets/icons/ folder)
2. Commit + push
3. On device: uninstall old PWA, clear site data, open once in Safari/Chrome, then Add to Home Screen again
4. New cache is `fitness-ai-hub-v8.0.0-fullscreen`

## How to test
- Chrome DevTools > Application > Manifest > check display:fullscreen
- Lighthouse PWA audit should still pass
- On phone installed PWA, you should NOT see browser address bar. The app should extend under notch/home indicator and respect env(safe-area-inset-*)
