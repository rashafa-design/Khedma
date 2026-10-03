-- Phase 20: the transportation fee a visit worker charges per visit.
-- Run this once in Supabase: dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- transport_fee is in EGP per visit; 0 means "no extra charge". NULL means the
-- worker has not said yet - visit workers with NULL stay out of the Visits tab
-- (checked in the app) until they fill it in.

alter table public.worker_profiles
  add column if not exists transport_fee numeric(10,2);

alter table public.worker_profiles
  add constraint worker_profiles_transport_fee_valid
  check (transport_fee is null or (transport_fee >= 0 and transport_fee <= 10000));
