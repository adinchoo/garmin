# Fitness AI Hub

This repository is the static HTML/CSS/JavaScript Fitness AI application backed by Supabase. `index.html` is the single UI entry point. `dashboard.html` is retained only as a redirect for older links.

## Main folders
- `assets/css/` — application and responsive styling.
- `assets/js/` — scripts loaded by `index.html`.
- `assets/icons/`, `assets/images/`, `assets/splash/` — app media and PWA assets.
- `supabase/functions/` — Edge Functions, including `analyze-meal`.
- `supabase/*.sql` — database schema and migrations.
- `sync_garmin.py`, `backfill_activities.py`, `enrich_activities.py` — Garmin data utilities.

## Static deployment
Publish the contents of this folder to the configured static host. No Node/Vite build is required for the active frontend.

## Supabase
The frontend uses the project URL and publishable/anon key in `assets/js/config.js`. Never place a Supabase service-role key in browser code. Deploy Edge Functions separately; a frontend upload does not deploy `analyze-meal`.

See [CLEANUP-AND-DEPLOY.md](CLEANUP-AND-DEPLOY.md) for deployment and troubleshooting notes.
