-- Phase 24: how long a worker has to answer "are you available?" depends on
-- the plan the client is asking under.
-- Run this once in Supabase: dashboard -> SQL Editor -> New query -> paste -> Run.
--
--   visits  -> 3 hours   (a visits pass only lasts 3 days and visit jobs are quick)
--   monthly -> 24 hours
--
-- Each request records its plan (availability_requests.plan). A "yes" only
-- counts for an unlock under the SAME plan it was asked under. The worker's
-- list of open questions (get_my_pending_availability_requests) now also
-- returns the plan, so the worker can see it is a visit request.

alter table public.availability_requests
  add column if not exists plan text not null default 'monthly'
  check (plan in ('monthly', 'visits'));

create or replace function public.limit_availability_requests()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.worker_profiles w
    where w.id = new.worker_profile_id and w.status = 'approved'
      and w.availability = 'available' and new.plan = any (w.work_types)
  ) then
    raise exception 'This worker cannot be asked right now.';
  end if;

  if not exists (
    select 1 from public.subscriptions s
    where s.client_id = new.client_id and s.expires_at > now() and s.plan = new.plan
  ) then
    raise exception 'You need an active plan that fits this worker.';
  end if;

  if exists (
    select 1 from public.availability_requests
    where client_id = new.client_id and worker_profile_id = new.worker_profile_id
      and status = 'pending' and expires_at > now()
  ) then
    raise exception 'You already asked this worker. Please wait for the reply.';
  end if;

  if (
    select count(*) from public.availability_requests
    where client_id = new.client_id and status = 'pending' and expires_at > now()
  ) >= 3 then
    raise exception 'You can have at most 3 open availability checks at a time.';
  end if;

  new.expires_at := now() + case new.plan
    when 'visits' then interval '3 hours'
    else interval '24 hours'
  end;

  return new;
end;
$$;

create or replace function public.require_confirmed_availability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client uuid;
  v_plan text;
begin
  select s.client_id, s.plan into v_client, v_plan
  from public.subscriptions s where s.id = new.subscription_id;

  if not exists (
    select 1 from public.worker_profiles w
    where w.id = new.worker_profile_id and v_plan = any (w.work_types)
  ) then
    raise exception 'This worker does not work under that plan.';
  end if;

  if not exists (
    select 1 from public.availability_requests r
    where r.client_id = v_client
      and r.worker_profile_id = new.worker_profile_id
      and r.plan = v_plan
      and r.status = 'available'
      and r.responded_at > now() - interval '48 hours'
  ) then
    raise exception 'Ask this worker if they are available first.';
  end if;

  return new;
end;
$$;

drop function if exists public.get_my_pending_availability_requests();
create function public.get_my_pending_availability_requests()
returns table (id uuid, created_at timestamptz, expires_at timestamptz, plan text)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.created_at, r.expires_at, r.plan
  from public.availability_requests r
  join public.worker_profiles w on w.id = r.worker_profile_id
  where w.user_id = auth.uid() and r.status = 'pending' and r.expires_at > now()
  order by r.created_at;
$$;

grant execute on function public.get_my_pending_availability_requests() to authenticated;
