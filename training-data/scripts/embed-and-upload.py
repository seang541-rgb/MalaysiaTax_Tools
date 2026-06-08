"""
Embedding pipeline: chunk raw knowledge docs → generate embeddings via Ollama nomic-embed-text → upload to Supabase tax_chunks.

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

# --- Config ---
OLLAMA_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
EMBED_MODEL = "nomic-embed-text"
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
CHUNK_SIZE = 500      # target chars per chunk
CHUNK_OVERLAP = 50    # overlap between chunks

# --- Load env from .env.local if not set ---
def load_env():
    global SUPABASE_URL, SUPABASE_KEY
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
    """Get embedding vector from Ollama nomic-embed-text."""
    resp = client.post(
        f"{OLLAMA_URL}/api/embed",
        json={"model": EMBED_MODEL, "input": text},
        timeout=60.0,
    )
    resp.raise_for_status()
    data = resp.json()
    # Ollama returns {"embeddings": [[...]], ...}
    return data["embeddings"][0]


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
    print(f"Ollama:    {OLLAMA_URL}")
    print(f"Model:     {EMBED_MODEL}")
    print(f"Supabase:  {SUPABASE_URL}")
    print(f"Chunk:     {CHUNK_SIZE} chars, {CHUNK_OVERLAP} overlap")
    print()

    # Check Ollama is running
    with httpx.Client() as client:
        try:
            resp = client.get(f"{OLLAMA_URL}/api/tags", timeout=10.0)
            models = [m["name"] for m in resp.json().get("models", [])]
            if not any(EMBED_MODEL in m for m in models):
                print(f"Pulling {EMBED_MODEL}...")
                pull_resp = client.post(
                    f"{OLLAMA_URL}/api/pull",
                    json={"name": EMBED_MODEL},
                    timeout=300.0,
                )
                print(f"  Pull complete")
        except Exception as e:
            print(f"ERROR: Cannot connect to Ollama at {OLLAMA_URL}: {e}")
            print("Make sure Ollama is running: ollama serve")
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
