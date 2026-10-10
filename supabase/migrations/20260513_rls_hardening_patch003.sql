-- Fitness AI Hub - RLS Hardening Migration
-- Patch 003 - Security & RLS
-- Apply in Supabase SQL Editor or via supabase migration

-- Enable RLS on all user tables (idempotent)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to recreate cleanly)
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

DROP POLICY IF EXISTS "Users can read own daily_health" ON daily_health;
DROP POLICY IF EXISTS "Users can insert own daily_health" ON daily_health;
DROP POLICY IF EXISTS "Users can update own daily_health" ON daily_health;

DROP POLICY IF EXISTS "Users can read own sleep" ON sleep_sessions;
DROP POLICY IF EXISTS "Users can insert own sleep" ON sleep_sessions;

DROP POLICY IF EXISTS "Users can read own activities" ON activities;
DROP POLICY IF EXISTS "Users can insert own activities" ON activities;
DROP POLICY IF EXISTS "Users can update own activities" ON activities;
DROP POLICY IF EXISTS "Users can delete own activities" ON activities;

DROP POLICY IF EXISTS "Users can read own activity_streams" ON activity_streams;
DROP POLICY IF EXISTS "Users can insert own activity_streams" ON activity_streams;

DROP POLICY IF EXISTS "Users can read own body_measurements" ON body_measurements;
DROP POLICY IF EXISTS "Users can insert own body_measurements" ON body_measurements;
DROP POLICY IF EXISTS "Users can delete own body_measurements" ON body_measurements;

DROP POLICY IF EXISTS "Users can read own meals" ON meals;
DROP POLICY IF EXISTS "Users can insert own meals" ON meals;
DROP POLICY IF EXISTS "Users can update own meals" ON meals;
DROP POLICY IF EXISTS "Users can delete own meals" ON meals;

DROP POLICY IF EXISTS "Users can read own ai_reports" ON ai_reports;
DROP POLICY IF EXISTS "Users can insert own ai_reports" ON ai_reports;

-- Profiles policies
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Daily health
CREATE POLICY "Users can read own daily_health" ON daily_health FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own daily_health" ON daily_health FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own daily_health" ON daily_health FOR UPDATE USING (auth.uid() = user_id);

-- Sleep
CREATE POLICY "Users can read own sleep" ON sleep_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sleep" ON sleep_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Activities
CREATE POLICY "Users can read own activities" ON activities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own activities" ON activities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own activities" ON activities FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own activities" ON activities FOR DELETE USING (auth.uid() = user_id);

-- Activity streams - need to check ownership via activities table
-- Assuming activity_streams has activity_id FK to activities, we need a function or direct user_id column
-- If activity_streams has user_id column:
CREATE POLICY "Users can read own activity_streams" ON activity_streams FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM activities WHERE activities.id = activity_streams.activity_id AND activities.user_id = auth.uid())
);
CREATE POLICY "Users can insert own activity_streams" ON activity_streams FOR INSERT WITH CHECK (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM activities WHERE activities.id = activity_streams.activity_id AND activities.user_id = auth.uid())
);

-- Body measurements
CREATE POLICY "Users can read own body_measurements" ON body_measurements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own body_measurements" ON body_measurements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own body_measurements" ON body_measurements FOR DELETE USING (auth.uid() = user_id);

-- Meals
CREATE POLICY "Users can read own meals" ON meals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own meals" ON meals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own meals" ON meals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own meals" ON meals FOR DELETE USING (auth.uid() = user_id);

-- AI reports
CREATE POLICY "Users can read own ai_reports" ON ai_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ai_reports" ON ai_reports FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Optional: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_health_user_date ON daily_health(user_id, health_date DESC);
CREATE INDEX IF NOT EXISTS idx_sleep_user_date ON sleep_sessions(user_id, sleep_date DESC);
CREATE INDEX IF NOT EXISTS idx_activities_user_started ON activities(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_meals_user_time ON meals(user_id, meal_time DESC);
CREATE INDEX IF NOT EXISTS idx_body_user_measured ON body_measurements(user_id, measured_at DESC);
