create extension if not exists pgcrypto;
create table if not exists public.profiles (user_id uuid primary key references auth.users(id) on delete cascade,full_name text,date_of_birth date,height_cm numeric(5,2),current_weight_kg numeric(6,2),target_weight_kg numeric(6,2),timezone text default 'Asia/Kuala_Lumpur',primary_goal text default 'weight_loss',created_at timestamptz default now(),updated_at timestamptz default now());
create table if not exists public.daily_health (id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,health_date date not null,steps int default 0,distance_m numeric,resting_heart_rate int,avg_heart_rate int,max_heart_rate int,stress_average int,body_battery_high int,body_battery_low int,active_calories int,total_calories int,intensity_minutes int,created_at timestamptz default now(),unique(user_id,health_date));
create table if not exists public.sleep_sessions (id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,sleep_date date not null,duration_minutes int,deep_sleep_minutes int,light_sleep_minutes int,rem_sleep_minutes int,awake_minutes int,sleep_score int,created_at timestamptz default now(),unique(user_id,sleep_date));
create table if not exists public.body_measurements (id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,measured_at timestamptz not null default now(),weight_kg numeric(6,2),bmi numeric(5,2),body_fat_percentage numeric(5,2));
create table if not exists public.activities (id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,garmin_activity_id text,activity_type text,activity_name text,started_at timestamptz,duration_seconds int,distance_m numeric,calories int,avg_heart_rate int,max_heart_rate int,raw_data jsonb,created_at timestamptz default now(),unique(user_id,garmin_activity_id));
create table if not exists public.training_metrics (id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,metric_date date,vo2_max numeric(5,2),fitness_age numeric(5,2),training_readiness int,unique(user_id,metric_date));
create table if not exists public.ai_reports (id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,report_date date default current_date,readiness_score int check (readiness_score between 1 and 100),summary text,report_json jsonb,created_at timestamptz default now(),unique(user_id,report_date));
create table if not exists public.sync_logs (id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,source_system text,status text,message text,created_at timestamptz default now());
create index if not exists idx_daily_health_user_date on public.daily_health(user_id,health_date desc);create index if not exists idx_sleep_user_date on public.sleep_sessions(user_id,sleep_date desc);create index if not exists idx_activities_user_started on public.activities(user_id,started_at desc);create index if not exists idx_body_user_measured on public.body_measurements(user_id,measured_at desc);create index if not exists idx_reports_user_date on public.ai_reports(user_id,report_date desc);
alter table public.profiles enable row level security;alter table public.daily_health enable row level security;alter table public.sleep_sessions enable row level security;alter table public.body_measurements enable row level security;alter table public.activities enable row level security;alter table public.training_metrics enable row level security;alter table public.ai_reports enable row level security;alter table public.sync_logs enable row level security;
drop policy if exists profiles_owner on public.profiles;create policy profiles_owner on public.profiles for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists daily_owner on public.daily_health;create policy daily_owner on public.daily_health for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists sleep_owner on public.sleep_sessions;create policy sleep_owner on public.sleep_sessions for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists body_owner on public.body_measurements;create policy body_owner on public.body_measurements for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists activities_owner on public.activities;create policy activities_owner on public.activities for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists training_owner on public.training_metrics;create policy training_owner on public.training_metrics for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists reports_owner on public.ai_reports;create policy reports_owner on public.ai_reports for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists sync_owner on public.sync_logs;create policy sync_owner on public.sync_logs for select to authenticated using ((select auth.uid())=user_id);
create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now();return new;end;$$;drop trigger if exists set_profiles_updated_at on public.profiles;create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into public.profiles(user_id,full_name,timezone,primary_goal) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',new.email),'Asia/Kuala_Lumpur','weight_loss') on conflict(user_id) do nothing;return new;end;$$;drop trigger if exists on_auth_user_created on auth.users;create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- =========================================================
-- NORMALIZED NUTRITION SCHEMA FOR FRESH INSTALLATIONS
-- Existing installations should also run 002_photo_analysis_patch.sql.
-- =========================================================

create table if not exists public.nutrition_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  meal_type text not null,
  food_name text not null,
  quantity text,
  calories numeric default 0,
  protein_g numeric default 0,
  carbs_g numeric default 0,
  fat_g numeric default 0,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.nutrition_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  daily_calories_target integer,
  protein_g_target numeric,
  carbs_g_target numeric,
  fat_g_target numeric,
  fiber_g_target numeric,
  sugar_g_target numeric,
  sodium_mg_target numeric,
  water_ml_target integer default 2500,
  goal_type text default 'weight_loss',
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  food_name text not null,
  brand_name text,
  serving_size numeric,
  serving_unit text default 'g',
  calories numeric default 0,
  protein_g numeric default 0,
  carbs_g numeric default 0,
  fat_g numeric default 0,
  fiber_g numeric default 0,
  sugar_g numeric default 0,
  sodium_mg numeric default 0,
  barcode text,
  source text default 'manual',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_date date not null default current_date,
  meal_time timestamptz not null default now(),
  meal_type text not null default 'meal',
  meal_name text,
  notes text,
  photo_path text,
  photo_mime_type text,
  estimated_calories numeric default 0,
  estimated_protein_g numeric default 0,
  estimated_carbs_g numeric default 0,
  estimated_fat_g numeric default 0,
  estimated_fiber_g numeric default 0,
  ai_confidence text check (ai_confidence is null or ai_confidence in ('low','medium','high')),
  ai_analysis_summary text,
  ai_possible_hidden_calories jsonb default '[]'::jsonb,
  ai_raw_response jsonb,
  analysis_status text default 'pending' check (analysis_status in ('pending','processing','completed','failed','manual')),
  analyzed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.meal_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_id uuid not null references public.meals(id) on delete cascade,
  food_id uuid references public.foods(id) on delete set null,
  food_name text not null,
  quantity numeric not null,
  quantity_unit text default 'serving',
  calories numeric default 0,
  protein_g numeric default 0,
  carbs_g numeric default 0,
  fat_g numeric default 0,
  fiber_g numeric default 0,
  sugar_g numeric default 0,
  sodium_mg numeric default 0,
  estimated_portion text,
  ai_detected boolean default false,
  ai_confidence text check (ai_confidence is null or ai_confidence in ('low','medium','high')),
  ai_notes text,
  source text default 'manual' check (source in ('manual','gemini_photo','barcode','food_database')),
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  logged_at timestamptz not null default now(),
  amount_ml integer not null,
  created_at timestamptz default now()
);

create index if not exists idx_meals_user_time on public.meals(user_id,meal_time desc);
create index if not exists idx_meal_items_meal on public.meal_items(meal_id,sort_order);
create index if not exists idx_nutrition_logs_user_date on public.nutrition_logs(user_id,log_date desc);
create index if not exists idx_water_logs_user_date on public.water_logs(user_id,log_date desc);

alter table public.nutrition_logs enable row level security;
alter table public.nutrition_goals enable row level security;
alter table public.foods enable row level security;
alter table public.meals enable row level security;
alter table public.meal_items enable row level security;
alter table public.water_logs enable row level security;

drop policy if exists nutrition_logs_owner on public.nutrition_logs;
create policy nutrition_logs_owner on public.nutrition_logs for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists nutrition_goals_owner on public.nutrition_goals;
create policy nutrition_goals_owner on public.nutrition_goals for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists foods_owner on public.foods;
create policy foods_owner on public.foods for all to authenticated using (user_id is null or (select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists meals_owner on public.meals;
create policy meals_owner on public.meals for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists meal_items_owner on public.meal_items;
create policy meal_items_owner on public.meal_items for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists water_logs_owner on public.water_logs;
create policy water_logs_owner on public.water_logs for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('meal-photos','meal-photos',false,6291456,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=6291456,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists meal_photos_select on storage.objects;
create policy meal_photos_select on storage.objects for select to authenticated using (bucket_id='meal-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists meal_photos_insert on storage.objects;
create policy meal_photos_insert on storage.objects for insert to authenticated with check (bucket_id='meal-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists meal_photos_update on storage.objects;
create policy meal_photos_update on storage.objects for update to authenticated using (bucket_id='meal-photos' and (storage.foldername(name))[1]=(select auth.uid())::text) with check (bucket_id='meal-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists meal_photos_delete on storage.objects;
create policy meal_photos_delete on storage.objects for delete to authenticated using (bucket_id='meal-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop trigger if exists set_meals_updated_at on public.meals;
create trigger set_meals_updated_at before update on public.meals for each row execute function public.set_updated_at();
drop trigger if exists set_meal_items_updated_at on public.meal_items;
create trigger set_meal_items_updated_at before update on public.meal_items for each row execute function public.set_updated_at();
drop trigger if exists set_nutrition_goals_updated_at on public.nutrition_goals;
create trigger set_nutrition_goals_updated_at before update on public.nutrition_goals for each row execute function public.set_updated_at();
drop trigger if exists set_foods_updated_at on public.foods;
create trigger set_foods_updated_at before update on public.foods for each row execute function public.set_updated_at();
