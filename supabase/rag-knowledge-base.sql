-- MYTax RAG knowledge base schema (tax_documents + tax_chunks).
-- Run this ONCE in the Supabase SQL Editor on a fresh project, BEFORE the
-- embedding pipeline (training-data/scripts/embed-and-upload.py) and before the
-- AI chat (/api/chat) can retrieve context.
--
-- Note on ordering:
--   * Fresh setup  → run THIS file. It creates the tables, the pgvector
--     extension, the HNSW index and match_tax_chunks() already at 1024 dims,
--     so supabase/migrate-embeddings-1024.sql is NOT needed.
--   * Existing 768-dim deployment → keep using migrate-embeddings-1024.sql,
--     which truncates and resizes the column in place (it now applies the same
--     RLS lockdown as this file).
--
-- Security model:
--   These tables hold PUBLIC tax knowledge (no per-user data), but a poisoned
--   knowledge base would make the AI quote wrong/malicious tax advice, so WRITES
--   must be protected. RLS is ENABLED with no anon/authenticated policies, and
--   write grants are revoked from those roles. Reads happen only through
--   match_tax_chunks(), which is SECURITY DEFINER so the public anon-key chat
--   route can search without any direct table access. The embed pipeline must
--   use the SUPABASE_SERVICE_ROLE_KEY (service_role bypasses RLS).

create extension if not exists vector;
create extension if not exists pgcrypto;

-- Source documents (one row per raw knowledge file).
create table if not exists public.tax_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source text not null unique,
  content text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Embedded chunks. id is bigint to match match_tax_chunks()'s return type.
create table if not exists public.tax_chunks (
  id bigint generated always as identity primary key,
  document_id uuid references public.tax_documents(id) on delete cascade,
  content text not null,
  chunk_index integer not null default 0,
  embedding vector(1024),
  token_count integer,
  created_at timestamptz not null default now()
);

create index if not exists tax_chunks_document_id_idx
  on public.tax_chunks (document_id);

-- Approximate-nearest-neighbour index for cosine similarity search.
create index if not exists tax_chunks_embedding_idx
  on public.tax_chunks using hnsw (embedding vector_cosine_ops);

-- ── Lock down writes ──────────────────────────────────────────────
-- Enable RLS with no anon/authenticated policy → all direct row access from
-- the public anon key is denied. service_role bypasses RLS for the embed job.
alter table public.tax_documents enable row level security;
alter table public.tax_chunks enable row level security;

-- Defense in depth: strip write grants so anon/authenticated cannot insert,
-- update or delete even if a permissive policy is added later by mistake.
revoke insert, update, delete on public.tax_documents from anon, authenticated;
revoke insert, update, delete on public.tax_chunks from anon, authenticated;

-- ── Retrieval (RAG) ───────────────────────────────────────────────
-- SECURITY DEFINER so the anon-key chat route can search via this function
-- without being granted direct read access to the tables. search_path is
-- pinned per Supabase guidance for definer functions.
create or replace function public.match_tax_chunks(
  query_embedding vector(1024),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  content text,
  similarity float
)
language sql stable
security definer
set search_path = public, extensions
as $$
  select
    tax_chunks.id,
    tax_chunks.content,
    1 - (tax_chunks.embedding <=> query_embedding) as similarity
  from tax_chunks
  where 1 - (tax_chunks.embedding <=> query_embedding) > match_threshold
  order by tax_chunks.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function public.match_tax_chunks(vector(1024), float, int)
  to anon, authenticated, service_role;
