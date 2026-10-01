# Fitness AI Hub v3

Complete mobile-first fitness, Garmin, nutrition and Gemini wellness dashboard.

## v3 features

- Supabase authentication and protected dashboard
- Garmin daily health, sleep and activity sync
- Weight, BMI, steps, heart rate, sleep, stress, body battery and calorie KPIs
- Weight, steps, resting-heart-rate, stress and activity charts
- Responsive activities and profile management
- Gemini wellness analysis through a secure Supabase Edge Function
- AI meal photo analysis using the existing `GEMINI_API_KEY` project secret
- Automatic normalized logging to `meals` and `meal_items`
- Private `meal-photos` Storage bucket
- Daily calorie and macro totals with meal history
- PWA service worker and mobile camera support

## Existing database upgrade

Run only:

```text
supabase/migrations/002_photo_analysis_patch.sql
```

This adds photo-analysis fields to your existing normalized nutrition schema without deleting existing data.

## Fresh database

Run in order:

```text
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_photo_analysis_patch.sql
```

The second migration is idempotent and is included as a consistency patch.

## Deploy Edge Functions

Your existing `GEMINI_API_KEY` Edge Function secret is used automatically. Do not place it in frontend code.

```bash
supabase link --project-ref jxvwneujgriufbezwjuf
supabase functions deploy analyze-health
supabase functions deploy analyze-meal
```

## Frontend

The configured Supabase URL and publishable key are in `assets/js/config.js`. Upload the complete folder contents to the GitHub Pages repository root.

After deployment, perform one hard refresh or clear the old service-worker cache so v3 resources load.

## Garmin scraper

Create `scraper/.env` from `.env.example`, provide the service-role key, Garmin credentials and Supabase user UUID, then run:

```bash
cd scraper
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
python sync_garmin.py
```

Never commit `.env`, Garmin credentials, service-role keys or Gemini keys.

## Nutrition accuracy

Meal-photo nutrition values are estimates. Hidden oils, sauces, ingredients and actual portions may change the true values. Review estimates before relying on them.
