-- Phase 15: stopping "available" workers who are not actually available.
-- Run this once in Supabase: dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- 1. availability_confirmed_at: a worker marked "available" must re-confirm
--    every 14 days (asked from day 10); after 28 days without an answer they
--    are hidden from Browse. Cards show how fresh the confirmation is.
-- 2. unlock_feedback: ~3 days after unlocking a worker the client is asked
--    "did you reach them and were they available?". Bad answers count like
--    reports (see worker_negative_events).
-- 3. Hidden from Browse when ANY of: details not confirmed in 104 days;
--    "available" not confirmed in 28 days; 2+ different clients with a bad
--    experience since the worker last confirmed their details; 3+ different
--    clients with a bad experience in 90 days (only an admin can clear this
--    one, so a worker cannot just tap "confirm" to erase their record).

alter table public.worker_profiles
  add column if not exists availability_confirmed_at timestamptz not null default now(),
  add column if not exists flags_cleared_at timestamptz;

-- Workers must not be able to fake freshness or clear their own flags by
-- writing these columns directly. The confirm_* functions below run as the
-- database owner, so they are exempt; anything sent straight from the app
-- as a signed-in user (who is not an admin) has these columns put back.
create or replace function public.guard_worker_confirmation_columns()
returns trigger
language plpgsql
as $$
begin
  if current_user = 'authenticated' and not public.is_admin() then
    new.last_confirmed_at := old.last_confirmed_at;
    new.flags_cleared_at := old.flags_cleared_at;
    new.availability_confirmed_at := old.availability_confirmed_at;
  end if;
  -- Flipping the availability switch counts as answering the question.
  if new.availability is distinct from old.availability then
    new.availability_confirmed_at := now();
  end if;
  return new;
end;
$$;

create trigger worker_profiles_guard_confirmation
  before update on public.worker_profiles
  for each row execute function public.guard_worker_confirmation_columns();

create table if not exists public.unlock_feedback (
  id uuid primary key default gen_random_uuid(),
  unlock_id uuid not null unique references public.unlocks(id) on delete cascade,
  worker_profile_id uuid not null references public.worker_profiles(id) on delete cascade,
  client_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  outcome text not null check (outcome in ('reached_available', 'reached_unavailable', 'not_reached')),
  created_at timestamptz not null default now()
);

alter table public.unlock_feedback enable row level security;

create policy "Clients answer for their own unlocks"
  on public.unlock_feedback for insert
  with check (
    client_id = auth.uid()
    and exists (
      select 1 from public.unlocks u
      join public.subscriptions s on s.id = u.subscription_id
      where u.id = unlock_feedback.unlock_id
        and u.worker_profile_id = unlock_feedback.worker_profile_id
        and s.client_id = auth.uid()
    )
  );

create policy "Clients read their own feedback, admins read all"
  on public.unlock_feedback for select
  using (client_id = auth.uid() or public.is_admin());

grant select, insert on public.unlock_feedback to authenticated;

-- Every bad experience in one place: explicit reports plus bad feedback
-- answers. Internal only - no one can read it directly.
create or replace view public.worker_negative_events as
  select worker_profile_id, client_id, created_at from public.worker_reports
  union all
  select worker_profile_id, client_id, created_at from public.unlock_feedback
  where outcome in ('reached_unavailable', 'not_reached');

revoke all on public.worker_negative_events from anon, authenticated;

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
     or (w.availability = 'available'
         and w.availability_confirmed_at < now() - interval '28 days')
     or (
       select count(distinct e.client_id)
       from public.worker_negative_events e
       where e.worker_profile_id = w.id
         and e.created_at > greatest(w.last_confirmed_at, coalesce(w.flags_cleared_at, '-infinity'))
     ) >= 2
     or (
       select count(distinct e.client_id)
       from public.worker_negative_events e
       where e.worker_profile_id = w.id
         and e.created_at > greatest(now() - interval '90 days', coalesce(w.flags_cleared_at, '-infinity'))
     ) >= 3;
$$;

-- Bad experiences since the worker last confirmed (or an admin cleared them).
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
    select count(distinct e.client_id)::integer
    from public.worker_negative_events e
    join public.worker_profiles w on w.id = e.worker_profile_id
    where e.worker_profile_id = p_worker_profile_id
      and e.created_at > greatest(w.last_confirmed_at, coalesce(w.flags_cleared_at, '-infinity'))
  );
end;
$$;

-- Is this worker currently hidden from clients? Only they (or an admin) may ask.
create or replace function public.get_worker_is_hidden(p_worker_profile_id uuid)
returns boolean
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
    return false;
  end if;

  return exists (select 1 from public.get_hidden_worker_ids() h where h = p_worker_profile_id);
end;
$$;

grant execute on function public.get_worker_is_hidden(uuid) to authenticated;

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
    select count(distinct e.worker_profile_id)::integer
    from public.worker_negative_events e
    join public.worker_profiles w on w.id = e.worker_profile_id
    where e.created_at > greatest(w.last_confirmed_at, coalesce(w.flags_cleared_at, '-infinity'))
  );
end;
$$;

-- Admin list: workers with an open bad experience, or 2+ in the last 90 days.
create or replace function public.get_flagged_workers()
returns table (
  worker_profile_id uuid,
  open_count integer,
  count_90_days integer,
  is_hidden boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return;
  end if;

  return query
  select
    w.id,
    (select count(distinct e.client_id)::integer from public.worker_negative_events e
      where e.worker_profile_id = w.id
        and e.created_at > greatest(w.last_confirmed_at, coalesce(w.flags_cleared_at, '-infinity'))),
    (select count(distinct e.client_id)::integer from public.worker_negative_events e
      where e.worker_profile_id = w.id
        and e.created_at > greatest(now() - interval '90 days', coalesce(w.flags_cleared_at, '-infinity'))),
    exists (select 1 from public.get_hidden_worker_ids() h where h = w.id)
  from public.worker_profiles w
  where (select count(distinct e.client_id) from public.worker_negative_events e
          where e.worker_profile_id = w.id
            and e.created_at > greatest(w.last_confirmed_at, coalesce(w.flags_cleared_at, '-infinity'))) >= 1
     or (select count(distinct e.client_id) from public.worker_negative_events e
          where e.worker_profile_id = w.id
            and e.created_at > greatest(now() - interval '90 days', coalesce(w.flags_cleared_at, '-infinity'))) >= 2;
end;
$$;

grant execute on function public.get_flagged_workers() to authenticated;

-- Admin: wipe a worker's bad-experience record after looking into it.
create or replace function public.clear_worker_flags(p_worker_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only.';
  end if;
  update public.worker_profiles set flags_cleared_at = now() where id = p_worker_profile_id;
end;
$$;

grant execute on function public.clear_worker_flags(uuid) to authenticated;

-- The worker's answers to the check-ins (server clock, see phase 14).
create or replace function public.confirm_worker_details(p_still_available boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.worker_profiles
  set last_confirmed_at = now(),
      availability_confirmed_at = now(),
      availability = case when p_still_available then 'available' else 'unavailable' end
  where user_id = auth.uid();
end;
$$;

-- The quick 2-weekly "still available?" tap: refreshes availability only.
-- It deliberately does NOT clear reports - only the full confirmation does.
create or replace function public.confirm_availability(p_still_available boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.worker_profiles
  set availability_confirmed_at = now(),
      availability = case when p_still_available then 'available' else 'unavailable' end
  where user_id = auth.uid();
end;
$$;

grant execute on function public.confirm_availability(boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Part 2: "ask the worker before unlocking". A client with an active
-- subscription asks a worker "are you available?" (free, uses no slot). The
-- worker has 24 hours to answer Yes/No. An unlock is only allowed after a
-- Yes given in the last 48 hours - enforced by a trigger on unlocks.
-- A request that expires unanswered counts as a bad experience (below).
-- ---------------------------------------------------------------------------

create table if not exists public.availability_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  worker_profile_id uuid not null references public.worker_profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'available', 'unavailable')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  responded_at timestamptz
);

alter table public.availability_requests enable row level security;

create policy "Clients with an active subscription ask about workers"
  on public.availability_requests for insert
  with check (
    client_id = auth.uid()
    and status = 'pending'
    and exists (
      select 1 from public.subscriptions s
      where s.client_id = auth.uid() and s.expires_at > now()
    )
  );

create policy "Clients read their own requests, admins read all"
  on public.availability_requests for select
  using (client_id = auth.uid() or public.is_admin());

grant select, insert on public.availability_requests to authenticated;
-- Workers never read this table (they must not learn who asked); they use
-- get_my_pending_availability_requests / respond_availability_request.

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

create trigger availability_requests_limit
  before insert on public.availability_requests
  for each row execute function public.limit_availability_requests();

create or replace function public.get_my_pending_availability_requests()
returns table (id uuid, created_at timestamptz, expires_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.created_at, r.expires_at
  from public.availability_requests r
  join public.worker_profiles w on w.id = r.worker_profile_id
  where w.user_id = auth.uid() and r.status = 'pending' and r.expires_at > now()
  order by r.created_at;
$$;

grant execute on function public.get_my_pending_availability_requests() to authenticated;

-- A Yes refreshes the worker's availability date; a No marks them
-- unavailable and closes every other open request about them.
create or replace function public.respond_availability_request(p_request_id uuid, p_available boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_worker uuid;
begin
  select r.worker_profile_id into v_worker
  from public.availability_requests r
  join public.worker_profiles w on w.id = r.worker_profile_id
  where r.id = p_request_id and w.user_id = auth.uid()
    and r.status = 'pending' and r.expires_at > now();

  if v_worker is null then
    raise exception 'This request is no longer open.';
  end if;

  update public.availability_requests
  set status = case when p_available then 'available' else 'unavailable' end,
      responded_at = now()
  where id = p_request_id;

  update public.worker_profiles
  set availability_confirmed_at = now(),
      availability = case when p_available then 'available' else 'unavailable' end
  where id = v_worker;

  if not p_available then
    update public.availability_requests
    set status = 'unavailable', responded_at = now()
    where worker_profile_id = v_worker and status = 'pending';
  end if;
end;
$$;

grant execute on function public.respond_availability_request(uuid, boolean) to authenticated;

create or replace function public.require_confirmed_availability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client uuid;
begin
  select s.client_id into v_client from public.subscriptions s where s.id = new.subscription_id;

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

create trigger unlocks_require_confirmed_availability
  before insert on public.unlocks
  for each row execute function public.require_confirmed_availability();

alter table public.worker_profiles
  add column if not exists response_terms_accepted_at timestamptz;

-- An unanswered, expired request now counts as a bad experience too.
create or replace view public.worker_negative_events as
  select worker_profile_id, client_id, created_at from public.worker_reports
  union all
  select worker_profile_id, client_id, created_at from public.unlock_feedback
  where outcome in ('reached_unavailable', 'not_reached')
  union all
  select worker_profile_id, client_id, expires_at from public.availability_requests
  where status = 'pending' and expires_at < now();

revoke all on public.worker_negative_events from anon, authenticated;
