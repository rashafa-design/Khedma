-- Phase 1: admin-editable catalogs. New professions/task types are added
-- here through the admin screen, never by editing code.
-- Run this once in Supabase: dashboard -> SQL Editor -> New query -> paste -> Run.

create table if not exists public.professions (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_ar text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.professions enable row level security;

create policy "Signed-in users read active professions, admins read all"
  on public.professions for select
  using (is_active or public.is_admin());

create policy "Only admins insert professions"
  on public.professions for insert with check (public.is_admin());

create policy "Only admins update professions"
  on public.professions for update
  using (public.is_admin()) with check (public.is_admin());

create policy "Only admins delete professions"
  on public.professions for delete using (public.is_admin());

grant select, insert, update, delete on public.professions to authenticated;

create table if not exists public.task_types (
  id uuid primary key default gen_random_uuid(),
  profession_id uuid not null references public.professions(id) on delete restrict,
  name_en text not null,
  name_ar text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.task_types enable row level security;

create policy "Signed-in users read active task types, admins read all"
  on public.task_types for select
  using (is_active or public.is_admin());

create policy "Only admins insert task types"
  on public.task_types for insert with check (public.is_admin());

create policy "Only admins update task types"
  on public.task_types for update
  using (public.is_admin()) with check (public.is_admin());

create policy "Only admins delete task types"
  on public.task_types for delete using (public.is_admin());

grant select, insert, update, delete on public.task_types to authenticated;
-- Note: the admin screen should push toward deactivating (is_active =
-- false) rather than deleting a profession/task type already in use by a
-- worker - the "restrict" foreign key on task_types.profession_id (and,
-- from Phase 3 onward, worker_task_entries.task_type_id) will refuse a
-- hard delete anyway while something still references it.
