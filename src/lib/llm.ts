/**
 * Provider-agnostic LLM client (OpenAI-compatible).
 *
 * Chat and embeddings are configured INDEPENDENTLY, so you can mix providers
 * (e.g. chat on DeepSeek, embeddings on NVIDIA — DeepSeek has no embedding API).
 *
 * Each side falls back to the shared LLM_BASE_URL / LLM_API_KEY if its
 * dedicated vars aren't set, so simple single-provider setups still work.
 *
 * Chat env:
 *   LLM_CHAT_BASE_URL   (or LLM_BASE_URL)   e.g. https://api.deepseek.com
 *   LLM_CHAT_API_KEY    (or LLM_API_KEY)
 *   LLM_CHAT_MODEL                          e.g. deepseek-v4-flash
 * Embedding env:
 *   LLM_EMBED_BASE_URL  (or LLM_BASE_URL)   e.g. https://integrate.api.nvidia.com/v1
 *   LLM_EMBED_API_KEY   (or LLM_API_KEY)
 *   LLM_EMBED_MODEL                         e.g. baai/bge-m3
 *   LLM_EMBED_DIMENSIONS  (0 = don't send a dimensions param)
 */

const SHARED_BASE = process.env.LLM_BASE_URL || "";
const SHARED_KEY = process.env.LLM_API_KEY || "";

const CHAT_BASE = (
  process.env.LLM_CHAT_BASE_URL || SHARED_BASE || "https://api.deepseek.com"
).replace(/\/$/, "");
const CHAT_KEY = process.env.LLM_CHAT_API_KEY || SHARED_KEY;
const CHAT_MODEL = process.env.LLM_CHAT_MODEL || "deepseek-v4-flash";

const EMBED_BASE = (
  process.env.LLM_EMBED_BASE_URL || SHARED_BASE || "https://integrate.api.nvidia.com/v1"
).replace(/\/$/, "");
const EMBED_KEY = process.env.LLM_EMBED_API_KEY || SHARED_KEY;
const EMBED_MODEL = process.env.LLM_EMBED_MODEL || "baai/bge-m3";
// Only sent when > 0. Matryoshka models accept it; fixed-size models like
// bge-m3 (1024) reject it, so leave at 0 for those.
const EMBED_DIMENSIONS = Number(process.env.LLM_EMBED_DIMENSIONS || "0");

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function isLocal(url: string): boolean {
  return /localhost|127\.0\.0\.1/.test(url);
}

export function llmConfigured(): boolean {
  // Chat is the user-facing path; consider the service "configured" when chat
  // is reachable (local providers need no key).
  return isLocal(CHAT_BASE) || CHAT_KEY.length > 0;
}

function headers(key: string): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (key) h["Authorization"] = `Bearer ${key}`;
  return h;
}

/**
 * Embed a single text. `inputType` distinguishes query vs passage for
 * retrieval-optimized models; ignored by models that don't support it.
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

  const res = await fetch(`${EMBED_BASE}/embeddings`, {
    method: "POST",
    headers: headers(EMBED_KEY),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Embedding failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.data[0].embedding as number[];
}

/**
 * Non-streaming chat completion. Returns the full assistant message text.
 * Used by server-side jobs (e.g. the admin AI self-test) that want the whole
 * answer at once rather than an SSE stream.
 */
export async function chatComplete(messages: ChatMessage[]): Promise<string> {
  const body: Record<string, unknown> = {
    model: CHAT_MODEL,
    messages,
    stream: false,
    temperature: 0.3,
    top_p: 0.9,
    max_tokens: 2048,
  };
  if (/deepseek/i.test(CHAT_BASE)) {
    body.thinking = { type: "disabled" };
  }
  const res = await fetch(`${CHAT_BASE}/chat/completions`, {
    method: "POST",
    headers: headers(CHAT_KEY),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Chat failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return (data.choices?.[0]?.message?.content as string) ?? "";
}

/**
 * Start a streaming chat completion. Returns the raw fetch Response whose
 * body is an OpenAI-style SSE stream (`data: {choices:[{delta:{content}}]}`).
 */
export async function chatStream(messages: ChatMessage[]): Promise<Response> {
  const body: Record<string, unknown> = {
    model: CHAT_MODEL,
    messages,
    stream: true,
    temperature: 0.3,
    top_p: 0.9,
    max_tokens: 2048,
  };
  // DeepSeek V4 is a hybrid "thinking" model: on ambiguous prompts it can spend
  // the whole token budget on reasoning and emit empty content. Disable thinking
  // (the benchmark showed full accuracy without it) — answers are faster and
  // content always streams. DeepSeek-specific param, so gate it by base URL.
  if (/deepseek/i.test(CHAT_BASE)) {
    body.thinking = { type: "disabled" };
  }
  return fetch(`${CHAT_BASE}/chat/completions`, {
    method: "POST",
    headers: headers(CHAT_KEY),
    body: JSON.stringify(body),
  });
}

export const llmInfo = {
  CHAT_BASE,
  CHAT_MODEL,
  EMBED_BASE,
  EMBED_MODEL,
  EMBED_DIMENSIONS,
};
