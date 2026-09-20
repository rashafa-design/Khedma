-- Phase 7: spending unlock slots, and the only path to a phone number.
-- Run this once in Supabase: dashboard -> SQL Editor -> New query -> paste -> Run.

create table if not exists public.unlocks (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  worker_profile_id uuid not null references public.worker_profiles(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique (subscription_id, worker_profile_id)
);

alter table public.unlocks enable row level security;

create policy "Clients read their own unlocks, admins read all"
  on public.unlocks for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.subscriptions s
      where s.id = subscription_id and s.client_id = auth.uid()
    )
  );

create policy "Clients create unlocks against their own active subscription"
  on public.unlocks for insert
  with check (
    exists (
      select 1 from public.subscriptions s
      where s.id = subscription_id and s.client_id = auth.uid() and s.expires_at > now()
    )
  );

grant select, insert on public.unlocks to authenticated;
-- No update/delete grant: an unlock is a one-way spend for the month, not
-- a swappable cart.

-- Enforces "never an 11th unlock" at the database level, independent of
-- anything the RLS insert policy already checked.
create or replace function public.enforce_unlock_slot_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  used int;
  total int;
begin
  select count(*) into used from public.unlocks where subscription_id = new.subscription_id;
  select slots_total into total from public.subscriptions where id = new.subscription_id;

  if used >= total then
    raise exception 'This subscription has already used all % of its unlock slots.', total;
  end if;

  return new;
end;
$$;

create trigger unlocks_enforce_slot_limit
  before insert on public.unlocks
  for each row execute function public.enforce_unlock_slot_limit();

-- Reveals a worker's phone number (stored on their own profiles row, same
-- one collected at sign-up) ONLY if the caller has a live, unexpired
-- unlock for that worker, or is an admin. profiles already has no
-- cross-user select policy (Phase 0), so this function is deliberately
-- the one sanctioned crack in that wall - and only in one direction, only
-- when paid for. Re-locking after a month needs no cron job: expires_at
-- > now() is simply checked live every time this is called.
create or replace function public.get_worker_phone_number(p_worker_profile_id uuid)
returns text
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  result text;
  has_active_unlock boolean;
begin
  select exists (
    select 1
    from public.unlocks u
    join public.subscriptions s on s.id = u.subscription_id
    where u.worker_profile_id = p_worker_profile_id
      and s.client_id = auth.uid()
      and s.expires_at > now()
  ) into has_active_unlock;

  if not has_active_unlock and not public.is_admin() then
    return null;
  end if;

  select p.phone_number into result
  from public.worker_profiles wp
  join public.profiles p on p.id = wp.user_id
  where wp.id = p_worker_profile_id;

  return result;
end;
$$;

grant execute on function public.get_worker_phone_number(uuid) to authenticated;
