# MYTax

MYTax is a multilingual Malaysia tax toolkit and AI tax assistant built with Next.js. It combines deterministic tax calculators, Supabase-backed accounts and credits, Stripe billing, production readiness checks, rate limiting, and a retrieval-augmented AI assistant for Malaysia tax questions.

Live site: https://mytaxs.online

No installation is required to use MYTax. The app is already deployed online; local setup is only needed if you want to develop, test, or self-host the project.

> MYTax is an independent tool for estimation, education, and workflow support. It is not official tax, legal, or accounting advice. Always verify important filings against current LHDN/RMCD guidance or a qualified tax professional.

## Use Online

Open the deployed app:

```text
https://mytaxs.online
```

Localized entry points:

```text
https://mytaxs.online/en
https://mytaxs.online/zh
https://mytaxs.online/ms
```

AI tax assistant:

```text
https://mytaxs.online/en/ai-tax
https://mytaxs.online/zh/ai-tax
https://mytaxs.online/ms/ai-tax
```

## What It Includes

- Personal income tax calculator with Malaysia reliefs and tax brackets.
- Corporate tax calculator.
- PCB and batch PCB tools.
- SST, RPGT, stamp duty, and withholding tax calculators.
- CP204, e-Invoice, capital allowance, employer contribution, sole proprietor, and joint assessment tools.
- Multilingual interface for English, Chinese, and Malay through `next-intl`.
- AI tax assistant with deterministic tax-tool routing and RAG context.
- Supabase Auth, gated paid tools, usage credits, rate limits, and admin-only AI logs.
- Stripe Checkout billing flow.
- Sentry and Vercel Analytics integration hooks.

## Tech Stack

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS
- next-intl
- Supabase Auth, Postgres, RLS, and pgvector
- OpenAI-compatible chat and embedding providers
- Stripe Checkout
- Vitest
- ESLint
- Sentry
- Vercel

## Project Structure

```text
src/app                 App Router pages and API routes
src/app/[locale]        Localized public pages and tools
src/app/api/chat        AI assistant API endpoint
src/app/api/billing     Stripe checkout and webhook routes
src/app/api/admin       Admin-only maintenance APIs
src/components          Calculator, billing, auth, and UI components
src/engine              Deterministic Malaysia tax calculation logic
src/lib                 Supabase, billing, LLM, RAG, admin, and site utilities
src/messages            Locale message files
supabase                SQL setup scripts
training-data           Raw knowledge files and embedding upload scripts
tests                   Vitest test coverage
```

## Optional Local Development

You only need the steps below if you are modifying the code, running tests locally, or deploying your own copy.

Install dependencies:

```bash
npm install
```

Create `.env.local` and fill in the services you plan to run:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Site and admin
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_EMAIL=owner@example.com

# AI chat provider
LLM_CHAT_BASE_URL=https://api.deepseek.com
LLM_CHAT_API_KEY=
LLM_CHAT_MODEL=deepseek-v4-flash

# AI embedding provider
LLM_EMBED_BASE_URL=https://integrate.api.nvidia.com/v1
LLM_EMBED_API_KEY=
LLM_EMBED_MODEL=baai/bge-m3
LLM_EMBED_DIMENSIONS=0

# Shared AI fallback, optional
LLM_BASE_URL=
LLM_API_KEY=

# Stripe billing
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_STARTER=
STRIPE_PRICE_PRO=
STRIPE_PRICE_BUSINESS=

# Optional analytics and monitoring
NEXT_PUBLIC_GA_ID=
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=
```

Start the development server:

```bash
npm run dev
```

Open http://localhost:3000/en.

## Supabase Setup

Run the SQL files in Supabase SQL Editor according to the features you need:

```text
supabase/billing-credits.sql
supabase/signup-bonus-credits.sql
supabase/ai-chat-logs.sql
supabase/rag-knowledge-base.sql
supabase/rate-limits.sql
```

For an existing deployment that previously used 768-dimension embeddings, run this migration instead of recreating the RAG schema from scratch:

```text
supabase/migrate-embeddings-1024.sql
```

The app expects Supabase Auth to be enabled. Paid tools and AI chat use Supabase sessions and credits; admin pages use signed-in email matching `ADMIN_EMAIL`.

## AI Assistant and RAG

The assistant uses OpenAI-compatible endpoints:

- Chat: `LLM_CHAT_BASE_URL`, `LLM_CHAT_API_KEY`, `LLM_CHAT_MODEL`
- Embeddings: `LLM_EMBED_BASE_URL`, `LLM_EMBED_API_KEY`, `LLM_EMBED_MODEL`, `LLM_EMBED_DIMENSIONS`
- Shared fallback: `LLM_BASE_URL` and `LLM_API_KEY` can be used by both sides if dedicated variables are not set.

After the RAG schema is ready, embed and upload the knowledge base:

```powershell
$env:PYTHONIOENCODING = "utf-8"
python training-data/scripts/embed-and-upload.py
```

You can also rebuild the RAG index from the admin UI after signing in as an admin:

```text
/en/admin/reindex
```

## Billing Setup

For local billing configuration on Windows:

```powershell
npm run billing:env
```

The helper prompts for Supabase and Stripe values, writes `.env.local`, and can help create the Stripe prices and webhook endpoint.

Stripe webhook endpoint:

```text
https://your-domain.example/api/billing/stripe/webhook
```

Required event:

```text
checkout.session.completed
```

## Useful Scripts

```bash
npm run dev             # Start local development server
npm run build           # Build for production
npm run start           # Start production build
npm run lint            # Run ESLint
npm run test            # Run Vitest once
npm run test:watch      # Run Vitest in watch mode
npm run readiness:prod  # Check production readiness
npm run smoke:prod      # Check deployed public pages and auth gates
npm run billing:env     # Configure local Supabase and Stripe billing env vars
```

## Deployment

The project is designed for Vercel.

1. Connect the GitHub repository to Vercel.
2. Add the required Supabase, AI, Stripe, admin, and site URL environment variables.
3. Run the Supabase SQL setup scripts.
4. Deploy the app.
5. Rebuild the RAG index through the Python script or `/en/admin/reindex`.
6. Smoke test the public site, `/api/chat`, auth, billing checkout, and the localized AI pages.

For a detailed deployment checklist, see `DEPLOYMENT.md`.

## Verification Checklist

Before shipping meaningful changes:

```bash
npm run lint
npm run test
npm run build
npm run readiness:prod
npm run smoke:prod
```

`npm run readiness:prod` checks required production environment variables, local Supabase SQL files, remote Supabase RAG tables, and the `ai_chat_logs.provider_metadata` schema.

For production-facing AI changes, also check:

```bash
curl https://mytaxs.online/api/chat
```

Expected health response shape:

```json
{
  "status": "ok",
  "configured": true
}
```

## License

This repository is private unless a license is added. Do not assume reuse rights without the repository owner's permission.
