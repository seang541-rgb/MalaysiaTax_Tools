# MYTax — AI & Deployment Guide

The AI assistant now talks to any **OpenAI-compatible** LLM endpoint, configured
purely through env vars. Production default is **NVIDIA NIM** (free tier). Swapping
to a paid provider later is a one-line change (`LLM_BASE_URL` + `LLM_API_KEY` + model).

## Architecture

```
Browser ──▶ /api/chat (Next.js)
                ├─ pre-calculate tax (deterministic engine)   ← unchanged
                ├─ embed query  ──▶ LLM /v1/embeddings
                ├─ RAG search   ──▶ Supabase pgvector (match_tax_chunks)
                └─ chat stream  ──▶ LLM /v1/chat/completions (SSE) ──▶ client
```

Only the LLM calls changed. Supabase RAG, pre-calculation injection, rate limiting
and the client-facing SSE format are untouched.

## Step 1 — Get API keys

Chat and embeddings use **separate** providers (DeepSeek has no embeddings API):

- **Chat — DeepSeek** (<https://platform.deepseek.com>): create a key (`sk-...`).
  Default model `deepseek-v4-flash` (scored 4/4 on the tax accuracy benchmark,
  ~40% faster than `deepseek-v4-pro`). Switch to `deepseek-v4-pro` for heavier
  reasoning if ever needed.
- **Embeddings — NVIDIA NIM** (<https://build.nvidia.com>, free, no card): key
  starts with `nvapi-`. Model `baai/bge-m3` (multilingual EN/ZH/MS, 1024 dims).

> NVIDIA free tier: ~40 req/min + credit cap — fine for launch traffic. Both
> sides are OpenAI-compatible, so swapping either to a paid provider is an env
> change, no code.

## Step 2 — Configure env vars

In `.env.local` (local) and in your host's env settings (production):

```
# Chat — DeepSeek
LLM_CHAT_BASE_URL=https://api.deepseek.com
LLM_CHAT_API_KEY=sk-xxxxxxxx
LLM_CHAT_MODEL=deepseek-v4-flash
# Embeddings — NVIDIA
LLM_EMBED_BASE_URL=https://integrate.api.nvidia.com/v1
LLM_EMBED_API_KEY=nvapi-xxxxxxxx
LLM_EMBED_MODEL=baai/bge-m3
LLM_EMBED_DIMENSIONS=0
```

`LLM_EMBED_DIMENSIONS=0` means "don't send a dimensions param" (bge-m3 is fixed 1024).

## Step 3 — Create the Supabase RAG schema

In the Supabase dashboard → **SQL Editor**:

- **Fresh project** → run `supabase/rag-knowledge-base.sql`. It creates the
  `tax_documents` and `tax_chunks` tables, the `vector` extension, the HNSW
  index and `match_tax_chunks()` already at 1024 dims. Skip the migration below.
- **Existing 768-dim deployment** (old nomic embeddings) → run
  `supabase/migrate-embeddings-1024.sql` instead. It truncates old chunks, alters
  `tax_chunks.embedding` to `vector(1024)`, recreates `match_tax_chunks` at 1024
  dims, and rebuilds the HNSW index.

## Step 4 — Re-embed the knowledge base (required once)

```powershell
$env:PYTHONIOENCODING = "utf-8"
python training-data/scripts/embed-and-upload.py
```

The script reads `LLM_*` and `SUPABASE_SERVICE_ROLE_KEY` from `.env.local`,
smoke-tests the embedding endpoint (should print "returned 1024 dims"), and
re-embeds all docs. The **service-role key is required** — the RAG tables have
RLS enabled, so the public anon key cannot write to them. If the returned
dimension differs, set the Supabase column and migration to match.

### Alternative — rebuild from the web (no local Python)

If you can't run the Python script locally, the same job is exposed as an admin
page that runs on Vercel (which can reach Supabase and the embedding provider):

1. In Vercel → Settings → Environment Variables, add **`ADMIN_REINDEX_SECRET`**
   (any long random string) and confirm `SUPABASE_SERVICE_ROLE_KEY` and the
   embedding key (`LLM_EMBED_API_KEY` or `LLM_API_KEY`) are set. Redeploy.
2. Open `https://<your-domain>/en/admin/reindex`, paste the secret, click
   **开始重建 / Start**. It processes one doc per request (so it never times
   out) and shows progress.
3. When it finishes, ask a question on `/ai-tax` to confirm retrieval works.

The page is protected by `ADMIN_REINDEX_SECRET`; without it the API returns 401.

## Step 4 — Test locally

```powershell
npm run dev
# Health check (no credits used):
curl http://localhost:3000/api/chat        # {"status":"ok","configured":true}
# Then open /en/ai-tax and ask a question.
```

## Step 5 — Deploy to Vercel

1. Push to GitHub (already connected: `seang541-rgb/MalaysiaTax_Tools`).
2. Import the repo on <https://vercel.com>.
3. Add the env vars from Step 2 **plus** the Supabase vars
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. Deploy. The `/api/chat` route runs as a serverless function and streams from NVIDIA.

## Switching providers later

Everything is OpenAI-compatible, so to move off the NVIDIA free tier just change:

```
LLM_BASE_URL=<provider base url>/v1
LLM_API_KEY=<provider key>
LLM_CHAT_MODEL=<provider chat model>
LLM_EMBED_MODEL=<provider embed model>
LLM_EMBED_DIMENSIONS=<match the embed model; re-embed if it changes>
```

If the embedding model or its dimension changes, re-run Step 3.

## Billing and Credits

MYTax paid features use Stripe Checkout and Supabase credits. Run
`supabase/billing-credits.sql` in the Supabase SQL Editor before enabling
billing routes.

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

Stripe webhook endpoint:

```text
https://your-domain.example/api/billing/stripe/webhook
```

Listen for:

- `checkout.session.completed`

The personal income tax calculator remains free. New Supabase Auth users receive
5 starter credits from the `auth.users` insert trigger. Other tools are behind a
credit gate: users must sign in and have at least 1 credit before the tool UI is
available. `POST /api/chat` additionally consumes 1 credit per AI question
before calling the LLM provider.

For local setup on Windows, run `npm run billing:env`. The script prompts for
Supabase and Stripe keys, writes `.env.local`, can create the three one-time
Stripe prices, and can register the `checkout.session.completed` webhook
endpoint automatically.
