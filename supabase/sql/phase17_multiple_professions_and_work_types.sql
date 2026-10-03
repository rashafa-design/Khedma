-- Phase 17: several professions per worker, and monthly / visit work types.
-- Run this once in Supabase: dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- * worker_profiles.work_types - 'monthly' (works for a client by the month)
--   and/or 'visits' (comes for individual visits/jobs). At least one.
-- * worker_professions - every profession a worker offers. The profession
--   picked at sign-up stays in worker_profiles.profession_id as the MAIN one
--   (it cannot be removed); more can be added from the worker dashboard.
-- * A task entry must belong to one of the worker's own professions.

alter table public.worker_profiles
  add column if not exists work_types text[] not null default array['visits'];

alter table public.worker_profiles
  add constraint worker_profiles_work_types_valid
  check (work_types <@ array['monthly','visits']::text[] and cardinality(work_types) >= 1);

create table if not exists public.worker_professions (
  worker_profile_id uuid not null references public.worker_profiles(id) on delete cascade,
  profession_id uuid not null references public.professions(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (worker_profile_id, profession_id)
);

alter table public.worker_professions enable row level security;

create policy "Workers manage their own professions, admins manage all"
  on public.worker_professions for all
  using (
    public.is_admin()
    or exists (select 1 from public.worker_profiles wp where wp.id = worker_profile_id and wp.user_id = auth.uid())
  )
  with check (
    public.is_admin()
    or exists (select 1 from public.worker_profiles wp where wp.id = worker_profile_id and wp.user_id = auth.uid())
  );

create policy "Clients read professions of approved workers"
  on public.worker_professions for select
  using (exists (select 1 from public.worker_profiles wp where wp.id = worker_profile_id and wp.status = 'approved'));

grant select, insert, update, delete on public.worker_professions to authenticated;

-- Everyone already registered keeps their current profession.
insert into public.worker_professions (worker_profile_id, profession_id)
select id, profession_id from public.worker_profiles
on conflict do nothing;

-- A new worker profile automatically gets its main profession listed.
create or replace function public.add_main_profession()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.worker_professions (worker_profile_id, profession_id)
  values (new.id, new.profession_id)
  on conflict do nothing;
  return new;
end;
$$;

create trigger worker_profiles_add_main_profession
  after insert on public.worker_profiles
  for each row execute function public.add_main_profession();

-- The main profession (chosen at sign-up) can't be removed. When the whole
-- worker profile is deleted, the profile row is already gone, so that passes.
create or replace function public.protect_main_profession()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.worker_profiles
    where id = old.worker_profile_id and profession_id = old.profession_id
  ) then
    raise exception 'The main profession cannot be removed.';
  end if;
  return old;
end;
$$;

create trigger worker_professions_protect_main
  before delete on public.worker_professions
  for each row execute function public.protect_main_profession();

-- A task entry must belong to one of the worker's own professions.
create or replace function public.require_task_in_worker_professions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.task_types tt
    join public.worker_professions wp on wp.profession_id = tt.profession_id
    where tt.id = new.task_type_id and wp.worker_profile_id = new.worker_profile_id
  ) then
    raise exception 'This task belongs to a profession you have not added.';
  end if;
  return new;
end;
$$;

create trigger worker_task_entries_require_profession
  before insert on public.worker_task_entries
  for each row execute function public.require_task_in_worker_professions();
