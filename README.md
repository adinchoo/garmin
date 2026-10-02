# Fitness AI Hub v7.0 Premium GUI

Full replacement frontend package. Existing Supabase database and Edge Functions remain unchanged.

## Main improvements
- Rebuilt responsive premium dashboard for desktop and iPhone PWA
- Fixed malformed CDN and Google Fonts links from the packed source
- Added safe-area handling and 100dvh mobile sizing
- Added Activity Mix doughnut chart to the Trends page
- Improved cards, typography, filters, meal scanner, profile forms and activity detail sheet
- Added complete PWA icon set and versioned service worker cache
- Preserved Supabase authentication, health data, AI coach, meal analysis and existing table names

## Deploy
1. Replace the files in the GitHub Pages repository with this package.
2. Commit and push all files.
3. On iPhone, close the PWA, clear the old site data if needed, reopen Safari once, then add it to the Home Screen again.
4. The new service worker cache is `fitness-ai-hub-v7.0.0`.

## Security note
The publishable Supabase anon key is included as required for the browser client. Make sure Row Level Security policies remain enabled on all user tables.
