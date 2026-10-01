begin;

alter table public.meals
  add column if not exists meal_time timestamptz,
  add column if not exists photo_path text,
  add column if not exists photo_mime_type text,
  add column if not exists estimated_calories numeric default 0,
  add column if not exists estimated_protein_g numeric default 0,
  add column if not exists estimated_carbs_g numeric default 0,
  add column if not exists estimated_fat_g numeric default 0,
  add column if not exists estimated_fiber_g numeric default 0,
  add column if not exists ai_confidence text,
  add column if not exists ai_analysis_summary text,
  add column if not exists ai_possible_hidden_calories jsonb default '[]'::jsonb,
  add column if not exists ai_raw_response jsonb,
  add column if not exists analysis_status text default 'pending',
  add column if not exists analyzed_at timestamptz;

update public.meals
set meal_time = coalesce(meal_time, created_at, meal_date::timestamptz, now())
where meal_time is null;

alter table public.meals alter column meal_time set default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname='meals_ai_confidence_check' and conrelid='public.meals'::regclass) then
    alter table public.meals add constraint meals_ai_confidence_check check (ai_confidence is null or ai_confidence in ('low','medium','high'));
  end if;
  if not exists (select 1 from pg_constraint where conname='meals_analysis_status_check' and conrelid='public.meals'::regclass) then
    alter table public.meals add constraint meals_analysis_status_check check (analysis_status in ('pending','processing','completed','failed','manual'));
  end if;
end $$;

alter table public.meal_items
  add column if not exists estimated_portion text,
  add column if not exists ai_detected boolean default false,
  add column if not exists ai_confidence text,
  add column if not exists ai_notes text,
  add column if not exists source text default 'manual',
  add column if not exists sort_order integer default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='meal_items_ai_confidence_check' and conrelid='public.meal_items'::regclass) then
    alter table public.meal_items add constraint meal_items_ai_confidence_check check (ai_confidence is null or ai_confidence in ('low','medium','high'));
  end if;
  if not exists (select 1 from pg_constraint where conname='meal_items_source_check' and conrelid='public.meal_items'::regclass) then
    alter table public.meal_items add constraint meal_items_source_check check (source in ('manual','gemini_photo','barcode','food_database'));
  end if;
end $$;

create index if not exists idx_meals_user_time on public.meals(user_id,meal_time desc);
create index if not exists idx_meals_analysis_status on public.meals(user_id,analysis_status);
create index if not exists idx_meal_items_meal on public.meal_items(meal_id,sort_order);

alter table public.meals enable row level security;
alter table public.meal_items enable row level security;
drop policy if exists meals_owner on public.meals;
create policy meals_owner on public.meals for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists meal_items_owner on public.meal_items;
create policy meal_items_owner on public.meal_items for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

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

commit;
