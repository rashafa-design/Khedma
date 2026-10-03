-- Phase 13: where a worker lives and where they offer their services.
-- Run this once in Supabase: dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- * worker_profiles.base_governorate  - the governorate the worker lives in.
-- * worker_service_areas              - every governorate they will travel to
--                                       work in (at least one, enforced below).
-- Governorates are stored as short codes (e.g. 'cairo'); the English/Arabic
-- names live in lib/governorates.ts.

alter table public.worker_profiles add column if not exists base_governorate text;

create table if not exists public.worker_service_areas (
  worker_profile_id uuid not null references public.worker_profiles(id) on delete cascade,
  governorate text not null,
  created_at timestamptz not null default now(),
  primary key (worker_profile_id, governorate)
);

alter table public.worker_service_areas enable row level security;

create policy "Workers manage their own service areas, admins manage all"
  on public.worker_service_areas for all
  using (
    public.is_admin()
    or exists (
      select 1 from public.worker_profiles wp
      where wp.id = worker_profile_id and wp.user_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.worker_profiles wp
      where wp.id = worker_profile_id and wp.user_id = auth.uid()
    )
  );

create policy "Clients read service areas of approved workers"
  on public.worker_service_areas for select
  using (
    exists (
      select 1 from public.worker_profiles wp
      where wp.id = worker_profile_id and wp.status = 'approved'
    )
  );

grant select, insert, update, delete on public.worker_service_areas to authenticated;

-- A worker must always keep at least one area. Deleting a whole worker
-- profile cascades to its areas; by then the profile row is already gone, so
-- that case is allowed through.
create or replace function public.prevent_removing_last_service_area()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.worker_profiles where id = old.worker_profile_id)
     and not exists (
       select 1 from public.worker_service_areas
       where worker_profile_id = old.worker_profile_id and governorate <> old.governorate
     )
  then
    raise exception 'A worker must keep at least one service area.';
  end if;
  return old;
end;
$$;

create trigger worker_service_areas_keep_one
  before delete on public.worker_service_areas
  for each row execute function public.prevent_removing_last_service_area();
