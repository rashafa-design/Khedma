-- Phase 18: a second, cheaper plan for visit workers, and neighborhoods.
-- Run this once in Supabase: dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- Plans:
--   monthly - 2,000 EGP, 10 workers, 1 month   (workers who work by the month)
--   visits  -   50 EGP,  5 workers, 3 days     (workers who come for visits)
-- A client can hold one of each at the same time. A plan only unlocks
-- workers who offer that kind of work (worker_profiles.work_types).
--
-- Neighborhoods: visit workers list the districts/neighborhoods they visit
-- (free text, e.g. "Maadi") so nearby clients can find them.

alter table public.payment_requests
  add column if not exists plan text not null default 'monthly'
  check (plan in ('monthly', 'visits'));

alter table public.subscriptions
  add column if not exists plan text not null default 'monthly'
  check (plan in ('monthly', 'visits'));

alter table public.worker_profiles
  add column if not exists service_neighborhoods text[] not null default '{}';

alter table public.worker_profiles
  add constraint worker_profiles_neighborhoods_max
  check (cardinality(service_neighborhoods) <= 15);

-- The price comes from the plan, never from what the browser sends.
create or replace function public.set_payment_amount_from_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.amount := case new.plan when 'visits' then 50 else 2000 end;
  new.currency := 'EGP';
  return new;
end;
$$;

create trigger payment_requests_set_amount
  before insert on public.payment_requests
  for each row execute function public.set_payment_amount_from_plan();

-- One open payment per plan, and no paying for a plan that is already active.
create or replace function public.limit_payment_requests_per_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.payment_requests
    where client_id = new.client_id and plan = new.plan and status = 'pending'
  ) then
    raise exception 'You already have a payment waiting for review for this plan.';
  end if;

  if exists (
    select 1 from public.subscriptions
    where client_id = new.client_id and plan = new.plan and expires_at > now()
  ) then
    raise exception 'This plan is already active.';
  end if;

  return new;
end;
$$;

create trigger payment_requests_limit_per_plan
  before insert on public.payment_requests
  for each row execute function public.limit_payment_requests_per_plan();

-- Approving a payment creates the subscription for ITS plan.
create or replace function public.create_subscription_on_payment_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    if new.plan = 'visits' then
      insert into public.subscriptions (client_id, payment_request_id, plan, slots_total, starts_at, expires_at)
      values (new.client_id, new.id, 'visits', 5, now(), now() + interval '3 days');
    else
      insert into public.subscriptions (client_id, payment_request_id, plan, slots_total, starts_at, expires_at)
      values (new.client_id, new.id, 'monthly', 10, now(), now() + interval '1 month');
    end if;
  end if;
  return new;
end;
$$;

-- Asking a worker "are you available?" needs an active plan that fits the
-- worker's kind of work.
create or replace function public.limit_availability_requests()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.worker_profiles
    where id = new.worker_profile_id and status = 'approved' and availability = 'available'
  ) then
    raise exception 'This worker cannot be asked right now.';
  end if;

  if not exists (
    select 1
    from public.subscriptions s
    join public.worker_profiles w on w.id = new.worker_profile_id
    where s.client_id = new.client_id and s.expires_at > now()
      and s.plan = any (w.work_types)
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

  return new;
end;
$$;

-- An unlock must come after a "yes" AND use a plan that fits the worker.
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
      and r.status = 'available'
      and r.responded_at > now() - interval '48 hours'
  ) then
    raise exception 'Ask this worker if they are available first.';
  end if;

  return new;
end;
$$;
