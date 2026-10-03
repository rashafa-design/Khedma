-- Phase 19: a worker only shows to clients once the listing is complete.
-- Run this once in Supabase: dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- Complete means: a phone number on file and at least one priced task (plus,
-- checked in the app: a work location, work type, and a neighborhood for
-- visit workers). Only worker ids are returned, never phone numbers.

create or replace function public.get_incomplete_worker_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select w.id
  from public.worker_profiles w
  join public.profiles p on p.id = w.user_id
  where coalesce(btrim(p.phone_number), '') = ''
     or not exists (
       select 1 from public.worker_task_entries e where e.worker_profile_id = w.id
     );
$$;

grant execute on function public.get_incomplete_worker_ids() to authenticated;
