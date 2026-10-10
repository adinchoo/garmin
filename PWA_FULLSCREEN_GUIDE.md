# PWA Fullscreen Mobile Optimization v50

## What Changed

### Manifest
- display: fullscreen (true immersive, no browser UI)
- display_override: fullscreen, standalone, minimal-ui
- orientation: any (allow rotation, but portrait preferred)
- categories: fitness, health, lifestyle
- launch_handler: navigate-existing
- shortcuts: Today, Log Meal, Activities
- icons: any + maskable for adaptive icons

### HTML Meta
- viewport: width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no, minimal-ui, interactive-widget=resizes-content
- full-screen, x5-fullscreen, 360-fullscreen, x5-page-mode, browsermode, apple-touch-fullscreen
- apple-mobile-web-app-capable, black-translucent, mobile-web-app-capable
- msapplication-TileColor, navbutton-color

### CSS pwa-fullscreen-mobile-v50.css
- --sat/sar/sab/sal env(safe-area-inset-*)
- --app-height using 100dvh, 100svh, 100vh fallback, visualViewport JS
- html height 100dvh, overflow hidden, overscroll-behavior none
- body position fixed inset 0, height 100dvh, touch-action manipulation, -webkit-tap-highlight transparent
- .app flex column, padding safe areas
- .topbar sticky top, height calc(56px + sat), backdrop blur 20px
- #scroll flex 1 overflow-y auto, overscroll-behavior-y contain, -webkit-overflow-scrolling touch, scrollbar hidden on mobile
- .bottom fixed bottom 0, height calc(64px + sab), backdrop blur 24px, safe area padding
- [data-view] min-height calc(app-height - topbar - nav), padding-bottom nav
- #appSplash fixed inset 0 100vw 100dvh z-index 9999
- dialog fullscreen on mobile (100vw 100dvh, bottom sheet style)
- iOS install banner fixed bottom nav-height +12px
- Prevent zoom: input font-size 16px on mobile
- Touch target 44px min
- Landscape handling: nav 48px + sab
- Reduced motion, high contrast
- is-pwa-fullscreen class
- Leaflet map touch-action pan-x pan-y
- 100dvh fallback via @supports not

### JS pwa-fullscreen-v50.js
- setAppHeight() from visualViewport.height, updates --app-height, listens resize, visualViewport resize/scroll, orientationchange
- detectDisplayMode() via matchMedia display-mode fullscreen/standalone/minimal-ui + navigator.standalone, toggles html classes is-pwa, is-pwa-fullscreen, etc.
- Prevent pull-to-refresh: touchstart track startY, touchmove prevent if scrollTop <=0 and diff>0 and not map/dialog
- Prevent pinch zoom: touchstart touches.length>1 prevent, touchend double tap 300ms prevent
- Prevent context menu on topbar/bottom/side/nav
- Wake Lock API: request when detail/map visible, release otherwise, via MutationObserver
- Back button: popstate closes dialogs
- beforeinstallprompt deferred, can-install class, pwa-install-available event, appinstalled tracking
- Expose window.PWA API: getDeferredPrompt, promptInstall, isPWA, isFullscreen, setAppHeight, requestWakeLock
- iOS hide address bar: scrollTo(0,1) on load
- Prevent body scroll wheel outside #scroll

## Testing

- Install PWA on Android Chrome: should be fullscreen no browser UI, status bar #08111f
- Install on iOS Safari Add to Home Screen: should be fullscreen black-translucent, safe areas respected
- Pull down at top: should NOT refresh
- Pinch zoom: should NOT zoom
- Rotate: topbar/bottom nav adjust
- Dialog: should be bottom sheet on mobile with safe area
- Map: pan-x pan-y works

## Known Limitations

- iOS Safari does not support display: fullscreen, falls back to standalone (still immersive but status bar visible)
- Wake Lock only works in secure context and may be released on visibility change
- 100dvh not supported on old browsers, falls back to 100vh
