-- Phase 12: remembering which workers a client has already looked at.
-- Run this once in Supabase: dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- One row per (client, worker): the first time that worker's card stayed on
-- the client's screen long enough to be read. It is never deleted when a
-- subscription expires, so after a month the client can still tell who they
-- have seen (and who is new to them).

create table if not exists public.worker_views (
  client_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  worker_profile_id uuid not null references public.worker_profiles(id) on delete cascade,
  first_viewed_at timestamptz not null default now(),
  primary key (client_id, worker_profile_id)
);

alter table public.worker_views enable row level security;

create policy "Clients read their own views"
  on public.worker_views for select
  using (client_id = auth.uid());

create policy "Clients record their own views"
  on public.worker_views for insert
  with check (client_id = auth.uid());

-- Tables created through raw SQL need the grant spelled out.
grant select, insert on public.worker_views to authenticated;
-- No update/delete: the "first seen" date is a record, not something to edit.
