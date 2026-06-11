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

## Step 3 — Migrate the Supabase vector column (once)

The old chunks were 768-dim (nomic). bge-m3 is 1024-dim, so resize the column and
recreate the search function. In the Supabase dashboard → **SQL Editor**, run:

```
supabase/migrate-embeddings-1024.sql
```

(It truncates old chunks, alters `tax_chunks.embedding` to `vector(1024)`, recreates
`match_tax_chunks` at 1024 dims, and rebuilds the HNSW index.)

## Step 4 — Re-embed the knowledge base (required once)

```powershell
$env:PYTHONIOENCODING = "utf-8"
python training-data/scripts/embed-and-upload.py
```

The script reads `LLM_*` from `.env.local`, smoke-tests the embedding endpoint
(should print "returned 1024 dims"), and re-embeds all docs. If the returned
dimension differs, set the Supabase column and migration to match.

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
