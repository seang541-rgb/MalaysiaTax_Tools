# MYTax

MYTax is a multilingual Malaysia tax calculator and AI tax assistant built with Next.js. It includes deterministic calculators for personal income tax, corporate tax, PCB, SST, RPGT, stamp duty, withholding tax, CP204, e-Invoice, capital allowance, sole proprietor tax, employer contributions, and joint assessment.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- next-intl
- Supabase Auth and Postgres
- Stripe Checkout
- Vitest
- Tailwind CSS

## Local Setup

```powershell
npm install
npm run dev
```

Open `http://localhost:3000/en`.

## Environment Variables

Required for Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Required for AI:

```env
LLM_CHAT_BASE_URL=https://api.deepseek.com
LLM_CHAT_API_KEY=
LLM_CHAT_MODEL=deepseek-v4-flash
LLM_EMBED_BASE_URL=https://integrate.api.nvidia.com/v1
LLM_EMBED_API_KEY=
LLM_EMBED_MODEL=baai/bge-m3
LLM_EMBED_DIMENSIONS=0
```

Required for billing:

```env
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_STARTER=
STRIPE_PRICE_PRO=
STRIPE_PRICE_BUSINESS=
NEXT_PUBLIC_APP_URL=
```

Required for admin pages:

```env
ADMIN_EMAIL=owner@example.com
```

## Supabase Setup

Run the SQL files in `supabase/` as needed:

- `supabase/billing-credits.sql`
- `supabase/ai-chat-logs.sql` for owner-only AI chat logs
- `supabase/rag-knowledge-base.sql`
- `supabase/migrate-embeddings-1024.sql` for existing 768-dimension deployments
- `supabase/rate-limits.sql`

## RAG Reindexing

Use either:

```powershell
python training-data/scripts/embed-and-upload.py
```

or the admin page:

```text
/en/admin/reindex
```

## Verification

```powershell
npm run lint
npm run test
npm run build
npm audit --audit-level=high
```

## Deployment

Deploy after setting Supabase, Stripe, LLM, and admin environment variables. See `DEPLOYMENT.md` for the full checklist.
