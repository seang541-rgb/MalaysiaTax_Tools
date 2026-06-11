"""
Embedding pipeline: chunk raw knowledge docs → generate embeddings via the
OpenAI-compatible LLM provider (NVIDIA NIM by default) → upload to Supabase tax_chunks.

Usage:
  $env:PYTHONIOENCODING = "utf-8"
  python training-data/scripts/embed-and-upload.py

Requires: pip install httpx
"""
import os
import json
import re
import sys
import time

try:
    import httpx
except ImportError:
    print("Installing httpx...")
    os.system(f"{sys.executable} -m pip install httpx")
    import httpx

BASE = os.path.join(os.path.dirname(__file__), "..")
RAW_DIR = os.path.join(BASE, "raw")

# --- Config (embeddings via OpenAI-compatible provider; defaults to NVIDIA NIM) ---
# Prefer the dedicated embedding vars, fall back to the shared LLM_* ones.
LLM_BASE_URL = os.environ.get("LLM_EMBED_BASE_URL") or os.environ.get("LLM_BASE_URL", "https://integrate.api.nvidia.com/v1")
LLM_API_KEY = os.environ.get("LLM_EMBED_API_KEY") or os.environ.get("LLM_API_KEY", "")
EMBED_MODEL = os.environ.get("LLM_EMBED_MODEL", "baai/bge-m3")
EMBED_DIMENSIONS = int(os.environ.get("LLM_EMBED_DIMENSIONS", "0"))
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
CHUNK_SIZE = 500      # target chars per chunk
CHUNK_OVERLAP = 50    # overlap between chunks

# --- Load env from .env.local if not set ---
def load_env():
    global SUPABASE_URL, SUPABASE_KEY, LLM_BASE_URL, LLM_API_KEY, EMBED_MODEL, EMBED_DIMENSIONS
    env_path = os.path.join(BASE, "..", ".env.local")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if "=" in line and not line.startswith("#"):
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip()
                    if key == "NEXT_PUBLIC_SUPABASE_URL" and not SUPABASE_URL:
                        SUPABASE_URL = val
                    elif key == "NEXT_PUBLIC_SUPABASE_ANON_KEY" and not SUPABASE_KEY:
                        SUPABASE_KEY = val
                    elif key in ("LLM_EMBED_BASE_URL", "LLM_BASE_URL") and val:
                        LLM_BASE_URL = val
                    elif key in ("LLM_EMBED_API_KEY", "LLM_API_KEY") and val:
                        LLM_API_KEY = val
                    elif key == "LLM_EMBED_MODEL" and val:
                        EMBED_MODEL = val
                    elif key == "LLM_EMBED_DIMENSIONS" and val:
                        EMBED_DIMENSIONS = int(val)

load_env()

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: SUPABASE_URL or SUPABASE_KEY not set. Check .env.local")
    sys.exit(1)


def chunk_text(text: str, source: str) -> list[dict]:
    """Split text into overlapping chunks by paragraphs, respecting heading context."""
    chunks = []
    # Split by double newline (paragraphs)
    paragraphs = re.split(r"\n{2,}", text.strip())

    current_heading = ""
    current_chunk = ""

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        # Track headings for context
        if para.startswith("#"):
            current_heading = para.lstrip("#").strip()

        # If adding this paragraph exceeds chunk size, save current and start new
        if len(current_chunk) + len(para) > CHUNK_SIZE and current_chunk:
            chunks.append({
                "content": current_chunk.strip(),
                "heading": current_heading,
            })
            # Keep overlap from end of previous chunk
            overlap = current_chunk[-CHUNK_OVERLAP:] if len(current_chunk) > CHUNK_OVERLAP else ""
            current_chunk = overlap + "\n\n" + para
        else:
            current_chunk += ("\n\n" if current_chunk else "") + para

    # Don't forget the last chunk
    if current_chunk.strip():
        chunks.append({
            "content": current_chunk.strip(),
            "heading": current_heading,
        })

    return chunks


def get_embedding(text: str, client: httpx.Client) -> list[float]:
    """Get embedding vector via the OpenAI-compatible /embeddings endpoint.

    Uses input_type="passage" for stored documents (the query path in the app
    uses "query"). dimensions is pinned so vectors match the Supabase column.
    """
    body = {
        "model": EMBED_MODEL,
        "input": [text],
        "encoding_format": "float",
        "input_type": "passage",
    }
    if EMBED_DIMENSIONS > 0:
        body["dimensions"] = EMBED_DIMENSIONS
    headers = {"Content-Type": "application/json"}
    if LLM_API_KEY:
        headers["Authorization"] = f"Bearer {LLM_API_KEY}"
    resp = client.post(
        f"{LLM_BASE_URL}/embeddings",
        json=body,
        headers=headers,
        timeout=60.0,
    )
    resp.raise_for_status()
    data = resp.json()
    # OpenAI-compatible: {"data": [{"embedding": [...]}], ...}
    return data["data"][0]["embedding"]


def upsert_document(client: httpx.Client, filename: str, title: str, content_length: int) -> str:
    """Insert or get document record, return doc_id."""
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

    # Check if doc already exists (use 'source' column)
    resp = client.get(
        f"{SUPABASE_URL}/rest/v1/tax_documents",
        params={"source": f"eq.{filename}", "select": "id"},
        headers=headers,
    )
    existing = resp.json()
    if isinstance(existing, list) and len(existing) > 0:
        doc_id = existing[0]["id"]
        print(f"  Document exists: {doc_id}")
        # Delete existing chunks for re-embedding
        client.delete(
            f"{SUPABASE_URL}/rest/v1/tax_chunks",
            params={"document_id": f"eq.{doc_id}"},
            headers=headers,
        )
        print(f"  Cleared old chunks")
        return doc_id

    # Insert new document (columns: title, source, content, metadata)
    resp = client.post(
        f"{SUPABASE_URL}/rest/v1/tax_documents",
        headers=headers,
        json={
            "title": title,
            "source": filename,
            "content": f"Knowledge base document: {title}",
            "metadata": {"content_length": content_length},
        },
    )
    if resp.status_code >= 400:
        print(f"  ERROR inserting doc: {resp.status_code} {resp.text}")
        sys.exit(1)
    result = resp.json()
    doc_id = result[0]["id"] if isinstance(result, list) else result["id"]
    print(f"  Created document: {doc_id}")
    return doc_id


def upload_chunk(client: httpx.Client, doc_id: str, chunk: dict, embedding: list[float], idx: int):
    """Upload a single chunk with its embedding to Supabase."""
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }

    resp = client.post(
        f"{SUPABASE_URL}/rest/v1/tax_chunks",
        headers=headers,
        json={
            "document_id": doc_id,
            "content": chunk["content"],
            "chunk_index": idx,
            "embedding": embedding,
            "token_count": len(chunk["content"].split()),
        },
    )
    resp.raise_for_status()


def main():
    print("=" * 60)
    print("MYTax Embedding Pipeline")
    print("=" * 60)
    print(f"Provider:  {LLM_BASE_URL}")
    print(f"Model:     {EMBED_MODEL} ({EMBED_DIMENSIONS} dims)")
    print(f"Supabase:  {SUPABASE_URL}")
    print(f"Chunk:     {CHUNK_SIZE} chars, {CHUNK_OVERLAP} overlap")
    print()

    if not LLM_API_KEY and "localhost" not in LLM_BASE_URL and "127.0.0.1" not in LLM_BASE_URL:
        print("ERROR: LLM_API_KEY not set. Get a free key at https://build.nvidia.com")
        sys.exit(1)

    # Smoke-test the embedding endpoint before processing all files
    with httpx.Client() as client:
        try:
            vec = get_embedding("test", client)
            print(f"Embedding endpoint OK — returned {len(vec)} dims")
            if EMBED_DIMENSIONS and len(vec) != EMBED_DIMENSIONS:
                print(f"WARNING: got {len(vec)} dims but expected {EMBED_DIMENSIONS}. "
                      f"The Supabase vector column must match the returned dimension.")
        except Exception as e:
            print(f"ERROR: embedding endpoint failed: {e}")
            sys.exit(1)

    # Process each raw file
    raw_files = sorted(f for f in os.listdir(RAW_DIR) if f.endswith(".md"))
    total_chunks = 0
    total_errors = 0

    with httpx.Client() as client:
        for fname in raw_files:
            fpath = os.path.join(RAW_DIR, fname)
            with open(fpath, "r", encoding="utf-8") as f:
                content = f.read()

            # Extract title from first heading or filename
            title_match = re.search(r"^#\s+(.+)", content)
            title = title_match.group(1) if title_match else fname.replace(".md", "").replace("-", " ")

            print(f"\n[{fname}] {len(content):,} chars")
            print(f"  Title: {title}")

            # Chunk the content
            chunks = chunk_text(content, fname)
            print(f"  Chunks: {len(chunks)}")

            # Upsert document record
            doc_id = upsert_document(client, fname, title, len(content))

            # Process each chunk
            for i, chunk in enumerate(chunks):
                try:
                    embedding = get_embedding(chunk["content"], client)
                    upload_chunk(client, doc_id, chunk, embedding, i)
                    sys.stdout.write(f"\r  Embedded: {i+1}/{len(chunks)}")
                    sys.stdout.flush()
                except Exception as e:
                    total_errors += 1
                    print(f"\n  ERROR chunk {i}: {e}")

            print(f"\r  Embedded: {len(chunks)}/{len(chunks)} - Done")
            total_chunks += len(chunks)

    print(f"\n{'=' * 60}")
    print(f"COMPLETE")
    print(f"  Documents: {len(raw_files)}")
    print(f"  Chunks:    {total_chunks}")
    print(f"  Errors:    {total_errors}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
