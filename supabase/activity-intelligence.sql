begin;

alter table public.activities
  add column if not exists elevation_gain_m numeric,
  add column if not exists avg_cadence numeric,
  add column if not exists avg_power numeric,
  add column if not exists normalized_power numeric,
  add column if not exists training_load numeric,
  add column if not exists stream_status text not null default 'pending',
  add column if not exists stream_synced_at timestamptz,
  add column if not exists fit_storage_path text;

create table if not exists public.activity_streams (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  sample_count integer not null default 0,
  duration_seconds integer,
  distance_m numeric,
  route jsonb not null default '[]'::jsonb,
  timestamps jsonb not null default '[]'::jsonb,
  distance_series jsonb not null default '[]'::jsonb,
  altitude_series jsonb not null default '[]'::jsonb,
  heart_rate_series jsonb not null default '[]'::jsonb,
  cadence_series jsonb not null default '[]'::jsonb,
  speed_series jsonb not null default '[]'::jsonb,
  power_series jsonb not null default '[]'::jsonb,
  temperature_series jsonb not null default '[]'::jsonb,
  laps jsonb not null default '[]'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(activity_id)
);

create index if not exists activity_streams_user_activity_idx
  on public.activity_streams(user_id, activity_id);
create index if not exists activities_user_started_idx
  on public.activities(user_id, started_at desc);

alter table public.activity_streams enable row level security;

drop policy if exists "Users read own activity streams" on public.activity_streams;
create policy "Users read own activity streams"
on public.activity_streams for select
to authenticated
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('activity-files','activity-files',false,52428800,array['application/octet-stream','application/zip'])
on conflict (id) do update set public=false, file_size_limit=excluded.file_size_limit;

commit;
