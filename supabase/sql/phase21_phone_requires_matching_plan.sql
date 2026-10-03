-- SUPERSEDED by phase23_unlock_follows_paid_plan.sql (the "matching plan only"
-- rule below was replaced: a paid worker now shows under both plans).
-- Phase 21: a phone number is only revealed under a plan that fits the worker.
-- Run this once in Supabase: dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- Before the two plans existed, unlocks were not tied to a kind of worker, so
-- an old unlock of a visits-only worker under a monthly plan still revealed
-- the number. Now get_worker_phone_number() requires the unlock's plan to be
-- one of the worker's work_types. (New unlocks are already refused by the
-- trigger from phase 18; this closes the door on the old ones.)

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
    join public.worker_profiles w on w.id = u.worker_profile_id
    where u.worker_profile_id = p_worker_profile_id
      and s.client_id = auth.uid()
      and s.expires_at > now()
      and s.plan = any (w.work_types)
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
