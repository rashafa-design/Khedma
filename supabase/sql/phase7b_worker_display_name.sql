-- Bugfix found while testing Phase 7: Phase 0's profiles RLS ("only your
-- own row, or an admin") correctly keeps phone numbers private, but it
-- also silently blocked reading a worker's NAME - which is supposed to
-- be public the moment their profile is approved (browsing is free, only
-- the phone number is gated). Same pattern as get_worker_phone_number,
-- but with no unlock check, since a name isn't sensitive.
-- Run this once in Supabase: dashboard -> SQL Editor -> New query -> paste -> Run.

create or replace function public.get_worker_display_name(p_worker_profile_id uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select p.full_name
  from public.worker_profiles wp
  join public.profiles p on p.id = wp.user_id
  where wp.id = p_worker_profile_id
    and (wp.status = 'approved' or public.is_admin());
$$;

grant execute on function public.get_worker_display_name(uuid) to authenticated;
