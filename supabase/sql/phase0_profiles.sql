-- Phase 0: accounts and platform roles (worker / client / admin).
-- Run this once in Supabase: dashboard -> SQL Editor -> New query -> paste -> Run.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('worker', 'client', 'admin')),
  full_name text not null,
  phone_number text,
  preferred_locale text not null default 'ar' check (preferred_locale in ('ar', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- SECURITY DEFINER so this can read profiles without tripping this same
-- table's own RLS recursively. Every later table's "or admins can..."
-- policy calls this instead of querying public.profiles directly.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create policy "Users read their own profile, admins read all"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "Users insert their own profile once"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users update their own profile, admins update any"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- Tables created via raw SQL don't automatically get the authenticated
-- role's grants the way the dashboard's table editor adds them - every
-- new table needs this explicitly or every query fails with "permission
-- denied for table ...".
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;

-- Prevents a user from promoting themselves to admin (or demoting an
-- admin) through a normal update call - only an existing admin's session
-- can change a role column value.
create or replace function public.prevent_self_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role <> old.role and not public.is_admin() then
    raise exception 'Only an admin can change a profile''s role.';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_self_role_escalation();

-- To make the first admin (there's no invite-admin UI for this proof of
-- concept): sign up normally as any role, then in the Supabase dashboard's
-- Table Editor, open public.profiles and change that one row's `role` to
-- 'admin' directly.
