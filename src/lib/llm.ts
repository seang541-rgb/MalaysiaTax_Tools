/**
 * Provider-agnostic LLM client (OpenAI-compatible).
 *
 * Works with any OpenAI-compatible endpoint by changing env vars only:
 *   - NVIDIA NIM (production):  https://integrate.api.nvidia.com/v1
 *   - Ollama (local dev):       http://localhost:11434/v1
 *   - Any paid provider later:  just swap LLM_BASE_URL / LLM_API_KEY / model
 *
 * Env:
 *   LLM_BASE_URL          default https://integrate.api.nvidia.com/v1
 *   LLM_API_KEY           required for hosted providers (nvapi-... for NVIDIA)
 *   LLM_CHAT_MODEL        e.g. meta/llama-3.3-70b-instruct, qwen/qwen3-...
 *   LLM_EMBED_MODEL       e.g. nvidia/llama-3.2-nv-embedqa-1b-v2
 *   LLM_EMBED_DIMENSIONS  default 768 (must match the Supabase vector column)
 */

const BASE_URL =
  process.env.LLM_BASE_URL || "https://integrate.api.nvidia.com/v1";
const API_KEY = process.env.LLM_API_KEY || "";
const CHAT_MODEL = process.env.LLM_CHAT_MODEL || "meta/llama-3.3-70b-instruct";
const EMBED_MODEL =
  process.env.LLM_EMBED_MODEL || "nvidia/llama-3.2-nv-embedqa-1b-v2";
const EMBED_DIMENSIONS = Number(process.env.LLM_EMBED_DIMENSIONS || "768");

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export function llmConfigured(): boolean {
  // Local Ollama needs no key; hosted providers do. Treat a localhost base
  // URL as always-configured so local dev works without a key.
  if (/localhost|127\.0\.0\.1/.test(BASE_URL)) return true;
  return API_KEY.length > 0;
}

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (API_KEY) h["Authorization"] = `Bearer ${API_KEY}`;
  return h;
}

/**
 * Embed a single text. `inputType` distinguishes query vs passage for
 * retrieval-optimized models (NVIDIA NeMo Retriever); ignored by models
 * that don't support it.
 */
export async function embed(
  text: string,
  inputType: "query" | "passage" = "query"
): Promise<number[]> {
  const body: Record<string, unknown> = {
    model: EMBED_MODEL,
    input: [text],
    encoding_format: "float",
    input_type: inputType,
  };
  if (EMBED_DIMENSIONS > 0) body.dimensions = EMBED_DIMENSIONS;

  const res = await fetch(`${BASE_URL}/embeddings`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Embedding failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.data[0].embedding as number[];
}

/**
 * Start a streaming chat completion. Returns the raw fetch Response whose
 * body is an OpenAI-style SSE stream (`data: {choices:[{delta:{content}}]}`).
 */
export async function chatStream(messages: ChatMessage[]): Promise<Response> {
  return fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages,
      stream: true,
      temperature: 0.3,
      top_p: 0.9,
      max_tokens: 1024,
    }),
  });
}

export const llmInfo = { BASE_URL, CHAT_MODEL, EMBED_MODEL, EMBED_DIMENSIONS };
