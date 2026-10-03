-- Phase 14: keeping listings honest.
-- Run this once in Supabase: dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- 1. worker_profiles.last_confirmed_at - the last time the worker confirmed
--    their details are right and they are still available. Asked every
--    90 days; a worker who ignores it for 90 + 14 days is hidden from Browse
--    until they confirm (the numbers live in lib/checkin.ts and below).
-- 2. worker_reports - a client who unlocked a worker can report that the
--    number doesn't work, the worker isn't looking, or already found a job.
--    Two different clients reporting since the worker last confirmed hides
--    the worker from Browse until they confirm again.

alter table public.worker_profiles
  add column if not exists last_confirmed_at timestamptz not null default now();

create table if not exists public.worker_reports (
  id uuid primary key default gen_random_uuid(),
  worker_profile_id uuid not null references public.worker_profiles(id) on delete cascade,
  client_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('number_not_working', 'not_looking', 'found_job', 'other')),
  created_at timestamptz not null default now()
);

alter table public.worker_reports enable row level security;

-- A client can only report a worker they have actually unlocked.
create policy "Clients report workers they unlocked"
  on public.worker_reports for insert
  with check (
    client_id = auth.uid()
    and exists (
      select 1 from public.unlocks u
      join public.subscriptions s on s.id = u.subscription_id
      where u.worker_profile_id = worker_reports.worker_profile_id
        and s.client_id = auth.uid()
    )
  );

create policy "Clients read their own reports, admins read all"
  on public.worker_reports for select
  using (client_id = auth.uid() or public.is_admin());

grant select, insert on public.worker_reports to authenticated;
-- Workers never read report rows (so they can't tell which client reported);
-- they only get a count through get_worker_open_report_count below.

-- Workers Browse must leave out: overdue for a check-in, or reported by two
-- different clients since they last confirmed.
create or replace function public.get_hidden_worker_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select w.id
  from public.worker_profiles w
  where w.last_confirmed_at < now() - interval '104 days'
     or (
       select count(distinct r.client_id)
       from public.worker_reports r
       where r.worker_profile_id = w.id and r.created_at > w.last_confirmed_at
     ) >= 2;
$$;

grant execute on function public.get_hidden_worker_ids() to authenticated;

-- How many different clients have reported this worker since they last
-- confirmed. Only the worker themself (or an admin) may ask.
create or replace function public.get_worker_open_report_count(p_worker_profile_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (
    public.is_admin()
    or exists (
      select 1 from public.worker_profiles
      where id = p_worker_profile_id and user_id = auth.uid()
    )
  ) then
    return 0;
  end if;

  return (
    select count(distinct r.client_id)::integer
    from public.worker_reports r
    join public.worker_profiles w on w.id = r.worker_profile_id
    where r.worker_profile_id = p_worker_profile_id
      and r.created_at > w.last_confirmed_at
  );
end;
$$;

grant execute on function public.get_worker_open_report_count(uuid) to authenticated;

-- For the admin dashboard: workers with at least one open report.
create or replace function public.get_reported_worker_count()
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return 0;
  end if;

  return (
    select count(distinct r.worker_profile_id)::integer
    from public.worker_reports r
    join public.worker_profiles w on w.id = r.worker_profile_id
    where r.created_at > w.last_confirmed_at
  );
end;
$$;

grant execute on function public.get_reported_worker_count() to authenticated;

-- The worker's answer to the check-in. Done in the database so the
-- timestamp is the server's clock, not the phone's - a wrong phone clock
-- must not be able to hide a client's report.
create or replace function public.confirm_worker_details(p_still_available boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.worker_profiles
  set last_confirmed_at = now(),
      availability = case when p_still_available then 'available' else 'unavailable' end
  where user_id = auth.uid();
end;
$$;

grant execute on function public.confirm_worker_details(boolean) to authenticated;
