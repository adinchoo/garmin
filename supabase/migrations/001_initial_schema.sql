create extension if not exists pgcrypto;

create table if not exists public.profiles (
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

create table if not exists public.daily_health (
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
  unique(user_id, health_date)
);

create table if not exists public.sleep_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sleep_date date not null,
  duration_minutes int,
  deep_sleep_minutes int,
  light_sleep_minutes int,
  rem_sleep_minutes int,
  awake_minutes int,
  sleep_score int,
  created_at timestamptz default now(),
  unique(user_id, sleep_date)
);

create table if not exists public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_at timestamptz not null default now(),
  weight_kg numeric(5,2),
  bmi numeric(5,2),
  body_fat_percentage numeric(5,2)
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  garmin_activity_id text,
  activity_type text,
  activity_name text,
  started_at timestamptz,
  duration_seconds int,
  distance_m numeric,
  calories int,
  avg_heart_rate int,
  max_heart_rate int,
  raw_data jsonb,
  created_at timestamptz default now(),
  unique(user_id, garmin_activity_id)
);

create table if not exists public.training_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  metric_date date,
  vo2_max numeric(5,2),
  fitness_age numeric(5,2),
  training_readiness int,
  unique(user_id, metric_date)
);

create table if not exists public.ai_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_date date default current_date,
  readiness_score int,
  summary text,
  report_json jsonb,
  created_at timestamptz default now(),
  unique(user_id, report_date)
);

create table if not exists public.sync_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_system text,
  status text,
  message text,
  created_at timestamptz default now()
);

create index if not exists idx_daily_health_user_date on public.daily_health(user_id, health_date desc);
create index if not exists idx_sleep_sessions_user_date on public.sleep_sessions(user_id, sleep_date desc);
create index if not exists idx_activities_user_started on public.activities(user_id, started_at desc);
create index if not exists idx_ai_reports_user_date on public.ai_reports(user_id, report_date desc);

alter table public.profiles enable row level security;
alter table public.daily_health enable row level security;
alter table public.sleep_sessions enable row level security;
alter table public.body_measurements enable row level security;
alter table public.activities enable row level security;
alter table public.training_metrics enable row level security;
alter table public.ai_reports enable row level security;
alter table public.sync_logs enable row level security;

drop policy if exists profiles_all on public.profiles;
drop policy if exists daily_health_all on public.daily_health;
drop policy if exists sleep_all on public.sleep_sessions;
drop policy if exists body_all on public.body_measurements;
drop policy if exists activities_all on public.activities;
drop policy if exists training_all on public.training_metrics;
drop policy if exists reports_all on public.ai_reports;
drop policy if exists sync_all on public.sync_logs;

create policy profiles_all on public.profiles
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy daily_health_all on public.daily_health
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy sleep_all on public.sleep_sessions
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy body_all on public.body_measurements
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy activities_all on public.activities
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy training_all on public.training_metrics
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy reports_all on public.ai_reports
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy sync_all on public.sync_logs
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    user_id,
    full_name,
    timezone,
    primary_goal
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'Asia/Kuala_Lumpur',
    'weight_loss'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

---

## Final note, ALIF

This version is complete for:

- GitHub Pages frontend
- Supabase login/register
- User dashboard
- Manual body measurement
- Garmin scraper
- Supabase database schema
- AI health analysis Edge Function

Do **not** upload `.env` or service role keys to GitHub.