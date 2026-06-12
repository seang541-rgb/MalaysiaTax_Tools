# Billing Credits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first MYTax paid billing release with Stripe credit packs, Supabase Auth, a credit ledger, pricing/account UI, and 1-credit AI Tax gating.

**Architecture:** Keep the personal tax calculator free and unchanged. Add Supabase SSR auth for cookie-backed server/client sessions, Stripe Checkout for one-time credit packs, Postgres RPC functions for atomic credit grants/consumption, and server routes for checkout, balance, webhook, and AI credit gating. The first paid gate is AI Tax; other calculators remain free until they are migrated behind protected API routes.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, next-intl, Supabase Auth/Postgres/RLS, `@supabase/ssr`, Stripe Checkout, Vitest.

---

## File Structure

Create:

- `supabase/billing-credits.sql`: Migration SQL for profiles, credit tables, RLS policies, triggers, and RPC functions.
- `src/lib/supabase/browser.ts`: Browser Supabase client using `@supabase/ssr`.
- `src/lib/supabase/server.ts`: Server Supabase client using request cookies.
- `src/lib/supabase/admin.ts`: Server-only service-role Supabase client.
- `src/lib/billing/plans.ts`: Credit pack and feature-cost config.
- `src/lib/billing/errors.ts`: Stable billing error codes and response helpers.
- `src/lib/billing/credits.ts`: Balance, credit grant, usage, and refund helpers.
- `src/lib/stripe.ts`: Server-only Stripe client.
- `src/app/api/billing/checkout/route.ts`: Checkout Session creation endpoint.
- `src/app/api/billing/balance/route.ts`: Authenticated balance endpoint.
- `src/app/api/billing/stripe/webhook/route.ts`: Stripe webhook endpoint.
- `src/app/[locale]/pricing/page.tsx`: Pricing page.
- `src/app/[locale]/billing/success/page.tsx`: Checkout success page.
- `src/app/[locale]/account/page.tsx`: Account and credit history page.
- `src/components/auth-button.tsx`: Sign-in/sign-out UI.
- `src/components/checkout-button.tsx`: Client checkout button.
- `src/components/credit-balance.tsx`: Header/account balance display.
- `src/components/pricing-cards.tsx`: Pricing cards.
- `tests/billing/plans.test.ts`: Plan and cost config tests.
- `tests/billing/errors.test.ts`: Error response tests.
- `tests/billing/credits.test.ts`: Credit helper tests with mocked Supabase RPC.

Modify:

- `package.json` and `package-lock.json`: Add `@supabase/ssr` and `stripe`.
- `src/middleware.ts`: Preserve next-intl routing and refresh Supabase sessions.
- `src/lib/supabase.ts`: Keep compatibility export or redirect to the browser client.
- `src/components/header.tsx`: Add Pricing, auth control, and credit balance.
- `src/components/tax-chat.tsx`: Handle auth/credit errors and show paid UX.
- `src/app/api/chat/route.ts`: Require auth for POST and consume/refund one AI credit around provider calls.
- `src/messages/en.json`, `src/messages/zh.json`, `src/messages/ms.json`: Add pricing/auth/billing copy.
- `src/app/sitemap.ts`: Add pricing and account-safe public pricing route.
- `DEPLOYMENT.md`: Document billing env vars and Stripe webhook setup.

---

### Task 1: Dependencies and Billing Config

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/lib/billing/plans.ts`
- Create: `src/lib/billing/errors.ts`
- Test: `tests/billing/plans.test.ts`
- Test: `tests/billing/errors.test.ts`

- [ ] **Step 1: Install dependencies**

Run:

```powershell
npm install @supabase/ssr stripe
```

Expected:

- `package.json` contains `@supabase/ssr` and `stripe`.
- `package-lock.json` is updated.

- [ ] **Step 2: Write plan config tests**

Create `tests/billing/plans.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  BILLING_FEATURE_COSTS,
  BILLING_PACKS,
  getBillingPack,
  getStripePriceEnvName,
} from "@/lib/billing/plans";

describe("billing plans", () => {
  it("defines the approved credit packs", () => {
    expect(BILLING_PACKS).toEqual([
      {
        id: "starter",
        name: "Starter",
        priceMyr: 9,
        credits: 10,
        stripePriceEnv: "STRIPE_PRICE_STARTER",
      },
      {
        id: "pro",
        name: "Pro",
        priceMyr: 29,
        credits: 40,
        stripePriceEnv: "STRIPE_PRICE_PRO",
      },
      {
        id: "business",
        name: "Business",
        priceMyr: 79,
        credits: 120,
        stripePriceEnv: "STRIPE_PRICE_BUSINESS",
      },
    ]);
  });

  it("looks up packs by id", () => {
    expect(getBillingPack("pro")?.credits).toBe(40);
    expect(getBillingPack("unknown")).toBeNull();
  });

  it("maps pack ids to Stripe price env var names", () => {
    expect(getStripePriceEnvName("business")).toBe("STRIPE_PRICE_BUSINESS");
    expect(getStripePriceEnvName("missing")).toBeNull();
  });

  it("keeps all paid feature costs as positive integers", () => {
    for (const [feature, cost] of Object.entries(BILLING_FEATURE_COSTS)) {
      expect(feature.length).toBeGreaterThan(0);
      expect(Number.isInteger(cost)).toBe(true);
      expect(cost).toBeGreaterThan(0);
    }
  });

  it("charges AI Tax one credit", () => {
    expect(BILLING_FEATURE_COSTS.ai_tax_question).toBe(1);
  });
});
```

- [ ] **Step 3: Write billing error tests**

Create `tests/billing/errors.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { billingErrorResponse } from "@/lib/billing/errors";

describe("billing error responses", () => {
  it("serializes auth errors with a stable code", async () => {
    const res = billingErrorResponse("AUTH_REQUIRED", 401, "Please sign in.");
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      error: {
        code: "AUTH_REQUIRED",
        message: "Please sign in.",
      },
    });
  });

  it("includes optional details", async () => {
    const res = billingErrorResponse(
      "INSUFFICIENT_CREDITS",
      402,
      "Not enough credits.",
      { requiredCredits: 1, balance: 0 }
    );
    await expect(res.json()).resolves.toEqual({
      error: {
        code: "INSUFFICIENT_CREDITS",
        message: "Not enough credits.",
        details: { requiredCredits: 1, balance: 0 },
      },
    });
  });
});
```

- [ ] **Step 4: Run tests and verify they fail**

Run:

```powershell
npm test -- tests/billing/plans.test.ts tests/billing/errors.test.ts
```

Expected:

- FAIL because `src/lib/billing/plans.ts` and `src/lib/billing/errors.ts` do not exist.

- [ ] **Step 5: Implement billing plan config**

Create `src/lib/billing/plans.ts`:

```ts
export type BillingPackId = "starter" | "pro" | "business";

export interface BillingPack {
  id: BillingPackId;
  name: string;
  priceMyr: number;
  credits: number;
  stripePriceEnv: string;
}

export const BILLING_PACKS: BillingPack[] = [
  {
    id: "starter",
    name: "Starter",
    priceMyr: 9,
    credits: 10,
    stripePriceEnv: "STRIPE_PRICE_STARTER",
  },
  {
    id: "pro",
    name: "Pro",
    priceMyr: 29,
    credits: 40,
    stripePriceEnv: "STRIPE_PRICE_PRO",
  },
  {
    id: "business",
    name: "Business",
    priceMyr: 79,
    credits: 120,
    stripePriceEnv: "STRIPE_PRICE_BUSINESS",
  },
];

export const BILLING_FEATURE_COSTS = {
  ai_tax_question: 1,
  corporate_tax_calculation: 2,
  sst_calculation: 2,
  employer_obligations_calculation: 2,
  property_calculation: 2,
  batch_pcb_run: 5,
  corporate_tools_run: 5,
} as const;

export type BillingFeature = keyof typeof BILLING_FEATURE_COSTS;

export function getBillingPack(packId: string): BillingPack | null {
  return BILLING_PACKS.find((pack) => pack.id === packId) ?? null;
}

export function getStripePriceEnvName(packId: string): string | null {
  return getBillingPack(packId)?.stripePriceEnv ?? null;
}
```

- [ ] **Step 6: Implement billing errors**

Create `src/lib/billing/errors.ts`:

```ts
export type BillingErrorCode =
  | "AUTH_REQUIRED"
  | "INSUFFICIENT_CREDITS"
  | "INVALID_PACK"
  | "CHECKOUT_UNAVAILABLE"
  | "PAYMENT_NOT_CONFIRMED"
  | "WEBHOOK_SIGNATURE_INVALID"
  | "CREDIT_GRANT_FAILED"
  | "PROVIDER_FAILED_REFUNDED";

export interface BillingErrorBody {
  error: {
    code: BillingErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

export function billingErrorResponse(
  code: BillingErrorCode,
  status: number,
  message: string,
  details?: Record<string, unknown>
): Response {
  const body: BillingErrorBody = {
    error: details
      ? { code, message, details }
      : { code, message },
  };

  return Response.json(body, { status });
}
```

- [ ] **Step 7: Run tests and verify they pass**

Run:

```powershell
npm test -- tests/billing/plans.test.ts tests/billing/errors.test.ts
```

Expected:

- PASS for all billing config/error tests.

- [ ] **Step 8: Commit**

Run:

```powershell
git add package.json package-lock.json src/lib/billing/plans.ts src/lib/billing/errors.ts tests/billing/plans.test.ts tests/billing/errors.test.ts
git commit -m "feat: add billing plan config"
```

---

### Task 2: Supabase Billing Schema

**Files:**
- Create: `supabase/billing-credits.sql`

- [ ] **Step 1: Create migration SQL**

Create `supabase/billing-credits.sql`:

```sql
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

  update public.credit_balances
  set balance = balance - p_amount
  where user_id = p_user_id
  returning credit_balances.balance into v_balance;

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

grant execute on function public.grant_credits(uuid, integer, text, text, jsonb) to service_role;
grant execute on function public.consume_credits(uuid, text, integer, jsonb) to service_role;
grant execute on function public.refund_credits(uuid, text, integer, text, jsonb) to service_role;
```

- [ ] **Step 2: Validate SQL shape locally**

Run:

```powershell
rg -n "create table|create or replace function|enable row level security|create policy" supabase/billing-credits.sql
```

Expected:

- Output shows all five tables, three RPC functions, RLS enables, and read policies.

- [ ] **Step 3: Commit**

Run:

```powershell
git add supabase/billing-credits.sql
git commit -m "feat: add billing credits schema"
```

---

### Task 3: Supabase Clients and Credit Helpers

**Files:**
- Create: `src/lib/supabase/browser.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/admin.ts`
- Modify: `src/lib/supabase.ts`
- Create: `src/lib/billing/credits.ts`
- Test: `tests/billing/credits.test.ts`

- [ ] **Step 1: Write credit helper tests**

Create `tests/billing/credits.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import {
  consumeCreditsWithClient,
  getBalanceWithClient,
  refundCreditsWithClient,
} from "@/lib/billing/credits";

describe("billing credit helpers", () => {
  it("reads a missing balance as zero", async () => {
    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      })),
    };

    await expect(getBalanceWithClient(client, "user-1")).resolves.toBe(0);
  });

  it("returns the current balance", async () => {
    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { balance: 12 },
              error: null,
            }),
          })),
        })),
      })),
    };

    await expect(getBalanceWithClient(client, "user-1")).resolves.toBe(12);
  });

  it("throws insufficient credits when RPC reports blocked usage", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: [{ success: false, balance: 0, required: 1 }],
        error: null,
      }),
    };

    await expect(
      consumeCreditsWithClient(client, {
        userId: "user-1",
        feature: "ai_tax_question",
        amount: 1,
        requestSummary: { source: "test" },
      })
    ).rejects.toMatchObject({
      code: "INSUFFICIENT_CREDITS",
      balance: 0,
      required: 1,
    });
  });

  it("returns new balance when usage succeeds", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: [{ success: true, balance: 4, required: 1 }],
        error: null,
      }),
    };

    await expect(
      consumeCreditsWithClient(client, {
        userId: "user-1",
        feature: "ai_tax_question",
        amount: 1,
        requestSummary: {},
      })
    ).resolves.toEqual({ balance: 4, required: 1 });
  });

  it("refunds credits through RPC", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: 6, error: null }),
    };

    await expect(
      refundCreditsWithClient(client, {
        userId: "user-1",
        feature: "ai_tax_question",
        amount: 1,
        errorCode: "PROVIDER_FAILED_REFUNDED",
        metadata: { reason: "provider" },
      })
    ).resolves.toBe(6);
  });
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```powershell
npm test -- tests/billing/credits.test.ts
```

Expected:

- FAIL because `src/lib/billing/credits.ts` does not exist.

- [ ] **Step 3: Create browser Supabase client**

Create `src/lib/supabase/browser.ts`:

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 4: Create server Supabase client**

Create `src/lib/supabase/server.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot set cookies. Middleware refreshes sessions.
          }
        },
      },
    }
  );
}
```

- [ ] **Step 5: Create admin Supabase client**

Create `src/lib/supabase/admin.ts`:

```ts
import "server-only";
import { createClient } from "@supabase/supabase-js";

export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase admin env vars are not configured.");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
```

- [ ] **Step 6: Preserve existing Supabase export**

Modify `src/lib/supabase.ts`:

```ts
import { createSupabaseBrowserClient } from "./supabase/browser";

export const supabase = createSupabaseBrowserClient();
```

- [ ] **Step 7: Implement credit helpers**

Create `src/lib/billing/credits.ts`:

```ts
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { BillingFeature } from "./plans";

interface SupabaseLikeClient {
  from: (table: string) => unknown;
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{
    data: unknown;
    error: { message: string } | null;
  }>;
}

export class InsufficientCreditsError extends Error {
  code = "INSUFFICIENT_CREDITS" as const;

  constructor(
    public balance: number,
    public required: number
  ) {
    super("Insufficient credits.");
  }
}

export async function getBalanceWithClient(
  client: any,
  userId: string
): Promise<number> {
  const { data, error } = await client
    .from("credit_balances")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.balance ?? 0;
}

export async function getBalance(userId: string): Promise<number> {
  return getBalanceWithClient(createSupabaseAdminClient(), userId);
}

export async function grantCreditsWithClient(
  client: SupabaseLikeClient,
  input: {
    userId: string;
    amount: number;
    stripeSessionId: string;
    stripeEventId: string;
    metadata: Record<string, unknown>;
  }
): Promise<number> {
  const { data, error } = await client.rpc("grant_credits", {
    p_user_id: input.userId,
    p_amount: input.amount,
    p_stripe_session_id: input.stripeSessionId,
    p_stripe_event_id: input.stripeEventId,
    p_metadata: input.metadata,
  });

  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

export async function grantCredits(input: {
  userId: string;
  amount: number;
  stripeSessionId: string;
  stripeEventId: string;
  metadata: Record<string, unknown>;
}): Promise<number> {
  return grantCreditsWithClient(createSupabaseAdminClient(), input);
}

export async function consumeCreditsWithClient(
  client: SupabaseLikeClient,
  input: {
    userId: string;
    feature: BillingFeature;
    amount: number;
    requestSummary: Record<string, unknown>;
  }
): Promise<{ balance: number; required: number }> {
  const { data, error } = await client.rpc("consume_credits", {
    p_user_id: input.userId,
    p_feature: input.feature,
    p_amount: input.amount,
    p_request_summary: input.requestSummary,
  });

  if (error) throw new Error(error.message);

  const row = Array.isArray(data) ? data[0] : null;
  if (!row) throw new Error("Credit consumption returned no result.");

  if (!row.success) {
    throw new InsufficientCreditsError(
      Number(row.balance ?? 0),
      Number(row.required ?? input.amount)
    );
  }

  return {
    balance: Number(row.balance),
    required: Number(row.required),
  };
}

export async function consumeCredits(input: {
  userId: string;
  feature: BillingFeature;
  amount: number;
  requestSummary: Record<string, unknown>;
}): Promise<{ balance: number; required: number }> {
  return consumeCreditsWithClient(createSupabaseAdminClient(), input);
}

export async function refundCreditsWithClient(
  client: SupabaseLikeClient,
  input: {
    userId: string;
    feature: BillingFeature;
    amount: number;
    errorCode: string;
    metadata: Record<string, unknown>;
  }
): Promise<number> {
  const { data, error } = await client.rpc("refund_credits", {
    p_user_id: input.userId,
    p_feature: input.feature,
    p_amount: input.amount,
    p_error_code: input.errorCode,
    p_metadata: input.metadata,
  });

  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

export async function refundCredits(input: {
  userId: string;
  feature: BillingFeature;
  amount: number;
  errorCode: string;
  metadata: Record<string, unknown>;
}): Promise<number> {
  return refundCreditsWithClient(createSupabaseAdminClient(), input);
}
```

- [ ] **Step 8: Run tests**

Run:

```powershell
npm test -- tests/billing/credits.test.ts
```

Expected:

- PASS.

- [ ] **Step 9: Commit**

Run:

```powershell
git add src/lib/supabase.ts src/lib/supabase/browser.ts src/lib/supabase/server.ts src/lib/supabase/admin.ts src/lib/billing/credits.ts tests/billing/credits.test.ts
git commit -m "feat: add Supabase billing helpers"
```

---

### Task 4: Stripe Checkout and Webhook

**Files:**
- Create: `src/lib/stripe.ts`
- Create: `src/app/api/billing/checkout/route.ts`
- Create: `src/app/api/billing/balance/route.ts`
- Create: `src/app/api/billing/stripe/webhook/route.ts`

- [ ] **Step 1: Create Stripe client**

Create `src/lib/stripe.ts`:

```ts
import "server-only";
import Stripe from "stripe";

export function createStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured.");

  return new Stripe(key, {
    apiVersion: "2025-12-15.preview",
    typescript: true,
  });
}
```

- [ ] **Step 2: Create checkout endpoint**

Create `src/app/api/billing/checkout/route.ts`:

```ts
import { NextRequest } from "next/server";
import { billingErrorResponse } from "@/lib/billing/errors";
import { getBillingPack } from "@/lib/billing/plans";
import { createStripeClient } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return billingErrorResponse("AUTH_REQUIRED", 401, "Please sign in to buy credits.");
  }

  const { packId, locale = "en", returnTo } = await request.json();
  const pack = getBillingPack(String(packId));
  if (!pack) {
    return billingErrorResponse("INVALID_PACK", 400, "Unknown credit pack.");
  }

  const priceId = process.env[pack.stripePriceEnv];
  if (!priceId) {
    return billingErrorResponse(
      "CHECKOUT_UNAVAILABLE",
      503,
      "This credit pack is not configured yet."
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  const admin = createSupabaseAdminClient();
  const stripe = createStripeClient();

  const { data: profile, error } = await admin
    .from("profiles")
    .select("stripe_customer_id,email")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);

  let customerId = profile?.stripe_customer_id as string | null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;

    await admin.from("profiles").upsert({
      id: user.id,
      email: user.email,
      stripe_customer_id: customerId,
    });
  }

  const successUrl = new URL(`/${locale}/billing/success`, appUrl);
  successUrl.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
  if (returnTo) successUrl.searchParams.set("return_to", String(returnTo));

  const cancelUrl = new URL(`/${locale}/pricing`, appUrl);
  cancelUrl.searchParams.set("cancelled", "1");

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl.toString(),
    cancel_url: cancelUrl.toString(),
    metadata: {
      user_id: user.id,
      pack_id: pack.id,
      credits: String(pack.credits),
    },
  });

  return Response.json({ url: session.url });
}
```

- [ ] **Step 3: Create balance endpoint**

Create `src/app/api/billing/balance/route.ts`:

```ts
import { billingErrorResponse } from "@/lib/billing/errors";
import { getBalance } from "@/lib/billing/credits";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return billingErrorResponse("AUTH_REQUIRED", 401, "Please sign in.");
  }

  const balance = await getBalance(user.id);

  return Response.json({ balance });
}
```

- [ ] **Step 4: Create webhook endpoint**

Create `src/app/api/billing/stripe/webhook/route.ts`:

```ts
import Stripe from "stripe";
import { grantCredits } from "@/lib/billing/credits";
import { createStripeClient } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const stripe = createStripeClient();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return Response.json({ error: "Webhook is not configured." }, { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return Response.json(
      { error: { code: "WEBHOOK_SIGNATURE_INVALID" } },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdminClient();
  const { data: existing } = await admin
    .from("stripe_events")
    .select("id")
    .eq("id", event.id)
    .maybeSingle();

  if (existing) {
    return Response.json({ received: true, duplicate: true });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const credits = Number(session.metadata?.credits ?? 0);

    if (session.payment_status !== "paid" || !userId || credits <= 0) {
      return Response.json(
        { error: { code: "PAYMENT_NOT_CONFIRMED" } },
        { status: 400 }
      );
    }

    await grantCredits({
      userId,
      amount: credits,
      stripeSessionId: session.id,
      stripeEventId: event.id,
      metadata: {
        pack_id: session.metadata?.pack_id,
        amount_total: session.amount_total,
        currency: session.currency,
      },
    });
  }

  await admin.from("stripe_events").insert({
    id: event.id,
    type: event.type,
    payload: event as unknown as Record<string, unknown>,
  });

  return Response.json({ received: true });
}
```

- [ ] **Step 5: Run lint and tests**

Run:

```powershell
npm run lint
npm test -- tests/billing/plans.test.ts tests/billing/errors.test.ts tests/billing/credits.test.ts
```

Expected:

- PASS.

- [ ] **Step 6: Commit**

Run:

```powershell
git add src/lib/stripe.ts src/app/api/billing/checkout/route.ts src/app/api/billing/balance/route.ts src/app/api/billing/stripe/webhook/route.ts
git commit -m "feat: add Stripe billing endpoints"
```

---

### Task 5: Auth Middleware and UI Shell

**Files:**
- Modify: `src/middleware.ts`
- Create: `src/components/auth-button.tsx`
- Create: `src/components/credit-balance.tsx`
- Modify: `src/components/header.tsx`
- Modify: `src/messages/en.json`
- Modify: `src/messages/zh.json`
- Modify: `src/messages/ms.json`

- [ ] **Step 1: Update middleware**

Modify `src/middleware.ts` so it runs next-intl and refreshes Supabase auth cookies:

```ts
import createMiddleware from "next-intl/middleware";
import { defineRouting } from "next-intl/routing";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const routing = defineRouting({
  locales: ["en", "zh", "ms"],
  defaultLocale: "en",
});

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const response = intlMiddleware(request) as NextResponse;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return response;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

- [ ] **Step 2: Create auth button**

Create `src/components/auth-button.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { LogIn, LogOut } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AuthButton() {
  const supabase = createSupabaseBrowserClient();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  const signIn = async () => {
    await supabase.auth.signInWithOtp({
      email: window.prompt("Email") ?? "",
      options: { emailRedirectTo: window.location.href },
    });
    window.alert("Check your email for the login link.");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  if (loading) return null;

  return email ? (
    <button
      type="button"
      onClick={signOut}
      className="inline-flex items-center gap-1 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
      title={email}
    >
      <LogOut className="h-4 w-4" />
      <span className="hidden xl:inline">Sign out</span>
    </button>
  ) : (
    <button
      type="button"
      onClick={signIn}
      className="inline-flex items-center gap-1 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <LogIn className="h-4 w-4" />
      <span className="hidden xl:inline">Sign in</span>
    </button>
  );
}
```

- [ ] **Step 3: Create credit balance**

Create `src/components/credit-balance.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Coins } from "lucide-react";
import { Link } from "@/i18n/navigation";

export function CreditBalance() {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/billing/balance")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (typeof data?.balance === "number") setBalance(data.balance);
      })
      .catch(() => {});
  }, []);

  if (balance === null) return null;

  return (
    <Link
      href="/account"
      className="inline-flex items-center gap-1 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <Coins className="h-4 w-4" />
      <span>{balance}</span>
    </Link>
  );
}
```

- [ ] **Step 4: Update header**

Modify `src/components/header.tsx`:

```tsx
// Add imports:
import { AuthButton } from "./auth-button";
import { CreditBalance } from "./credit-balance";

// Add nav item:
{ href: "/pricing", label: t("pricing") },

// Add controls near ThemeToggle:
<CreditBalance />
<AuthButton />
```

- [ ] **Step 5: Add `nav2.pricing` translations**

Modify message files:

```json
"pricing": "Pricing"
```

```json
"pricing": "收费"
```

```json
"pricing": "Harga"
```

- [ ] **Step 6: Run lint**

Run:

```powershell
npm run lint
```

Expected:

- PASS.

- [ ] **Step 7: Commit**

Run:

```powershell
git add src/middleware.ts src/components/auth-button.tsx src/components/credit-balance.tsx src/components/header.tsx src/messages/en.json src/messages/zh.json src/messages/ms.json
git commit -m "feat: add billing auth shell"
```

---

### Task 6: Pricing, Account, and Success Pages

**Files:**
- Create: `src/components/checkout-button.tsx`
- Create: `src/components/pricing-cards.tsx`
- Create: `src/app/[locale]/pricing/page.tsx`
- Create: `src/app/[locale]/billing/success/page.tsx`
- Create: `src/app/[locale]/account/page.tsx`
- Modify: `src/messages/en.json`
- Modify: `src/messages/zh.json`
- Modify: `src/messages/ms.json`
- Modify: `src/app/sitemap.ts`

- [ ] **Step 1: Create checkout button**

Create `src/components/checkout-button.tsx`:

```tsx
"use client";

import { useState } from "react";
import { ShoppingCart } from "lucide-react";

export function CheckoutButton({
  packId,
  locale,
  label,
}: {
  packId: string;
  locale: string;
  label: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = async () => {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packId, locale }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data?.error?.message ?? "Unable to start checkout.");
      setLoading(false);
      return;
    }

    window.location.href = data.url;
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={startCheckout}
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        <ShoppingCart className="h-4 w-4" />
        {loading ? "..." : label}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Create pricing cards**

Create `src/components/pricing-cards.tsx`:

```tsx
import { BILLING_PACKS } from "@/lib/billing/plans";
import { CheckoutButton } from "./checkout-button";

export function PricingCards({
  locale,
  ctaLabel,
}: {
  locale: string;
  ctaLabel: string;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {BILLING_PACKS.map((pack) => (
        <section key={pack.id} className="rounded-lg border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold">{pack.name}</h2>
          <p className="mt-2 text-3xl font-bold">RM{pack.priceMyr}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {pack.credits} credits
          </p>
          <div className="mt-5">
            <CheckoutButton
              packId={pack.id}
              locale={locale}
              label={ctaLabel}
            />
          </div>
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create pricing page**

Create `src/app/[locale]/pricing/page.tsx`:

```tsx
import { getTranslations } from "next-intl/server";
import { PricingCards } from "@/components/pricing-cards";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricing" });

  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricing" });

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
      </div>
      <PricingCards locale={locale} ctaLabel={t("buy")} />
      <p className="mt-6 text-sm text-muted-foreground">{t("freeNote")}</p>
    </main>
  );
}
```

- [ ] **Step 4: Create billing success page**

Create `src/app/[locale]/billing/success/page.tsx`:

```tsx
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function BillingSuccessPage() {
  const t = await getTranslations("billing");

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold">{t("successTitle")}</h1>
      <p className="mt-3 text-muted-foreground">{t("successDesc")}</p>
      <div className="mt-6 flex gap-3">
        <Link className="rounded-md bg-primary px-4 py-2 text-primary-foreground" href="/account">
          {t("viewAccount")}
        </Link>
        <Link className="rounded-md border px-4 py-2" href="/ai-tax">
          {t("tryAi")}
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Create account page**

Create `src/app/[locale]/account/page.tsx`:

```tsx
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getBalance } from "@/lib/billing/credits";

export default async function AccountPage() {
  const t = await getTranslations("account");
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect({ href: "/pricing", locale: "en" });

  const balance = await getBalance(user.id);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <section className="mt-6 rounded-lg border p-5">
        <p className="text-sm text-muted-foreground">{t("creditBalance")}</p>
        <p className="mt-2 text-4xl font-bold">{balance}</p>
      </section>
    </main>
  );
}
```

- [ ] **Step 6: Add translations**

Add equivalent namespaces to all three message files:

```json
"pricing": {
  "title": "Pricing",
  "subtitle": "Buy credits for AI tax help and advanced business tools.",
  "buy": "Buy credits",
  "freeNote": "The personal income tax calculator remains free and does not require login."
},
"billing": {
  "successTitle": "Payment received",
  "successDesc": "Your credits will appear once Stripe confirms the payment. This usually takes a few seconds.",
  "viewAccount": "View account",
  "tryAi": "Try AI Tax"
},
"account": {
  "title": "Account",
  "creditBalance": "Credit balance"
}
```

Use Chinese and Malay copy with the same keys.

- [ ] **Step 7: Add pricing to sitemap**

Modify `src/app/sitemap.ts` to include:

```ts
{ path: "/pricing", priority: 0.8, changeFrequency: "monthly" as const },
```

- [ ] **Step 8: Run lint**

Run:

```powershell
npm run lint
```

Expected:

- PASS.

- [ ] **Step 9: Commit**

Run:

```powershell
git add src/components/checkout-button.tsx src/components/pricing-cards.tsx src/app/[locale]/pricing/page.tsx src/app/[locale]/billing/success/page.tsx src/app/[locale]/account/page.tsx src/messages/en.json src/messages/zh.json src/messages/ms.json src/app/sitemap.ts
git commit -m "feat: add billing pages"
```

---

### Task 7: Gate AI Tax with Credits

**Files:**
- Modify: `src/app/api/chat/route.ts`
- Modify: `src/components/tax-chat.tsx`

- [ ] **Step 1: Update `/api/chat` POST auth and credit handling**

Modify `src/app/api/chat/route.ts`:

```ts
// Add imports:
import { billingErrorResponse } from "@/lib/billing/errors";
import {
  consumeCredits,
  InsufficientCreditsError,
  refundCredits,
} from "@/lib/billing/credits";
import { BILLING_FEATURE_COSTS } from "@/lib/billing/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// At the start of POST, before rate limiting and provider calls:
const supabaseAuth = await createSupabaseServerClient();
const {
  data: { user },
} = await supabaseAuth.auth.getUser();

if (!user) {
  return billingErrorResponse(
    "AUTH_REQUIRED",
    401,
    "Please sign in to use MYTax AI."
  );
}

const aiCreditCost = BILLING_FEATURE_COSTS.ai_tax_question;
try {
  await consumeCredits({
    userId: user.id,
    feature: "ai_tax_question",
    amount: aiCreditCost,
    requestSummary: { route: "/api/chat" },
  });
} catch (error) {
  if (error instanceof InsufficientCreditsError) {
    return billingErrorResponse(
      "INSUFFICIENT_CREDITS",
      402,
      "Not enough credits for MYTax AI.",
      { balance: error.balance, requiredCredits: error.required }
    );
  }
  throw error;
}

// Around provider failure paths after credits are consumed:
await refundCredits({
  userId: user.id,
  feature: "ai_tax_question",
  amount: aiCreditCost,
  errorCode: "PROVIDER_FAILED_REFUNDED",
  metadata: { route: "/api/chat" },
});
```

Make the edit concretely by introducing:

- `let chargedAiCredit = false`
- set it to true after `consumeCredits`
- call `refundCredits` only if provider failure happens after charging
- do not charge `GET /api/chat`

- [ ] **Step 2: Update TaxChat error UI**

Modify `src/components/tax-chat.tsx` so failed POST responses parse billing errors:

```ts
if (!res.ok) {
  const data = await res.json().catch(() => null);
  const code = data?.error?.code;
  if (code === "AUTH_REQUIRED") {
    throw new Error("Please sign in to use MYTax AI.");
  }
  if (code === "INSUFFICIENT_CREDITS") {
    throw new Error("Not enough credits. Please buy credits from Pricing.");
  }
  throw new Error(data?.error?.message ?? "LLM request failed");
}
```

In the catch block, show this error as the assistant message instead of silently falling back to the rule engine for billing errors.

- [ ] **Step 3: Run lint and tests**

Run:

```powershell
npm run lint
npm test
```

Expected:

- PASS.

- [ ] **Step 4: Commit**

Run:

```powershell
git add src/app/api/chat/route.ts src/components/tax-chat.tsx
git commit -m "feat: charge credits for AI tax"
```

---

### Task 8: Deployment Docs and Full Verification

**Files:**
- Modify: `DEPLOYMENT.md`

- [ ] **Step 1: Add billing deployment section**

Append to `DEPLOYMENT.md`:

```md
## Billing and Credits

MYTax paid features use Stripe Checkout and Supabase credits.

Required env vars:

```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_BUSINESS=price_...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_APP_URL=https://your-domain.example
```

Run `supabase/billing-credits.sql` in the Supabase SQL Editor before enabling billing routes.

Stripe webhook endpoint:

```text
https://your-domain.example/api/billing/stripe/webhook
```

Listen for:

- `checkout.session.completed`
```

- [ ] **Step 2: Run full verification**

Run:

```powershell
npm run lint
npm test
npm run build
```

Expected:

- All commands pass.

- [ ] **Step 3: Manual smoke check**

Run:

```powershell
npm run dev
```

Open:

- `http://localhost:3000/en/pricing`
- `http://localhost:3000/en`
- `http://localhost:3000/en/ai-tax`

Expected:

- Pricing renders packs.
- Personal calculator still renders without login.
- AI Tax prompts for sign-in or credits instead of calling provider anonymously.

- [ ] **Step 4: Commit**

Run:

```powershell
git add DEPLOYMENT.md
git commit -m "docs: document billing deployment"
```

---

## Self-Review

Spec coverage:

- Credit packs are implemented in Task 1.
- Supabase tables, RLS, and RPCs are implemented in Task 2.
- Supabase SSR/server/admin clients and credit helpers are implemented in Task 3.
- Stripe Checkout and webhook are implemented in Task 4.
- Header auth/balance shell is implemented in Task 5.
- Pricing, account, and success UI are implemented in Task 6.
- AI Tax credit gating and refund behavior are implemented in Task 7.
- Deployment env vars and webhook setup are documented in Task 8.
- Advanced calculators stay free until server-side migration, matching the approved first milestone.

Placeholder scan:

- The plan contains no unresolved placeholder markers.
- Every task includes concrete files and commands.

Type consistency:

- Pack IDs are `starter`, `pro`, and `business` across tests, config, UI, and checkout.
- AI Tax feature key is `ai_tax_question` across config, credit helpers, API, and tests.
- Stable error codes match the spec.
