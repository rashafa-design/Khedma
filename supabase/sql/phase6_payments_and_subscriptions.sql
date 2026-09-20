-- Phase 6: the manual payment-proof flow. status is designed to be
-- flipped by something other than an admin click later (a real gateway
-- webhook) without touching anything below this table - the trigger that
-- creates the subscription fires purely off the status column changing to
-- 'approved', regardless of what changed it.
-- Run this once in Supabase: dashboard -> SQL Editor -> New query -> paste -> Run.

create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(10,2) not null default 2000,
  currency text not null default 'EGP',
  payment_method text not null check (payment_method in ('instapay', 'vodafone_cash')),
  proof_screenshot_path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  rejection_reason text,
  external_reference text, -- left null for now; a future gateway integration fills this in
  created_at timestamptz not null default now()
);

alter table public.payment_requests enable row level security;

create policy "Clients manage their own payment requests, admins manage all"
  on public.payment_requests for all
  using (auth.uid() = client_id or public.is_admin())
  with check (auth.uid() = client_id or public.is_admin());

grant select, insert, update, delete on public.payment_requests to authenticated;

create or replace function public.prevent_client_self_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() and new.status <> old.status then
    raise exception 'Only an admin can change a payment request''s status.';
  end if;
  return new;
end;
$$;

create trigger payment_requests_prevent_self_approval
  before update on public.payment_requests
  for each row execute function public.prevent_client_self_approval();

-- Flat 10-slot, 1-month grant. Every approved payment creates a fresh row.
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  payment_request_id uuid references public.payment_requests(id),
  slots_total int not null default 10,
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "Clients read their own subscriptions, admins read all"
  on public.subscriptions for select
  using (auth.uid() = client_id or public.is_admin());

-- No insert/update/delete grant for regular clients at all - the only
-- writer is the trigger below, which (as a SECURITY DEFINER function)
-- writes regardless of the caller's own table grants.
grant select on public.subscriptions to authenticated;

create or replace function public.create_subscription_on_payment_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    insert into public.subscriptions (client_id, payment_request_id, slots_total, starts_at, expires_at)
    values (new.client_id, new.id, 10, now(), now() + interval '1 month');
  end if;
  return new;
end;
$$;

create trigger payment_requests_create_subscription
  after update on public.payment_requests
  for each row execute function public.create_subscription_on_payment_approval();

insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

create policy "Clients upload their own payment proof"
  on storage.objects for insert
  with check (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text);
-- No select/update/delete policies - a proof, once submitted, is final.
-- Admins view it exclusively through a service-role API route, same
-- pattern as Phase 4's worker ID documents.
