-- Phase 3: the worker's task list (one-to-many). Scope, price, and
-- billing unit are per task entry, not per whole profile - a worker can
-- have several entries even for the same task type (e.g. a cheaper "home"
-- price and a separate "business" price for the same task).
-- Run this once in Supabase: dashboard -> SQL Editor -> New query -> paste -> Run.

create table if not exists public.worker_task_entries (
  id uuid primary key default gen_random_uuid(),
  worker_profile_id uuid not null references public.worker_profiles(id) on delete cascade,
  task_type_id uuid not null references public.task_types(id) on delete restrict,
  scope text not null check (scope in ('home', 'business', 'both')),
  price numeric(10,2) not null check (price > 0),
  billing_unit text not null check (billing_unit in ('hourly', 'daily', 'monthly')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.worker_task_entries enable row level security;

create policy "Workers manage their own task entries, admins manage all"
  on public.worker_task_entries for all
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

create policy "Clients read task entries of approved workers"
  on public.worker_task_entries for select
  using (
    exists (
      select 1 from public.worker_profiles wp
      where wp.id = worker_profile_id and wp.status = 'approved'
    )
  );

grant select, insert, update, delete on public.worker_task_entries to authenticated;
