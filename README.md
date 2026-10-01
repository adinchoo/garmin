# Fitness AI Hub v2

Mobile-first Garmin wellness dashboard built with GitHub Pages, Supabase, Chart.js and Gemini through a secure Supabase Edge Function.

## Included

- Login and registration screen
- Protected dashboard
- Profile and weight goal editor
- KPI cards for weight, BMI, steps, calories, heart rate, stress, sleep, body battery and readiness
- Weight, steps, resting HR, stress and activity charts
- Responsive recent activity cards
- Manual body measurement entry
- Gemini wellness analysis stored in `ai_reports`
- AI nutrition photo analysis with automatic meal logging
- Daily calorie and macro totals plus meal history
- Garmin Connect sync utility
- PWA manifest and service worker

## 1. Database

Run `supabase/migrations/001_initial_schema.sql` in Supabase SQL Editor.

## 2. Frontend configuration

Edit `assets/js/config.js` only if your project URL or publishable key changes.

## 3. Deploy Gemini Edge Function

Install and sign in to the Supabase CLI, then run from the project root:

```bash
supabase link --project-ref jxvwneujgriufbezwjuf
supabase secrets set GEMINI_API_KEY=YOUR_GEMINI_API_KEY
supabase functions deploy analyze-health
supabase functions deploy analyze-meal
```

Never place the Gemini key, Garmin password or Supabase service-role key in browser code or GitHub.

## 4. Garmin scraper

Create `scraper/.env` from `scraper/.env.example`, install dependencies and run:

```bash
cd scraper
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
python sync_garmin.py
```

On macOS/Linux, activate with `source .venv/bin/activate`.

## 5. GitHub Pages

Upload the contents of this folder to the repository root. In GitHub repository settings, enable Pages from the branch containing these files.

## Notes

- Supabase email confirmation may require users to verify their email before first login.
- The wellness report is not a medical diagnosis.
- Delete old service-worker cache by hard refreshing once after deployment.

## Nutrition photo logging

Open **Nutrition**, take or choose a meal photo, select the meal type and press **Analyze and auto-log meal**. The browser compresses the image, the Edge Function sends it to Gemini, stores the estimate in `meals`, and privately stores the photo in the `meal-photos` bucket. Estimates must be reviewed because photo analysis cannot reliably identify every ingredient, portion or cooking oil.
