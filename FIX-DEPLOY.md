# Fitness AI Hub v40 — Fix notes

## Deploy frontend
1. Replace the hosted repository contents with this folder's contents (keep the `garmin-main` files at the repository root for GitHub Pages project hosting).
2. Wait for GitHub Pages to finish deploying. Open the site once in Safari/Chrome. If an old screen remains, clear site data/remove and re-add the Home Screen shortcut.

## Deploy the meal-analysis backend (required for photo AI)
A browser-side ZIP cannot deploy a Supabase Edge Function. HTTP 404 from `/functions/v1/analyze-meal` means that function is not available at the configured project endpoint (or the configured project URL is wrong). From a terminal with Supabase CLI authenticated and this project linked, run:

```sh
supabase functions deploy analyze-meal --project-ref jxvwneujgriufbezwjuf
supabase secrets set GEMINI_API_KEY=YOUR_GEMINI_API_KEY --project-ref jxvwneujgriufbezwjuf
```

The function also expects the `meal-photos` Storage bucket and the columns/tables referenced in `supabase/functions/analyze-meal/index.ts` (`meals`, `meal_items`, including the AI/photo fields). Review and apply the matching schema before using photo analysis. Do not put the Gemini key in frontend JavaScript.

## What changed
- Consolidated scroll behavior into a single independently scrollable content area for desktop and mobile.
- Fixed the app entry point to serve `dashboard.html` via relative asset URLs.
- Added a real photo-analysis request to the configured `analyze-meal` Edge Function and a clear 404 diagnostic.
- Bumped service-worker cache to v40.

The ZIP can fix frontend code, but cannot prove the live Supabase function is deployed or that the remote database schema matches.
