-- Phase 26: a worker can see how much attention their listing gets.
-- Run this once in Supabase: dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- get_worker_activity(worker_profile_id) returns counts only - never a client's
-- name, id or any detail - and only to the worker themself (or an admin):
--   viewed_only_*  clients whose screen showed the card but who never unlocked
--                  this worker (worker_views minus unlocks), all time / 30 days
--   asked_*        "are you available?" questions sent to the worker
--   answered_total / missed_total   how many they answered / let expire
--   unlocked_*     clients who paid to see the phone number

create or replace function public.get_worker_activity(p_worker_profile_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_since timestamptz := now() - interval '30 days';
begin
  if not (
    public.is_admin()
    or exists (
      select 1 from public.worker_profiles
      where id = p_worker_profile_id and user_id = auth.uid()
    )
  ) then
    return null;
  end if;

  return json_build_object(
    'viewed_only_total', (
      select count(distinct v.client_id)
      from public.worker_views v
      where v.worker_profile_id = p_worker_profile_id
        and not exists (
          select 1 from public.unlocks u
          join public.subscriptions s on s.id = u.subscription_id
          where u.worker_profile_id = p_worker_profile_id and s.client_id = v.client_id
        )
    ),
    'viewed_only_30d', (
      select count(distinct v.client_id)
      from public.worker_views v
      where v.worker_profile_id = p_worker_profile_id
        and v.first_viewed_at >= v_since
        and not exists (
          select 1 from public.unlocks u
          join public.subscriptions s on s.id = u.subscription_id
          where u.worker_profile_id = p_worker_profile_id and s.client_id = v.client_id
        )
    ),
    'asked_total', (select count(*) from public.availability_requests r where r.worker_profile_id = p_worker_profile_id),
    'asked_30d', (select count(*) from public.availability_requests r where r.worker_profile_id = p_worker_profile_id and r.created_at >= v_since),
    'answered_total', (select count(*) from public.availability_requests r where r.worker_profile_id = p_worker_profile_id and r.status <> 'pending'),
    'missed_total', (select count(*) from public.availability_requests r where r.worker_profile_id = p_worker_profile_id and r.status = 'pending' and r.expires_at < now()),
    'unlocked_total', (
      select count(distinct s.client_id)
      from public.unlocks u join public.subscriptions s on s.id = u.subscription_id
      where u.worker_profile_id = p_worker_profile_id
    ),
    'unlocked_30d', (
      select count(distinct s.client_id)
      from public.unlocks u join public.subscriptions s on s.id = u.subscription_id
      where u.worker_profile_id = p_worker_profile_id and u.unlocked_at >= v_since
    )
  );
end;
$$;

grant execute on function public.get_worker_activity(uuid) to authenticated;
