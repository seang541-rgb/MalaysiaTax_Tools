# MYTax Billing and Credits - Design Spec

## Overview

MYTax will charge for high-value tools with prepaid credits. The free personal income tax calculator remains open and unlimited for SEO, trust building, and user acquisition. Paid usage starts with AI tax questions and business-oriented calculators.

This design intentionally starts with one-time credit packs instead of monthly subscriptions. Most MYTax users are likely to need help during tax filing, payroll, SST, or corporate planning windows rather than every week. A prepaid balance is easier to understand, easier to buy, and easier to test before adding subscriptions later.

## Goals

- Add a clear paid path without breaking the current free personal tax calculator.
- Let users buy credits through Stripe Checkout.
- Store credit balances and usage history in Supabase.
- Gate paid features through server-side checks before expensive AI calls or business-tool results are returned.
- Keep every balance-changing operation auditable and idempotent.
- Support English, Chinese, and Malay UI copy for pricing, account state, and payment errors.

## Non-Goals

- No recurring subscriptions in the first billing release.
- No custom card form or embedded card handling; Stripe Checkout owns payment collection.
- No manual invoice workflow.
- No admin dashboard in the first release.
- No tax advisory marketplace, human consultant booking, or licensed professional review flow.

## Pricing Model

Credit packs:

| Pack | Price | Credits | Intended User |
| ---- | ----- | ------- | ------------- |
| Starter | RM9 | 10 | Individual or first-time user testing paid tools |
| Pro | RM29 | 40 | Freelancer or small business owner |
| Business | RM79 | 120 | SME owner, payroll/admin user, or accounting staff |

Credit cost:

| Feature | Credit Cost | Notes |
| ------- | ----------- | ----- |
| Personal income tax calculator | 0 | Always free, no login required |
| Blog, terms, privacy, SEO pages | 0 | Always public |
| AI tax assistant | 1 per user question | Deduct before calling the external LLM provider |
| Corporate tax calculator | 2 per calculation | Charge when returning a computed result |
| SST calculator | 2 per calculation | Charge when returning a computed result |
| Employer obligations calculator | 2 per calculation | Charge when returning a computed result |
| Property tools | 2 per calculation | RPGT or stamp duty result |
| Batch PCB | 5 per batch | Batch counts as one submitted run |
| Corporate tools report-style flows | 5 per run | Tax computation, CP204, WHT, capital allowance, incentives |

The first implementation should gate AI Tax first, then move calculators behind protected API routes incrementally. Until a calculator is migrated to a protected API, it should stay clearly marked as free rather than pretending to charge.

## User Experience

### Logged-out user

- Can use the personal tax calculator without friction.
- Can view pricing.
- Can open paid pages, but paid actions show a sign-in prompt.
- If they try AI Tax or a paid calculation, the UI explains that credits are required and offers sign-in.

### Logged-in user with credits

- Header shows current credit balance.
- Pricing page still shows all packs and the current balance.
- Paid actions show the credit cost before submission.
- After a paid action succeeds, the balance refreshes.

### Logged-in user without enough credits

- Paid action is blocked before the expensive operation runs.
- UI shows a low-balance message and links to pricing.
- API returns `402 Payment Required` with a stable error code and required credit amount.

### Successful purchase

- User completes Stripe Checkout.
- Stripe redirects to `/{locale}/billing/success?session_id=...`.
- The page says payment is being confirmed if the webhook has not processed yet.
- Once credits are available, the page shows updated balance and a return link to the tool.

### Cancelled purchase

- Stripe redirects to `/{locale}/pricing?cancelled=1`.
- Page keeps the selected pricing context and lets the user try again.

## Architecture

```
Browser
  |
  | sign in / sign out / pricing / paid action
  v
Next.js App Router
  |
  | Supabase SSR cookie session
  v
Supabase Auth

Paid action:
Browser -> Next.js API route -> consume credits in Postgres -> run tool/LLM -> usage log -> response

Purchase:
Browser -> create checkout session -> Stripe Checkout -> webhook -> idempotent credit grant
```

Key decisions:

- Use `@supabase/ssr` so server routes can read the authenticated user from cookies.
- Keep the public Supabase browser client limited to anon/publishable credentials.
- Use a service-role Supabase client only in server-only billing/webhook code.
- Use Stripe Checkout `metadata` and `client_reference_id` to carry `user_id`, `pack_id`, and intended credit amount.
- Trust Stripe webhook completion, not the browser redirect, for granting credits.
- Store processed Stripe event IDs so webhook retries cannot double-credit a user.

## Data Model

### `profiles`

Stores app-facing account state for Supabase Auth users.

Columns:

- `id uuid primary key references auth.users(id) on delete cascade`
- `email text`
- `stripe_customer_id text unique`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### `credit_balances`

Stores one balance row per user.

Columns:

- `user_id uuid primary key references auth.users(id) on delete cascade`
- `balance integer not null default 0 check (balance >= 0)`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### `credit_transactions`

Immutable ledger for all balance changes.

Columns:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `amount integer not null`
- `kind text not null check (kind in ('purchase', 'usage', 'refund', 'adjustment'))`
- `feature text`
- `description text`
- `stripe_session_id text`
- `stripe_event_id text`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz default now()`

Rules:

- Purchases use positive amounts.
- Usage uses negative amounts.
- Refunds and adjustments may be positive or negative, but only through server/admin paths.
- `stripe_session_id` should be unique when present for purchase transactions.

### `usage_logs`

Records paid and attempted usage.

Columns:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid references auth.users(id) on delete set null`
- `feature text not null`
- `credits_charged integer not null default 0`
- `status text not null check (status in ('success', 'blocked', 'failed'))`
- `error_code text`
- `request_summary jsonb not null default '{}'::jsonb`
- `created_at timestamptz default now()`

### `stripe_events`

Idempotency table for webhooks.

Columns:

- `id text primary key`
- `type text not null`
- `processed_at timestamptz default now()`
- `payload jsonb not null`

## Database Security

- Enable RLS on every new public table.
- Authenticated users can read only their own profile, balance, transactions, and usage logs.
- Users cannot update balances or insert purchase transactions directly.
- Balance mutation happens through Postgres RPC functions. Server helpers call those RPCs; the browser never mutates balances directly.
- Webhook code must run only on the server and must never expose the service-role key to the browser.

Recommended server mutation shape:

- `grant_credits(user_id, amount, stripe_session_id, stripe_event_id, metadata)`
- `consume_credits(user_id, feature, amount, request_summary)`

`consume_credits` must be atomic:

1. Lock the user's balance row.
2. Check `balance >= amount`.
3. Decrement balance.
4. Insert `credit_transactions` usage row.
5. Insert successful `usage_logs` row.
6. Return the new balance.

If balance is insufficient, do not decrement. Insert a blocked `usage_logs` row and return a typed insufficient-credit error.

## API Routes and Server Helpers

### Auth helpers

- `src/lib/supabase/server.ts`: server client with cookie session.
- `src/lib/supabase/browser.ts`: browser client for client components.
- `src/lib/supabase/admin.ts`: server-only service-role client.

### Billing config

- `src/lib/billing/plans.ts`: pack IDs, prices, credit amounts, Stripe price env var names.
- `src/lib/billing/credits.ts`: `getBalance`, `consumeCredits`, `grantCredits`.
- `src/lib/billing/errors.ts`: stable error codes.

### Checkout

Route: `POST /api/billing/checkout`

Input:

- `packId`
- `locale`
- optional `returnTo`

Behavior:

- Require authenticated user.
- Validate `packId` against local billing config.
- Create or reuse Stripe customer for the user.
- Create Stripe Checkout Session in `payment` mode.
- Attach metadata: `user_id`, `pack_id`, `credits`.
- Return Checkout URL.

### Webhook

Route: `POST /api/billing/stripe/webhook`

Behavior:

- Read raw body with `req.text()`.
- Verify Stripe signature with `STRIPE_WEBHOOK_SECRET`.
- On `checkout.session.completed`, confirm payment status and metadata.
- Insert Stripe event ID before or during credit grant to enforce idempotency.
- Grant credits exactly once.
- Return 200 for already-processed events.

### Balance

Route: `GET /api/billing/balance`

Behavior:

- Require authenticated user.
- Return balance and latest transactions.

### Paid AI chat

Route: existing `POST /api/chat`

First paid milestone:

- Require authenticated user for LLM-backed AI Tax.
- Consume 1 credit before embedding/chat provider calls.
- If LLM provider fails after credits are consumed, record failed usage and either refund automatically or return a support-friendly error. First release should auto-refund provider failures.
- Keep `GET /api/chat` as a no-credit health check.

## Frontend Changes

Pages:

- `src/app/[locale]/pricing/page.tsx`
- `src/app/[locale]/billing/success/page.tsx`
- `src/app/[locale]/account/page.tsx`

Components:

- `PricingCards`
- `CheckoutButton`
- `CreditBalance`
- `AuthButton`
- `PaidFeatureNotice`
- `InsufficientCreditsDialog`

Header:

- Add Pricing nav item.
- Add sign-in/sign-out control.
- Show credit balance for authenticated users and link it to the account page.

Translations:

- Add billing, pricing, auth, and payment-error namespaces in `en.json`, `zh.json`, and `ms.json`.
- Keep all payment-facing copy concise and non-technical.

## Environment Variables

Required server env vars:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`

Required public env vars:

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

Stripe price IDs:

- `STRIPE_PRICE_STARTER`
- `STRIPE_PRICE_PRO`
- `STRIPE_PRICE_BUSINESS`

## Error Handling

Stable API error codes:

- `AUTH_REQUIRED`
- `INSUFFICIENT_CREDITS`
- `INVALID_PACK`
- `CHECKOUT_UNAVAILABLE`
- `PAYMENT_NOT_CONFIRMED`
- `WEBHOOK_SIGNATURE_INVALID`
- `CREDIT_GRANT_FAILED`
- `PROVIDER_FAILED_REFUNDED`

Client behavior:

- `AUTH_REQUIRED`: show sign-in prompt.
- `INSUFFICIENT_CREDITS`: show required credits, current balance, and pricing link.
- Checkout errors: show retry message and support contact.
- Provider failures after deduction: show refund confirmation if automatic refund succeeded.

## Testing Strategy

Unit tests:

- Billing plan lookup rejects unknown pack IDs.
- Credit-cost config has positive integer costs.
- Error mappers produce stable error codes.

Database tests or SQL verification:

- RLS prevents users from reading other users' balances.
- `consume_credits` decrements atomically when sufficient credits exist.
- `consume_credits` does not decrement when insufficient credits exist.
- Duplicate Stripe event/session cannot grant credits twice.

API tests:

- Unauthenticated checkout returns `401`.
- Invalid pack returns `400`.
- Authenticated checkout creates a Stripe session with expected metadata using a mocked Stripe client.
- Webhook rejects invalid signatures.
- Webhook grants credits once for completed checkout.
- AI chat returns `402` before provider calls when balance is too low.

Manual verification:

- Sign up/sign in.
- Buy Starter pack in Stripe test mode.
- Confirm balance increases by 10.
- Ask one AI Tax question.
- Confirm balance decreases by 1.
- Try AI Tax with zero credits and confirm no LLM call occurs.
- Confirm personal tax calculator still works without login.

## Rollout Plan

1. Add spec and implementation plan.
2. Add dependencies and Supabase auth helpers.
3. Add billing migration and RLS policies.
4. Add billing config, server helpers, and tests.
5. Add Stripe checkout and webhook.
6. Add pricing UI and account/balance UI.
7. Gate AI Tax with 1 credit per question.
8. Deploy to staging with Stripe test mode and Supabase test project.
9. Verify end-to-end purchase and usage.
10. Migrate additional calculators behind paid API routes one feature at a time.

## Open Decisions

- Whether new users receive a one-time free trial credit. Recommendation: not in the first release, because the free personal tax calculator already demonstrates value.
- Whether AI provider failures should refund credits automatically. Recommendation: yes for the first release.
- Whether existing advanced calculators should be hidden immediately. Recommendation: no. Gate only features that have been moved server-side; avoid charging for tools that still calculate fully in the browser.

## Approval

Approved direction: one-time Stripe credit packs, Supabase Auth, Supabase credit ledger, and paid gating beginning with AI Tax.
