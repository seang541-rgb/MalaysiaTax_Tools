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
--     which truncates and resizes the column in place.
--
-- These tables hold PUBLIC tax knowledge (no per-user data), are populated with
-- the Supabase anon key by the embed script and read with the anon key by the
-- chat route via match_tax_chunks(), so RLS is intentionally left disabled.

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

-- Cosine-similarity retrieval used by /api/chat (RAG).
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
