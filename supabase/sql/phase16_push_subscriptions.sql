-- Phase 16: phone/browser push notifications.
-- Run this once in Supabase: dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- push_subscriptions: one row per phone/browser a user turned notifications
-- on for. The app's server (service role) reads these to send pushes; users
-- manage only their own rows.
-- availability_requests.push_sent_at / answer_push_sent_at: make sure each
-- availability request notifies the worker once, and the answer notifies the
-- client once, however many times the app calls the notify route.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "Users manage their own push subscriptions"
  on public.push_subscriptions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.push_subscriptions to authenticated;

alter table public.availability_requests
  add column if not exists push_sent_at timestamptz,
  add column if not exists answer_push_sent_at timestamptz;
