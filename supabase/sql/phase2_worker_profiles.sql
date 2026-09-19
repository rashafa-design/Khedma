-- Phase 2: worker profiles. Hidden from clients (status stays
-- 'pending_review') until an admin manually approves the uploaded ID.
-- Run this once in Supabase: dashboard -> SQL Editor -> New query -> paste -> Run.

create table if not exists public.worker_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  profession_id uuid not null references public.professions(id) on delete restrict,
  nationality text not null,
  years_experience numeric(4,1) not null default 0,
  photo_path text,
  id_document_path text not null,
  availability text not null default 'available' check (availability in ('available', 'unavailable')),
  status text not null default 'pending_review' check (status in ('pending_review', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.worker_profiles enable row level security;

create policy "Workers manage their own profile, admins manage all"
  on public.worker_profiles for all
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

create policy "Clients read approved worker profiles"
  on public.worker_profiles for select
  using (status = 'approved');

grant select, insert, update, delete on public.worker_profiles to authenticated;

-- Prevents a worker from approving/rejecting their own profile through a
-- normal update call - same self-escalation pattern as Phase 0's profiles
-- trigger. Bootstrap note: this ALSO blocks admin actions run directly
-- from the SQL Editor (auth.uid() is null there) - use the same
-- disable-trigger/update/enable-trigger dance documented in the README
-- if you ever need to approve a worker manually via SQL instead of the
-- admin screen.
create or replace function public.prevent_worker_self_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() and (
    new.status <> old.status
    or new.reviewed_by is distinct from old.reviewed_by
    or new.reviewed_at is distinct from old.reviewed_at
  ) then
    raise exception 'Only an admin can review a worker profile.';
  end if;
  return new;
end;
$$;

create trigger worker_profiles_prevent_self_review
  before update on public.worker_profiles
  for each row execute function public.prevent_worker_self_review();

-- Public bucket: a profile photo has no privacy requirement, so plain
-- <img src> works with no signed-URL round trip.
insert into storage.buckets (id, name, public)
values ('worker-photos', 'worker-photos', true)
on conflict (id) do nothing;

create policy "Workers upload their own photo"
  on storage.objects for insert
  with check (bucket_id = 'worker-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Workers replace their own photo"
  on storage.objects for update
  using (bucket_id = 'worker-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Workers delete their own photo"
  on storage.objects for delete
  using (bucket_id = 'worker-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Anyone can view profile photos"
  on storage.objects for select
  using (bucket_id = 'worker-photos');

-- Private bucket: this is the ID/residency document. Visible only to
-- admin, never to clients, at any point - so there is deliberately no
-- select policy at all here, not even for the worker who uploaded it. The
-- only read path (from Phase 4 onward) is an admin-only, service-role API
-- route that checks the caller's role server-side before issuing a
-- short-lived signed URL.
insert into storage.buckets (id, name, public)
values ('worker-id-documents', 'worker-id-documents', false)
on conflict (id) do nothing;

create policy "Workers upload their own ID document"
  on storage.objects for insert
  with check (bucket_id = 'worker-id-documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Workers replace their own ID document"
  on storage.objects for update
  using (bucket_id = 'worker-id-documents' and (storage.foldername(name))[1] = auth.uid()::text);
