-- Phase 23: a worker you paid for under one plan is visible under the other
-- too - but only for as long as the plan you PAID with lasts, and never
-- counted twice.
-- Run this once in Supabase: dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- THIS REPLACES phase 21 and phase 22 (both are superseded - do not run them
-- on a fresh database, or run this file after them):
--   * workers may offer monthly work, visit work, or both again;
--   * a phone number is revealed while the client has ANY live unlock of the
--     worker. Each unlock belongs to one subscription, so it expires with
--     that subscription: a visits-pass unlock stops after 3 days even if the
--     worker is also listed under the monthly plan;
--   * a client can never spend a second slot on a worker they already have a
--     live unlock for, whichever plan it was under.
-- (A NEW unlock still needs a plan that fits the worker's work_types - see
-- phase 18.)

alter table public.worker_profiles drop constraint if exists worker_profiles_work_types_valid;
alter table public.worker_profiles
  add constraint worker_profiles_work_types_valid
  check (work_types <@ array['monthly','visits']::text[] and cardinality(work_types) >= 1);

create or replace function public.get_worker_phone_number(p_worker_profile_id uuid)
returns text
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  result text;
  has_active_unlock boolean;
begin
  select exists (
    select 1
    from public.unlocks u
    join public.subscriptions s on s.id = u.subscription_id
    where u.worker_profile_id = p_worker_profile_id
      and s.client_id = auth.uid()
      and s.expires_at > now()
  ) into has_active_unlock;

  if not has_active_unlock and not public.is_admin() then
    return null;
  end if;

  select p.phone_number into result
  from public.worker_profiles wp
  join public.profiles p on p.id = wp.user_id
  where wp.id = p_worker_profile_id;

  return result;
end;
$$;

grant execute on function public.get_worker_phone_number(uuid) to authenticated;

create or replace function public.prevent_duplicate_unlock_across_plans()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client uuid;
begin
  select s.client_id into v_client from public.subscriptions s where s.id = new.subscription_id;

  if exists (
    select 1
    from public.unlocks u
    join public.subscriptions s on s.id = u.subscription_id
    where s.client_id = v_client
      and u.worker_profile_id = new.worker_profile_id
      and s.expires_at > now()
  ) then
    raise exception 'You already unlocked this worker - they are not counted twice.';
  end if;

  return new;
end;
$$;

drop trigger if exists unlocks_no_duplicate_across_plans on public.unlocks;
create trigger unlocks_no_duplicate_across_plans
  before insert on public.unlocks
  for each row execute function public.prevent_duplicate_unlock_across_plans();
