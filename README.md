# Fitness AI Hub v13.4.10 Today Status Mobile Fix

This full replacement frontend is rebuilt for Safari on iPhone and Add to Home Screen standalone mode.

## Replace and deploy

1. Back up the current repository.
2. Replace the web files with this package.
3. Run `supabase/schema.sql` in Supabase SQL Editor.
4. Keep your existing working Edge Functions and Garmin workflow secrets, or place their current files in the included `supabase/functions` and `python` folders.
5. Push to GitHub Pages.
6. On iPhone, delete the old Home Screen app.
7. Go to Settings > Safari > Advanced > Website Data and remove the old site data.
8. Open the deployment URL in Safari.
9. Tap Share > Add to Home Screen.
10. Launch only from the new Home Screen icon.

## iPhone-specific changes

- Uses `standalone` display rather than browser fullscreen.
- Uses `100svh` and `100dvh` without VisualViewport resize handlers.
- Respects notch, Dynamic Island and Home Indicator safe areas.
- Includes Apple touch icon and launch images for common iPhone sizes.
- Uses 16px form controls to prevent Safari input zoom.
- Keeps only the content section scrollable.
- Uses a navigation-only offline fallback so JS/CSS never receive HTML.
- Uses a new cache version to evict the previous app shell.

## Animated splash behavior

The native iOS launch image is static by platform design. The app now visually continues from that image into an animated in-app splash with logo reveal, glow pulse, moving waves, progress shimmer, status updates, and a smooth fade into the loaded screen. Reduced Motion is respected automatically.

## v13 visual redesign

This release introduces a new performance-dashboard visual system, immersive topographic hero, compact Garmin-style signal cards, redesigned activities, trends, nutrition, AI coach and profile screens, responsive glass panels, and a refined iPhone bottom navigation.

## v13.1 trends experience

Adds a performance pulse, movement and recovery KPIs, period tabs, smart insight banner, activity mix doughnut, seven-day training heatmap, animated progress bars, trend badges and a more energetic analytics presentation.

## v13.2 performance and chart details

Adds six branded performance statistics, the Fitness AI logo on every Trends statistic, rich HTML tooltips for every Chart.js chart, hover and tap inspection, unit-aware values, chart help labels, and touch-friendly detail viewing on iPhone.

## v13.3 advanced coach

Adds coach focus modes, real-time recovery/load/sleep/fuel signals, a structured daily prescription, suggested workout, day timeline, key findings, action steps, adaptive seven-day blueprint, report history and a refreshed AI request payload.

## v13.4 weekly progress and stat icons

Adds weekly progress for sessions, training minutes, step-goal days and sleep-goal days. Removes the Fitness AI logo from Trends statistic cards. Adds dedicated generated icons for Steps Today, Active Energy, Sleep and Resting Heart Rate.

## v13.4.1 loading hotfix

Fixes the startup error caused by the legacy `app.js` report renderer targeting the removed `#findings` element. The assignment is now null-safe, and the loader cleanup is guarded as well.

## v13.4.2 dedicated Coach icons

Replaces the repeated Fitness AI logo in the Recovery, Training Load, Sleep Quality and Fuel Status cards with dedicated symbolic icons designed for each signal.

## v13.4.3 dedicated Trends icons

Adds unique symbolic icons to Average Daily Steps, Training Time, Recovery Signal and Consistency without restoring the repeated Fitness AI brand logo.

## v13.4.4 Trends KPI layout hotfix

Removes the obsolete top-right decorative squares and fixes label, value, supporting text and progress-bar spacing in the four Trends KPI cards.

## v13.4.5 mobile validation

Uses a vertical content flow inside each Trends KPI on phones, retains a two-column grid on standard iPhones, reduces typography at 390px and below, and switches to one column below 340px. This prevents icon, label, value, support text and progress-bar collisions.

## v13.4.6 mobile blueprint fix

Replaces the horizontally scrolling 7-Day Blueprint cards with full-width aligned rows on standard iPhones, two columns on wider mobile screens, and strict width containment so the blueprint aligns with the other Coach panels.

## v13.4.7 floating mobile navigation

Replaces the edge-to-edge mobile tab bar with a floating rounded navigation dock inspired by the supplied sports-app reference. Includes safe-area positioning, active orange indicator, backdrop blur, shadow separation and additional content clearance.

## v13.4.8 navigation styling

Changes the active mobile navigation color from orange to blue and changes the floating dock to a white translucent glass material. The page remains subtly visible behind the dock through a controlled 68–78% white surface with strong blur.

## v13.4.9 dark glass navigation

Changes the floating navigation to a translucent dark navy glass material in dark mode while retaining the blue selected state. Page content remains subtly visible through the dock with controlled transparency, blur and saturation. Light mode retains a light frosted material.

## v13.4.10 Today Status mobile sizing

Reduces the mobile readiness ring, reserves a dedicated bottom zone inside the Home hero, constrains status text, and prevents the Today Status card from overlapping the hero controls or extending outside the visual container.

## iPhone 14: full-screen Safari / Home Screen setup

The mobile layout includes iOS safe-area spacing and a viewport-filling app shell. For the genuinely app-like, full-screen launch without Safari's address and tab bars, open the deployed site in Safari on the iPhone, tap **Share** → **Add to Home Screen**, enable **Open as Web App** if shown, then launch Fitness AI Hub from its Home Screen icon. A normal Safari tab cannot be forced by a website to hide Safari's browser controls; the Home Screen web app mode is the supported route.

After deploying updates, close the existing Home Screen app completely and reopen it. If the old layout persists, open the site once in Safari while online so the service worker can update, then relaunch the Home Screen app.


## v14.0.0 iPhone frontend rebuild

- Reworked visual system and responsive layouts across Home, Activities, Trends, Nutrition, AI Coach, Profile, sign-in and account creation.
- Retained existing HTML IDs, form IDs, data attributes and JavaScript modules to preserve existing app/data behavior. No database schema, Supabase configuration, Garmin sync, or AI/business logic was changed.
- Added an iPhone-focused presentation stylesheet and bumped the service-worker cache to force updated assets to be fetched.
- iOS Home Screen apps use standalone display and safe-area-aware layout. Safari does not permit a website to hide browser controls in a normal tab; add the site to the Home Screen and launch it from the icon for the app-like fullscreen experience.
