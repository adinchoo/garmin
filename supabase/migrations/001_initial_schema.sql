
-- Fitness AI Hub - Initial Schema
create extension if not exists pgcrypto;

create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  date_of_birth date,
  height_cm numeric(5,2),
  current_weight_kg numeric(5,2),
  target_weight_kg numeric(5,2),
  timezone text default 'Asia/Kuala_Lumpur',
  primary_goal text default 'weight_loss',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists daily_health (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  health_date date not null,
  steps int default 0,
  distance_m numeric,
  resting_heart_rate int,
  avg_heart_rate int,
  max_heart_rate int,
  stress_average int,
  body_battery_high int,
  body_battery_low int,
  active_calories int,
  total_calories int,
  intensity_minutes int,
  created_at timestamptz default now(),
  unique(user_id,health_date)
);

create table if not exists sleep_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sleep_date date not null,
  duration_minutes int,
  deep_sleep_minutes int,
  light_sleep_minutes int,
  rem_sleep_minutes int,
  awake_minutes int,
  sleep_score int,
  created_at timestamptz default now()
);

create table if not exists body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_at timestamptz not null default now(),
  weight_kg numeric(5,2),
  bmi numeric(5,2),
  body_fat_percentage numeric(5,2)
);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  garmin_activity_id text unique,
  activity_type text,
  activity_name text,
  started_at timestamptz,
  duration_seconds int,
  distance_m numeric,
  calories int,
  avg_heart_rate int,
  max_heart_rate int,
  raw_data jsonb,
  created_at timestamptz default now()
);

create table if not exists training_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  metric_date date,
  vo2_max numeric(5,2),
  fitness_age numeric(5,2),
  training_readiness int
);

create table if not exists ai_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_date date default current_date,
  readiness_score int,
  summary text,
  report_json jsonb,
  created_at timestamptz default now()
);

create table if not exists sync_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_system text,
  status text,
  message text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
alter table daily_health enable row level security;
alter table sleep_sessions enable row level security;
alter table body_measurements enable row level security;
alter table activities enable row level security;
alter table training_metrics enable row level security;
alter table ai_reports enable row level security;
alter table sync_logs enable row level security;

create policy profiles_all on profiles using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy daily_health_all on daily_health using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy sleep_all on sleep_sessions using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy body_all on body_measurements using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy activities_all on activities using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy training_all on training_metrics using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy reports_all on ai_reports using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy sync_all on sync_logs using (auth.uid()=user_id) with check (auth.uid()=user_id);
