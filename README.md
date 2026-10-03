# Fitness AI — iPhone Edition v17.0.0

A presentation-layer rebuild of the existing Fitness AI Hub frontend. The existing DOM hooks, JavaScript feature modules, Supabase integration, Garmin data logic, nutrition workflow, AI coach, and database schema have been retained.

## Deploy

1. Back up the currently deployed site and its environment/configuration.
2. Upload the contents of the `rebuild/` folder to the same website root (not the outer ZIP folder).
3. Do not overwrite your Supabase project settings, secrets, Edge Functions, or scheduled Garmin workflow configuration unless you intend to update those separately.
4. Deploy over HTTPS. Service workers and Home Screen web apps require a secure context (localhost is the development exception).
5. Open the deployed URL in Safari on iPhone. If the link opened in an app's built-in browser, use its menu to open the page in Safari first.
6. In Safari, tap **Share → Add to Home Screen**. If iOS offers **Open as Web App**, enable it. Launch from the new Home Screen icon.
7. If a previous version was installed, remove the old Home Screen icon and add it again after deploying this version. Open the site once in Safari while online to allow the new service worker to update.

## What changed in v16

- Fixed meal saving when the deployed Supabase `meals` table does not expose the optional analysis-summary column: the frontend tries supported summary-column names and falls back to saving core nutrition fields without the optional notes field.
- Removed the post-save full page reload; successful meal saves trigger a dashboard data refresh.
- Fixed coach report history loading only one report; the dashboard now requests the latest five.
- Fixed the dashboard AI report renderer targeting a non-existent `#findings` element.
- Prevented an unrelated or stale `data-id` click target from opening an undefined activity.
- Avoided displaying a default 70% readiness score when no health/recovery signals are available.
- Added missing left/right iOS safe-area CSS variables.
- Hardened service-worker installation so one optional shell resource failing does not prevent the PWA update from installing; cache writes are tied to fetch lifecycle events and API traffic remains uncached.
- Updated PWA cache and launch version identifiers to v16.

## Earlier v15 design changes

- New warm botanical design system with redesigned cards, typography, spacing, surfaces, buttons and status treatments.
- Rebuilt mobile home hero into a compact information-first layout so readiness and key metrics appear sooner.
- Redesigned fixed bottom navigation with iOS safe-area handling and clearer active states.
- Consistent treatment across Activities, Trends, Nutrition, AI Coach, Profile and authentication pages.
- Full-height app shell uses `100dvh`, safe-area insets, a single independently scrolling content region, and fixed navigation.
- Updated PWA manifest and cache version; added a same-origin network-first service worker with cache fallback and an offline navigation fallback.
- Added an iPhone installation reminder when the site is opened in a regular browser.

## Important fullscreen limitation

A website cannot hide Safari's address bar or the browser's own toolbar while running in a regular Safari tab or an in-app browser. `display: standalone` applies only after the site is installed and launched as a Home Screen web app. iOS still owns the status bar and some system UI; a web app cannot promise a native-app-style zero-chrome screen in every situation.

## Validation performed

- JavaScript syntax checked with Node.js.
- HTML parsed; no duplicate IDs found in `index.html` or `dashboard.html`.
- Local asset references in those pages resolved.
- PWA manifest parsed as valid JSON.
- Every local asset in the service-worker shell list exists.
- ZIP integrity checked after packaging.

These are static checks, not a guarantee of zero runtime errors. The live Supabase schema, authentication, Garmin sync jobs, AI Edge Functions, and real-device rendering still require a deployment smoke test.
