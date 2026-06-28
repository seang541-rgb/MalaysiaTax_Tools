-- Shared serverless-safe rate limiting for MYTax API routes.

create table if not exists public.rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  route text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_events_identifier_route_created_at_idx
  on public.rate_limit_events (identifier, route, created_at desc);

alter table public.rate_limit_events enable row level security;

revoke select, insert, update, delete on public.rate_limit_events
  from anon, authenticated;

create or replace function public.check_rate_limit(
  p_key text,
  p_route text,
  p_limit integer,
  p_window_seconds integer
)
returns table(allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_count integer;
  v_oldest timestamptz;
begin
  if p_limit <= 0 then
    raise exception 'rate limit must be positive';
  end if;
  if p_window_seconds <= 0 then
    raise exception 'rate limit window must be positive';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_route || ':' || p_key, 0));

  v_window_start := now() - make_interval(secs => p_window_seconds);

  delete from public.rate_limit_events
  where created_at < now() - interval '1 day';

  select count(*), min(created_at)
    into v_count, v_oldest
  from public.rate_limit_events
  where identifier = p_key
    and route = p_route
    and created_at >= v_window_start;

  if v_count >= p_limit then
    return query select
      false,
      0,
      coalesce(v_oldest + make_interval(secs => p_window_seconds), now());
    return;
  end if;

  insert into public.rate_limit_events (identifier, route)
  values (p_key, p_route);

  return query select
    true,
    greatest(p_limit - v_count - 1, 0),
    null::timestamptz;
end;
$$;

revoke execute on function public.check_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;

grant execute on function public.check_rate_limit(text, text, integer, integer)
  to service_role;
