# MYTax - AI & Deployment Guide

The AI assistant now talks to OpenAI-compatible LLM endpoints, configured through
environment variables. Chat uses DeepSeek and embeddings use NVIDIA NIM by default.

## Architecture

```text
Browser -> /api/chat (Next.js)
               -> pre-calculate tax (deterministic engine)   unchanged
               -> embed query                             LLM /v1/embeddings
               -> RAG search                              Supabase pgvector (match_tax_chunks)
               -> chat stream                              LLM /v1/chat/completions (SSE) -> client
```

Only the LLM calls changed. Supabase RAG, pre-calculation, rate limiting and the
client-facing SSE format are unchanged.

## Step 1 - Get API keys

Chat and embeddings use separate providers:

- **Chat - DeepSeek**: <https://platform.deepseek.com>
  - Default model: `deepseek-v4-flash` (`sk-...` key).
- **Embeddings - NVIDIA NIM**: <https://build.nvidia.com>
  - Default model: `baai/bge-m3` (`nvapi-...` key).

## Step 2 - Configure env vars

In `.env.local` (local) and in your host's env settings (production), set:

```text
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Chat - DeepSeek
LLM_CHAT_BASE_URL=https://api.deepseek.com
LLM_CHAT_API_KEY=sk-...
LLM_CHAT_MODEL=deepseek-v4-flash

# Embeddings - NVIDIA NIM
LLM_EMBED_BASE_URL=https://integrate.api.nvidia.com/v1
LLM_EMBED_API_KEY=nvapi-...
LLM_EMBED_MODEL=baai/bge-m3
LLM_EMBED_DIMENSIONS=0

# Shared fallback (optional, supported by current code)
LLM_BASE_URL=
LLM_API_KEY=

# Production admin access control (required for admin-only pages)
ADMIN_EMAIL=owner@example.com

# Stripe/billing
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_BUSINESS=price_...
NEXT_PUBLIC_APP_URL=https://your-domain.example
```

`LLM_EMBED_DIMENSIONS=0` means "don't send dimensions" (bge-m3 is fixed 1024).

## Step 3 - Create the Supabase RAG schema

In the Supabase dashboard SQL Editor:

- **Fresh project**: run `supabase/rag-knowledge-base.sql` to create the
  knowledge-base schema.
- **Existing 768-dim deployment** (old nomic embeddings): run
  `supabase/migrate-embeddings-1024.sql` instead.
- Run `supabase/rate-limits.sql` to set up chat and API rate limiting.

## Step 4 - Re-embed the knowledge base (required once)

```powershell
$env:PYTHONIOENCODING = "utf-8"
python training-data/scripts/embed-and-upload.py
```

The script reads `LLM_*` and `SUPABASE_SERVICE_ROLE_KEY` from `.env.local`,
smoke-tests the embedding endpoint (look for "returned 1024 dims"), and re-embeds
all docs. The service-role key is required because RAG writes require service access.

### Alternative - rebuild from the web (no local Python)

If you cannot run the Python script locally, the same job is exposed as an admin
page on Vercel:

1. Confirm `SUPABASE_SERVICE_ROLE_KEY` and the embedding key (`LLM_EMBED_API_KEY`
   or `LLM_API_KEY`) are set in Vercel. (Access is owner-only via `ADMIN_EMAIL`,
   same as `/admin/ai-logs`.)
2. Sign in with your admin account, open
   `https://<your-domain>/en/admin/reindex`, and click **Start**. It processes one
   document per request and shows progress.
3. When it finishes, ask a question on `/ai-tax` to confirm retrieval works.

The page is owner-only: non-admins get a 404 and the API returns 403.

## Step 5 - Test locally

```powershell
npm run dev
# Health check (no credits used):
curl http://localhost:3000/api/chat        # {"status":"ok","configured":true}
# Then open /en/ai-tax and ask a question.
```

## Step 6 - Deploy to Vercel

1. Push to GitHub (already connected: `seang541-rgb/MalaysiaTax_Tools`).
2. Import the repo on <https://vercel.com>.
3. Add the env vars from Step 2 above.
4. Deploy. `/api/chat` runs as a serverless function, streams chat responses from
   the configured chat provider, and uses the configured embedding provider for RAG.

## Switching providers later

Everything is OpenAI-compatible, so provider changes are environment changes:

```text
LLM_CHAT_BASE_URL=<provider base url>/v1
LLM_CHAT_API_KEY=<provider key>
LLM_CHAT_MODEL=<provider chat model>

LLM_EMBED_BASE_URL=<embedding base url>/v1
LLM_EMBED_API_KEY=<embedding key>
LLM_EMBED_MODEL=<embedding model>
LLM_EMBED_DIMENSIONS=<model dimension; re-embed if it changes>
```

If the embedding model or its dimension changes, rerun Step 4.

## Billing and Credits

MYTax paid features use Stripe Checkout and Supabase credits. Run
`supabase/billing-credits.sql` in the Supabase SQL Editor before enabling billing
routes.

Required env vars are listed in Step 2.

Stripe webhook endpoint:

```text
https://your-domain.example/api/billing/stripe/webhook
```

Listen for:

- `checkout.session.completed`

The personal income tax calculator remains free. New Supabase Auth users receive 5
starter credits from the `auth.users` insert trigger. Other tools are behind a credit
gate: users must sign in and have at least 1 credit before the tool UI is available.
`POST /api/chat` consumes 1 credit per AI question.

For local setup on Windows, run `npm run billing:env`. The script prompts for Supabase
and Stripe keys, writes `.env.local`, can create the three one-time Stripe prices, and
can register the `checkout.session.completed` webhook endpoint automatically.
