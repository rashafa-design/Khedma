-- Phase 22: a worker is EITHER a monthly worker OR a visit worker.
-- Run this once in Supabase: dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- Why: a phone number is one number. If a worker offered both kinds of work,
-- a client who paid for the monthly plan would also see them as a visit worker
-- without ever buying a visits pass. Making the groups exclusive keeps each
-- number behind exactly one plan. (A worker who really does both can register
-- a second account.)
--
-- Anyone who somehow has both is moved to 'visits'. The two test workers were
-- split so both plans stay testable.

update public.worker_profiles set work_types = array['monthly'] where id = '06cc461f-ce90-4d57-ad8d-3580f59099e8';
update public.worker_profiles set work_types = array['visits'] where id = '369d688e-46ce-4cb4-ba8a-17ba04463b1a';
update public.worker_profiles set work_types = array['visits'] where cardinality(work_types) <> 1;

alter table public.worker_profiles drop constraint if exists worker_profiles_work_types_valid;
alter table public.worker_profiles
  add constraint worker_profiles_work_types_valid
  check (work_types <@ array['monthly','visits']::text[] and cardinality(work_types) = 1);
