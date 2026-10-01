# Fitness AI Hub v6 Hybrid Premium

A complete frontend redesign combining Apple-style mobile polish, Garmin-level health data and Strava-style activity presentation.

## Included
- Premium readiness-focused home screen
- Direct mobile AI Coach tab
- Compact trend insights and redesigned charts
- Premium clickable activity feed and detail sheet
- Separate camera and gallery meal-photo controls
- Nutrition progress ring and macro summary
- Quick action sheet
- iPhone safe-area support, standalone PWA metadata and refreshed icons
- Profile-name greeting from `profiles.full_name`

## Backend
Your deployed `analyze-health` and `analyze-meal` functions already work. Keep them deployed with `gemini-3.8-flash`. The existing `GEMINI_API_KEY` remains in Supabase secrets. No SQL migration is required.

## Deploy
Upload the complete frontend files to GitHub Pages. Do not overwrite or redeploy the working Edge Functions from this package because the package intentionally contains only KEEP_DEPLOYED notes for backend folders.

## iPhone update
Remove the old Home Screen PWA, clear Safari website data for the GitHub Pages domain, open the site in Safari and use Share > Add to Home Screen. This installs the v6 manifest and cache.
