begin;
alter table public.profiles add column if not exists daily_calorie_goal integer not null default 2000;
alter table public.activities add column if not exists stream_status text not null default 'pending',add column if not exists stream_attempts integer not null default 0,add column if not exists stream_last_error text,add column if not exists stream_last_attempt_at timestamptz,add column if not exists stream_synced_at timestamptz,add column if not exists fit_storage_path text;
create table if not exists public.activity_streams(
 id uuid primary key default gen_random_uuid(),
 activity_id uuid not null unique references public.activities(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 original_sample_count integer not null default 0,
 display_sample_count integer not null default 0,
 sample_count integer not null default 0,
 duration_seconds integer,
 distance_m numeric,
 route jsonb not null default '[]'::jsonb,
 timestamps jsonb not null default '[]'::jsonb,
 distance_series jsonb not null default '[]'::jsonb,
 heart_rate_series jsonb not null default '[]'::jsonb,
 altitude_series jsonb not null default '[]'::jsonb,
 cadence_series jsonb not null default '[]'::jsonb,
 speed_series jsonb not null default '[]'::jsonb,
 power_series jsonb not null default '[]'::jsonb,
 temperature_series jsonb not null default '[]'::jsonb,
 laps jsonb not null default '[]'::jsonb,
 summary jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
-- Keep existing installations compatible with the current enrich_activities.py payload.
alter table public.activity_streams
 add column if not exists sample_count integer not null default 0,
 add column if not exists duration_seconds integer,
 add column if not exists distance_m numeric,
 add column if not exists timestamps jsonb not null default '[]'::jsonb,
 add column if not exists distance_series jsonb not null default '[]'::jsonb,
 add column if not exists temperature_series jsonb not null default '[]'::jsonb,
 add column if not exists created_at timestamptz not null default now(),
 add column if not exists updated_at timestamptz not null default now();
alter table public.activity_streams enable row level security;drop policy if exists own_rows on public.activity_streams;create policy own_rows on public.activity_streams for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
do $$ declare t text;begin foreach t in array array['profiles','daily_health','sleep_sessions','activities','body_measurements','ai_reports','meals','meal_items'] loop execute format('alter table public.%I enable row level security',t);execute format('drop policy if exists own_rows on public.%I',t);execute format('create policy own_rows on public.%I for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id)',t);end loop;end$$;
commit;
