-- Grant 5 starter credits to each newly created Supabase Auth user.
-- This is idempotent per user id and only runs when auth.users inserts.

create unique index if not exists credit_transactions_signup_bonus_key
  on public.credit_transactions (user_id, feature)
  where kind = 'adjustment' and feature = 'signup_bonus';

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
