-- Phase 25: an unanswered availability request moves a worker DOWN the list,
-- it no longer hides them.
-- Run this once in Supabase: dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- * Unanswered (expired) requests are removed from worker_negative_events, so
--   they stop counting toward the "2 clients / 3 in 90 days" hiding rules.
--   Reports and bad follow-up answers still count.
-- * get_unresponsive_worker_ids(): workers with a question that expired
--   unanswered since they last answered/confirmed, in the last 30 days.
--   Browse lists them last (with a "slow to reply" tag). Answering any later
--   question, or tapping "still available", clears it straight away; it also
--   clears by itself after 30 days.

create or replace view public.worker_negative_events as
  select worker_profile_id, client_id, created_at from public.worker_reports
  union all
  select worker_profile_id, client_id, created_at from public.unlock_feedback
  where outcome in ('reached_unavailable', 'not_reached');

create or replace function public.get_unresponsive_worker_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select w.id
  from public.worker_profiles w
  where exists (
    select 1
    from public.availability_requests r
    where r.worker_profile_id = w.id
      and r.status = 'pending'
      and r.expires_at < now()
      and r.expires_at > w.availability_confirmed_at
      and r.expires_at > now() - interval '30 days'
  );
$$;

grant execute on function public.get_unresponsive_worker_ids() to authenticated;
