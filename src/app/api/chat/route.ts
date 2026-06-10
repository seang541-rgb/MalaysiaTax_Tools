import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { TAX_RATES_YA2025 } from "@/engine/tax-rates";
import { TaxBand } from "@/engine/types";
import { embed, chatStream, llmConfigured, llmInfo } from "@/lib/llm";

// Supabase client for RAG
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

/** Retrieve relevant tax knowledge chunks via vector similarity */
async function retrieveContext(query: string): Promise<string> {
  if (!supabase) return "";

  try {
    const embedding = await embed(query, "query");

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

// ─── Pre-calculation: deterministic tax math ───

/** Extract annual income amount from user message */
function extractIncomeAmount(message: string): number | null {
  // Normalize: remove commas, spaces in numbers
  const normalized = message.replace(/,/g, "").replace(/\s+/g, " ");

  // Patterns for annual income (支持 EN/ZH/MS)
  const annualPatterns = [
    // English: "annual income is RM80000", "yearly salary of RM80000", "income of RM 80000"
    /(?:annual|yearly|year|tahunan|tahun|年收入|年薪|年入|收入)[^0-9]*(?:RM|rm)?\s*(\d+(?:\.\d+)?)\s*(?:k|K)?/i,
    // Direct: "RM80000 per year", "RM80000 setahun", "RM80000一年"
    /(?:RM|rm)\s*(\d+(?:\.\d+)?)\s*(?:k|K)?\s*(?:per year|a year|setahun|一年|每年|\/year)/i,
    // Generic: "annual income RM80000" or "pendapatan tahunan RM80000"
    /(?:RM|rm)\s*(\d+(?:\.\d+)?)\s*(?:k|K)?/i,
  ];

  // Monthly patterns (需要 ×12)
  const monthlyPatterns = [
    // English: "monthly salary RM8000", "monthly income RM8000"
    /(?:monthly|month|sebulan|bulan|bulanan|月薪|月收入|月入|每月)[^0-9]*(?:RM|rm)?\s*(\d+(?:\.\d+)?)\s*(?:k|K)?/i,
    // Direct: "RM8000 per month", "RM8000 sebulan", "RM8000一个月"
    /(?:RM|rm)\s*(\d+(?:\.\d+)?)\s*(?:k|K)?\s*(?:per month|a month|sebulan|\/month|一个月|每个月|每月|\/bulan)/i,
    // "gaji RM8000" (salary in Malay, often implies monthly)
    /(?:gaji|salary|薪水|工资)[^0-9]*(?:RM|rm)?\s*(\d+(?:\.\d+)?)\s*(?:k|K)?/i,
  ];

  // Check monthly patterns first (more specific)
  for (const pattern of monthlyPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      let amount = parseFloat(match[1]);
      if (normalized.match(new RegExp(match[1] + "\\s*[kK]"))) {
        amount *= 1000;
      }
      // Sanity: monthly should be < 200k (reasonable range)
      if (amount > 0 && amount < 200000) {
        return amount * 12; // Convert to annual
      }
    }
  }

  // Check annual patterns
  for (const pattern of annualPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      let amount = parseFloat(match[1]);
      if (normalized.match(new RegExp(match[1] + "\\s*[kK]"))) {
        amount *= 1000;
      }
      // Sanity: annual should be > 1000 (filter out band numbers like "19%")
      if (amount >= 1000) {
        return amount;
      }
    }
  }

  return null;
}

interface PreCalculatedTax {
  grossIncome: number;
  personalRelief: number;
  chargeableIncome: number;
  bands: { min: number; max: number; rate: number; taxable: number; tax: number }[];
  totalTax: number;
  rebate: number;
  finalTax: number;
  isMonthly: boolean; // whether user asked in monthly terms
  monthlyAmount?: number;
}

/** Deterministic tax calculation using the rule engine */
function preCalculateTax(annualIncome: number, originalMessage: string): PreCalculatedTax {
  const personalRelief = 9000; // automatic individual relief
  const chargeableIncome = Math.max(0, annualIncome - personalRelief);

  const bands: PreCalculatedTax["bands"] = [];
  let remaining = chargeableIncome;

  for (const band of TAX_RATES_YA2025) {
    if (remaining <= 0) break;
    const bandWidth = band.max === Infinity ? remaining : band.max - band.min;
    const taxable = Math.min(remaining, bandWidth);
    const tax = Math.round(taxable * band.rate * 100) / 100;
    bands.push({
      min: band.min,
      max: band.max === Infinity ? chargeableIncome : band.max,
      rate: band.rate,
      taxable,
      tax,
    });
    remaining -= taxable;
  }

  const totalTax = bands.reduce((sum, b) => sum + b.tax, 0);

  // Rebate: RM400 if chargeable income <= RM35,000
  const rebate = chargeableIncome <= 35000 ? 400 : 0;
  const finalTax = Math.max(0, totalTax - rebate);

  // Detect if user asked in monthly terms
  const isMonthly = /月|month|bulan|gaji/i.test(originalMessage);

  return {
    grossIncome: annualIncome,
    personalRelief,
    chargeableIncome,
    bands,
    totalTax,
    rebate,
    finalTax,
    isMonthly,
    monthlyAmount: isMonthly ? annualIncome / 12 : undefined,
  };
}

/** Format pre-calculated tax into injection text for system prompt */
function formatPreCalculation(calc: PreCalculatedTax): string {
  const incomeLabel = calc.isMonthly
    ? `RM${calc.monthlyAmount!.toLocaleString()} per month (= RM${calc.grossIncome.toLocaleString()} per year)`
    : `RM${calc.grossIncome.toLocaleString()} per year`;

  let text = `\n\n--- PRE-CALCULATED TAX RESULT (use these EXACT numbers) ---\n`;
  text += `User's income: ${incomeLabel}\n`;
  text += `Personal relief: RM${calc.personalRelief.toLocaleString()}\n`;
  text += `Chargeable income: RM${calc.grossIncome.toLocaleString()} - RM${calc.personalRelief.toLocaleString()} = RM${calc.chargeableIncome.toLocaleString()}\n\n`;
  text += `Tax bands applied to chargeable income RM${calc.chargeableIncome.toLocaleString()}:\n`;

  let cumulative = 0;
  for (const band of calc.bands) {
    cumulative += band.tax;
    const ratePercent = (band.rate * 100).toFixed(0);
    const maxLabel = band.max >= 2000000 ? "above" : `${band.min.toLocaleString()}-${band.max.toLocaleString()}`;
    text += `  ${maxLabel}: ${ratePercent}% on RM${band.taxable.toLocaleString()} = RM${band.tax.toLocaleString()} (cumulative: RM${cumulative.toLocaleString()})\n`;
  }

  text += `\nTotal tax before rebate: RM${calc.totalTax.toLocaleString()}\n`;
  if (calc.rebate > 0) {
    text += `Rebate: -RM${calc.rebate.toLocaleString()} (chargeable income ≤ RM35,000)\n`;
  }
  text += `FINAL TAX PAYABLE: RM${calc.finalTax.toLocaleString()}\n`;
  text += `--- END PRE-CALCULATED RESULT ---\n`;
  text += `IMPORTANT: Present these EXACT numbers to the user. Do NOT recalculate. Just format and explain them clearly in the user's language.\n`;

  return text;
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
5. IMPORTANT: Match the user's language — if user writes in Chinese (中文), reply in Chinese; if English, reply in English; if Malay, reply in Malay
6. Add a disclaimer that your answers are for reference only
7. When appropriate, suggest the user try the calculator tools on MYTax website
8. CRITICAL: When calculating tax, you MUST apply EVERY tax band separately. Do NOT skip or merge the 0%, 1%, 3% bands. The first RM5,000 is 0%, next RM15,000 is 1% (=RM150), next RM15,000 is 3% (=RM450). The cumulative tax at RM35,000 is RM600, NOT RM0.

Key tax bands (YA2025, resident individual) — APPLY EACH BAND:
- 0 – 5,000: 0% (cumulative: RM0)
- 5,001 – 20,000: 1% on RM15,000 = RM150 (cumulative: RM150)
- 20,001 – 35,000: 3% on RM15,000 = RM450 (cumulative: RM600)
- 35,001 – 50,000: 6% on RM15,000 = RM900 (cumulative: RM1,500)
- 50,001 – 70,000: 11% on RM20,000 = RM2,200 (cumulative: RM3,700)
- 70,001 – 100,000: 19% on RM30,000 = RM5,700 (cumulative: RM9,400)
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

// ─── Rate limiter (in-memory, per-IP, sliding window) ───
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10; // max 10 requests per minute per IP
const rateLimitMap = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  // Remove expired entries
  const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (valid.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(ip, valid);
    return true;
  }
  valid.push(now);
  rateLimitMap.set(ip, valid);
  return false;
}

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of rateLimitMap) {
    const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (valid.length === 0) rateLimitMap.delete(ip);
    else rateLimitMap.set(ip, valid);
  }
}, 300_000);

const MAX_MESSAGE_LENGTH = 500;
const MAX_MESSAGES = 20;

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown";
    if (isRateLimited(ip)) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please wait a moment." }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    const { messages, locale } = await request.json();

    // Input validation
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid messages format." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    if (messages.length > MAX_MESSAGES) {
      return new Response(
        JSON.stringify({ error: "Too many messages in conversation." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    // Sanitize: trim and cap each message length
    const sanitizedMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: typeof m.content === "string" ? m.content.slice(0, MAX_MESSAGE_LENGTH) : "",
    }));

    // Get the latest user message for RAG retrieval + pre-calculation
    const lastUserMsg = [...sanitizedMessages].reverse().find(
      (m: { role: string }) => m.role === "user"
    );
    const userMessage = lastUserMsg?.content || "";
    const ragContext = userMessage ? await retrieveContext(userMessage) : "";

    // Pre-calculate tax if user mentions an income amount
    let preCalcContext = "";
    const detectedIncome = extractIncomeAmount(userMessage);
    if (detectedIncome !== null) {
      const calc = preCalculateTax(detectedIncome, userMessage);
      preCalcContext = formatPreCalculation(calc);
    }

    // Build system prompt with RAG context + pre-calculated tax injected
    let systemWithRag = SYSTEM_PROMPT;
    if (preCalcContext) {
      systemWithRag += preCalcContext;
    }
    if (ragContext) {
      systemWithRag += `\n\nUse the following retrieved knowledge to enhance your answer. Prioritize this information over your general knowledge when answering:${ragContext}`;
    }

    // Build the message array with system prompt
    const llmMessages = [
      { role: "system" as const, content: systemWithRag },
      ...sanitizedMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    // Stream from the configured OpenAI-compatible provider
    const llmRes = await chatStream(llmMessages);

    if (!llmRes.ok || !llmRes.body) {
      const errText = await llmRes.text().catch(() => "");
      return new Response(
        JSON.stringify({
          error: `LLM error: ${llmRes.status}`,
          detail: errText,
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    // Transform the provider's OpenAI-style SSE → our client SSE (data: {token})
    const reader = llmRes.body.getReader();
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

            for (const rawLine of lines) {
              const line = rawLine.trim();
              if (!line || !line.startsWith("data:")) continue;
              const payload = line.slice(5).trim();
              if (payload === "[DONE]") {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                continue;
              }
              try {
                const json = JSON.parse(payload);
                const token = json.choices?.[0]?.delta?.content;
                if (token) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ token })}\n\n`)
                  );
                }
              } catch {
                // skip malformed lines
              }
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
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
  } catch {
    return new Response(
      JSON.stringify({ error: "Failed to reach the LLM provider." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/** GET /api/chat — lightweight health check (no LLM/credit usage) */
export async function GET() {
  const ok = llmConfigured();
  return new Response(
    JSON.stringify({
      status: ok ? "ok" : "error",
      model: llmInfo.CHAT_MODEL,
      configured: ok,
    }),
    {
      status: ok ? 200 : 503,
      headers: { "Content-Type": "application/json" },
    }
  );
}
