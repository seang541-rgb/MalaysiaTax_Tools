/**
 * Admin: rebuild the RAG knowledge base from training-data/raw/*.md.
 *
 * This is the web equivalent of training-data/scripts/embed-and-upload.py, for
 * environments where running the Python pipeline locally is inconvenient. It
 * runs on Vercel (which can reach Supabase and the embedding provider) and is
 * driven one file at a time by /[locale]/admin/reindex to stay under the
 * serverless time limit.
 *
 * Auth: signed-in admin only (email in ADMIN_EMAIL). Writes use the
 * service-role key (bypasses RLS).
 */
import { promises as fs } from "fs";
import path from "path";
import { embed } from "@/lib/llm";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { chunkText, extractTitle } from "@/lib/rag/chunk";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const RAW_DIR = path.join(process.cwd(), "training-data", "raw");

async function listFiles(): Promise<string[]> {
  const entries = await fs.readdir(RAW_DIR);
  return entries.filter((f) => f.endsWith(".md")).sort();
}

async function isAdmin(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return isAdminEmail(user?.email);
}

export async function GET() {
  if (!(await isAdmin())) {
    return Response.json({ error: "unauthorized" }, { status: 403 });
  }
  try {
    const files = await listFiles();
    return Response.json({ total: files.length, files });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "failed to list files" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return Response.json({ error: "unauthorized" }, { status: 403 });
  }

  let index = 0;
  try {
    const body = (await req.json()) as { index?: number };
    index = Number(body?.index ?? 0);
  } catch {
    index = 0;
  }

  try {
    const files = await listFiles();
    if (!Number.isInteger(index) || index < 0 || index >= files.length) {
      return Response.json(
        { error: "index out of range", total: files.length },
        { status: 400 }
      );
    }

    const fname = files[index];
    const content = await fs.readFile(path.join(RAW_DIR, fname), "utf-8");
    const title = extractTitle(content, fname);
    const chunks = chunkText(content);

    const supabase = createSupabaseAdminClient();

    // Upsert the document row by source, clearing old chunks for re-embedding.
    const { data: existing, error: selErr } = await supabase
      .from("tax_documents")
      .select("id")
      .eq("source", fname)
      .maybeSingle();
    if (selErr) throw new Error(`select document failed: ${selErr.message}`);

    let documentId: string;
    if (existing) {
      documentId = existing.id;
      const { error: delErr } = await supabase
        .from("tax_chunks")
        .delete()
        .eq("document_id", documentId);
      if (delErr) throw new Error(`clear old chunks failed: ${delErr.message}`);
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from("tax_documents")
        .insert({
          title,
          source: fname,
          content: `Knowledge base document: ${title}`,
          metadata: { content_length: content.length },
        })
        .select("id")
        .single();
      if (insErr) throw new Error(`insert document failed: ${insErr.message}`);
      documentId = inserted.id;
    }

    // Embed and insert each chunk.
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await embed(chunks[i].content, "passage");
      const { error: chunkErr } = await supabase.from("tax_chunks").insert({
        document_id: documentId,
        content: chunks[i].content,
        chunk_index: i,
        embedding,
        token_count: chunks[i].content.split(/\s+/).filter(Boolean).length,
      });
      if (chunkErr) {
        throw new Error(`insert chunk ${i} failed: ${chunkErr.message}`);
      }
    }

    return Response.json({
      index,
      total: files.length,
      file: fname,
      chunks: chunks.length,
      done: index + 1 >= files.length,
    });
  } catch (e) {
    return Response.json(
      {
        index,
        error: e instanceof Error ? e.message : "reindex failed",
      },
      { status: 500 }
    );
  }
}
