# INSTALLATION v1.0.0
1. Unzip FitnessAIHub_Production_Release_v1.0.0.zip
2. cp .env.example .env.local and fill SUPABASE_URL, ANON_KEY
3. Supabase SQL Editor run supabase/migrations/*.sql
4. supabase functions deploy analyze-meal --no-verify-jwt false, cleanup-meal-photos, analyze-health, analyze-activity
5. supabase secrets set AI_PROVIDER_API_KEY
6. Deploy static to HTTPS host preserving structure, SW at root
7. Clear PWA cache, verify no 404s, login redirect, meal photo validation, activity grouping
