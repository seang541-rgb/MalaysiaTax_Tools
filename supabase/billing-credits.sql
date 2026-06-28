-- MYTax billing and credits schema.
-- Run in Supabase SQL Editor before enabling paid features.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  stripe_customer_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_balances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null,
  kind text not null check (kind in ('purchase', 'usage', 'refund', 'adjustment')),
  feature text,
  description text,
  stripe_session_id text,
  stripe_event_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists credit_transactions_stripe_session_id_key
  on public.credit_transactions (stripe_session_id)
  where stripe_session_id is not null;

create unique index if not exists credit_transactions_signup_bonus_key
  on public.credit_transactions (user_id, feature)
  where kind = 'adjustment' and feature = 'signup_bonus';

create table if not exists public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  feature text not null,
  credits_charged integer not null default 0,
  status text not null check (status in ('success', 'blocked', 'failed')),
  error_code text,
  request_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now(),
  payload jsonb not null
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists credit_balances_set_updated_at on public.credit_balances;
create trigger credit_balances_set_updated_at
before update on public.credit_balances
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;

  insert into public.credit_balances (user_id, balance)
  values (new.id, 0)
  on conflict (user_id) do nothing;

  insert into public.credit_transactions (
    user_id,
    amount,
    kind,
    feature,
    description,
    metadata
  )
  values (
    new.id,
    5,
    'adjustment',
    'signup_bonus',
    'New user signup bonus',
    jsonb_build_object('source', 'auth.users trigger')
  )
  on conflict (user_id, feature)
    where kind = 'adjustment' and feature = 'signup_bonus'
    do nothing;

  if found then
    update public.credit_balances
    set balance = balance + 5
    where user_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.credit_balances enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.usage_logs enable row level security;
alter table public.stripe_events enable row level security;

grant select on public.profiles, public.credit_balances, public.credit_transactions, public.usage_logs
  to authenticated;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can read their own credit balance" on public.credit_balances;
create policy "Users can read their own credit balance"
on public.credit_balances for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read their own credit transactions" on public.credit_transactions;
create policy "Users can read their own credit transactions"
on public.credit_transactions for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read their own usage logs" on public.usage_logs;
create policy "Users can read their own usage logs"
on public.usage_logs for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.grant_credits(
  p_user_id uuid,
  p_amount integer,
  p_stripe_session_id text,
  p_stripe_event_id text,
  p_metadata jsonb default '{}'::jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_amount <= 0 then
    raise exception 'credit grant amount must be positive';
  end if;

  insert into public.credit_balances (user_id, balance)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  if exists (
    select 1
    from public.credit_transactions
    where stripe_session_id = p_stripe_session_id
  ) then
    select balance into v_balance
    from public.credit_balances
    where user_id = p_user_id;

    return v_balance;
  end if;

  update public.credit_balances
  set balance = balance + p_amount
  where user_id = p_user_id
  returning balance into v_balance;

  insert into public.credit_transactions (
    user_id,
    amount,
    kind,
    description,
    stripe_session_id,
    stripe_event_id,
    metadata
  )
  values (
    p_user_id,
    p_amount,
    'purchase',
    'Stripe credit pack purchase',
    p_stripe_session_id,
    p_stripe_event_id,
    p_metadata
  );

  return v_balance;
end;
$$;

create or replace function public.consume_credits(
  p_user_id uuid,
  p_feature text,
  p_amount integer,
  p_request_summary jsonb default '{}'::jsonb
)
returns table(success boolean, balance integer, required integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_amount <= 0 then
    raise exception 'credit usage amount must be positive';
  end if;

  insert into public.credit_balances (user_id, balance)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  select cb.balance into v_balance
  from public.credit_balances cb
  where cb.user_id = p_user_id
  for update;

  if v_balance < p_amount then
    insert into public.usage_logs (
      user_id,
      feature,
      credits_charged,
      status,
      error_code,
      request_summary
    )
    values (
      p_user_id,
      p_feature,
      0,
      'blocked',
      'INSUFFICIENT_CREDITS',
      p_request_summary
    );

    return query select false, v_balance, p_amount;
    return;
  end if;

  update public.credit_balances cb
  set balance = cb.balance - p_amount
  where cb.user_id = p_user_id
  returning cb.balance into v_balance;

  insert into public.credit_transactions (
    user_id,
    amount,
    kind,
    feature,
    description,
    metadata
  )
  values (
    p_user_id,
    -p_amount,
    'usage',
    p_feature,
    'Paid feature usage',
    p_request_summary
  );

  insert into public.usage_logs (
    user_id,
    feature,
    credits_charged,
    status,
    request_summary
  )
  values (
    p_user_id,
    p_feature,
    p_amount,
    'success',
    p_request_summary
  );

  return query select true, v_balance, p_amount;
end;
$$;

create or replace function public.refund_credits(
  p_user_id uuid,
  p_feature text,
  p_amount integer,
  p_error_code text,
  p_metadata jsonb default '{}'::jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_amount <= 0 then
    raise exception 'refund amount must be positive';
  end if;

  insert into public.credit_balances (user_id, balance)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  update public.credit_balances
  set balance = balance + p_amount
  where user_id = p_user_id
  returning balance into v_balance;

  insert into public.credit_transactions (
    user_id,
    amount,
    kind,
    feature,
    description,
    metadata
  )
  values (
    p_user_id,
    p_amount,
    'refund',
    p_feature,
    'Automatic refund after provider failure',
    p_metadata
  );

  insert into public.usage_logs (
    user_id,
    feature,
    credits_charged,
    status,
    error_code,
    request_summary
  )
  values (
    p_user_id,
    p_feature,
    0,
    'failed',
    p_error_code,
    p_metadata
  );

  return v_balance;
end;
$$;

revoke execute on function public.grant_credits(uuid, integer, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.consume_credits(uuid, text, integer, jsonb) from public, anon, authenticated;
revoke execute on function public.refund_credits(uuid, text, integer, text, jsonb) from public, anon, authenticated;

grant execute on function public.grant_credits(uuid, integer, text, text, jsonb) to service_role;
grant execute on function public.consume_credits(uuid, text, integer, jsonb) to service_role;
grant execute on function public.refund_credits(uuid, text, integer, text, jsonb) to service_role;
