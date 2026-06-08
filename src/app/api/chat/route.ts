import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const MODEL = process.env.OLLAMA_MODEL || "mytax-gemma4";
const EMBED_MODEL = "nomic-embed-text";

// Supabase client for RAG
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

/** Get embedding from Ollama nomic-embed-text */
async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_BASE}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
  });
  if (!res.ok) throw new Error(`Embedding failed: ${res.status}`);
  const data = await res.json();
  return data.embeddings[0];
}

/** Retrieve relevant tax knowledge chunks via vector similarity */
async function retrieveContext(query: string): Promise<string> {
  if (!supabase) return "";

  try {
    const embedding = await getEmbedding(query);

    const { data, error } = await supabase.rpc("match_tax_chunks", {
      query_embedding: embedding,
      match_threshold: 0.4,
      match_count: 3,
    });

    if (error || !data || data.length === 0) return "";

    const chunks = data.map(
      (chunk: { content: string; similarity: number }, i: number) =>
        `[Source ${i + 1} (relevance: ${(chunk.similarity * 100).toFixed(0)}%)]\n${chunk.content}`
    );

    return `\n\n--- Retrieved Tax Knowledge ---\n${chunks.join("\n\n")}\n--- End of Retrieved Knowledge ---\n`;
  } catch {
    // RAG failure is non-fatal — proceed without context
    return "";
  }
}

const SYSTEM_PROMPT = `You are MYTax AI — a Malaysia tax expert assistant. You answer questions about Malaysian taxation accurately and concisely.

Your knowledge covers:
- Personal income tax (YA2025): Progressive rates 0%–30%, 29 relief categories
- Corporate tax: SME preferential rates (15%/17%/24%), standard 24%
- EPF (KWSP): Employer 13% (≤RM5k) or 12% (>RM5k), employee 11%, ceiling RM20k
- SOCSO (PERKESO): Employer 1.75%, employee 0.5%, ceiling RM6k, below 60 only
- EIS (SIP): 0.2% each, ceiling RM6k, below 60 only
- SST: Service tax 8%, Sales tax 5%/10%, threshold RM500k
- PCB (monthly tax deduction): Advance tax deducted by employer monthly

Rules:
1. Always cite specific rates, ceilings, and thresholds with numbers
2. Mention Year of Assessment (YA2025) when relevant
3. If uncertain, say so and recommend consulting LHDN or a tax professional
4. Keep answers concise but complete
5. You can respond in English, Chinese (中文), or Malay (Bahasa Malaysia) — match the user's language
6. Add a disclaimer that your answers are for reference only
7. When appropriate, suggest the user try the calculator tools on MYTax website

Key tax bands (YA2025, resident individual):
- 0 – 5,000: 0%
- 5,001 – 20,000: 1%
- 20,001 – 35,000: 3%
- 35,001 – 50,000: 6%
- 50,001 – 70,000: 11%
- 70,001 – 100,000: 19%
- 100,001 – 400,000: 25%
- 400,001 – 600,000: 26%
- 600,001 – 2,000,000: 28%
- Above 2,000,000: 30%

Key reliefs (YA2025):
- Individual: RM9,000 (auto)
- Spouse: RM4,000
- Child under 18: RM2,000
- Child 18+ studying: RM8,000
- EPF employee: max RM4,000
- Life insurance: max RM3,000
- Education (self): max RM7,000
- Lifestyle: max RM2,500
- Parents medical: max RM8,000`;

export async function POST(request: NextRequest) {
  try {
    const { messages, locale } = await request.json();

    // Get the latest user message for RAG retrieval
    const lastUserMsg = [...messages].reverse().find(
      (m: { role: string }) => m.role === "user"
    );
    const ragContext = lastUserMsg
      ? await retrieveContext(lastUserMsg.content)
      : "";

    // Build system prompt with RAG context injected
    const systemWithRag = ragContext
      ? `${SYSTEM_PROMPT}\n\nUse the following retrieved knowledge to enhance your answer. Prioritize this information over your general knowledge when answering:${ragContext}`
      : SYSTEM_PROMPT;

    // Build the message array with system prompt
    const ollamaMessages = [
      { role: "system", content: systemWithRag },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    // Stream from Ollama
    const ollamaRes = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: ollamaMessages,
        stream: true,
        think: false,
      }),
    });

    if (!ollamaRes.ok) {
      const errText = await ollamaRes.text();
      return new Response(
        JSON.stringify({
          error: `Ollama error: ${ollamaRes.status}`,
          detail: errText,
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    // Transform Ollama's NDJSON stream → text/event-stream
    const reader = ollamaRes.body!.getReader();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const json = JSON.parse(line);
                if (json.message?.content) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ token: json.message.content })}\n\n`)
                  );
                }
                if (json.done) {
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                }
              } catch {
                // skip malformed lines
              }
            }
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Failed to connect to Ollama. Is it running?" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/** GET /api/chat — lightweight health check (no LLM call) */
export async function GET() {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return new Response(JSON.stringify({ status: "error" }), { status: 502 });
    }
    const data = await res.json();
    const models = data.models?.map((m: { name: string }) => m.name) || [];
    const hasModel = models.some((n: string) => n.includes(MODEL.split(":")[0]));
    return new Response(
      JSON.stringify({ status: "ok", model: MODEL, available: hasModel }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(JSON.stringify({ status: "error" }), { status: 500 });
  }
}
