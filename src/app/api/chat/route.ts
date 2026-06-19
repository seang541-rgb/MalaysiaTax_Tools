import { NextRequest } from "next/server";
import { chatStream, llmConfigured, llmInfo } from "@/lib/llm";
import { buildChatContext } from "@/lib/ai/pipeline";
import { logChatInteraction } from "@/lib/ai-chat-log";
import { billingErrorResponse } from "@/lib/billing/errors";
import {
  consumeCredits,
  InsufficientCreditsError,
  refundCredits,
} from "@/lib/billing/credits";
import { BILLING_FEATURE_COSTS } from "@/lib/billing/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// ─── Rate limiter (in-memory, per-IP, sliding window) ───
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10; // max 10 requests per minute per IP
const rateLimitMap = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
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

function isChatMessage(value: unknown): value is {
  role?: unknown;
  content?: unknown;
} {
  return typeof value === "object" && value !== null;
}

export async function POST(request: NextRequest) {
  let chargedAiCredit = false;
  let chargedUserId: string | null = null;
  const aiCreditCost = BILLING_FEATURE_COSTS.ai_tax_question;

  try {
    const supabaseAuth = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return billingErrorResponse(
        "AUTH_REQUIRED",
        401,
        "Please sign in to use MYTax AI."
      );
    }

    // Rate limiting
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    if (isRateLimited(ip)) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please wait a moment." }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = (await request.json().catch(() => null)) as {
      messages?: unknown;
      locale?: unknown;
    } | null;
    const messages = body?.messages;
    const locale = body?.locale;

    // Input validation
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid messages format." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (messages.length > MAX_MESSAGES) {
      return new Response(
        JSON.stringify({ error: "Too many messages in conversation." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    // Sanitize: trim and cap each message length
    const sanitizedMessages = messages.map((m) => ({
      role: isChatMessage(m) && m.role === "assistant" ? "assistant" : "user",
      content:
        isChatMessage(m) && typeof m.content === "string"
          ? m.content.slice(0, MAX_MESSAGE_LENGTH)
          : "",
    }));

    // Get the latest user message for RAG retrieval + pre-calculation
    const lastUserMsg = [...sanitizedMessages]
      .reverse()
      .find((m: { role: string }) => m.role === "user");
    const userMessage = lastUserMsg?.content || "";

    try {
      await consumeCredits({
        userId: user.id,
        feature: "ai_tax_question",
        amount: aiCreditCost,
        requestSummary: {
          route: "/api/chat",
          messageCount: sanitizedMessages.length,
          messageLength: userMessage.length,
        },
      });
      chargedAiCredit = true;
      chargedUserId = user.id;
    } catch (error) {
      if (error instanceof InsufficientCreditsError) {
        return billingErrorResponse(
          "INSUFFICIENT_CREDITS",
          402,
          "Not enough credits for MYTax AI.",
          { balance: error.balance, requiredCredits: error.required }
        );
      }
      throw error;
    }

    // Build the full system prompt (RAG + deterministic facts + pre-calc).
    const { system, usedRag, usedPrecalc, usedDeterministic } =
      await buildChatContext(userMessage, locale);

    const llmMessages = [
      { role: "system" as const, content: system },
      ...sanitizedMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    // Stream from the configured OpenAI-compatible provider
    const llmRes = await chatStream(llmMessages);

    if (!llmRes.ok || !llmRes.body) {
      const errText = await llmRes.text().catch(() => "");
      await refundCredits({
        userId: user.id,
        feature: "ai_tax_question",
        amount: aiCreditCost,
        errorCode: "PROVIDER_FAILED_REFUNDED",
        metadata: {
          route: "/api/chat",
          status: llmRes.status,
          detail: errText,
        },
      });
      chargedAiCredit = false;

      return billingErrorResponse(
        "PROVIDER_FAILED_REFUNDED",
        502,
        `LLM error: ${llmRes.status}`,
        { detail: errText }
      );
    }

    // Transform the provider's OpenAI-style SSE → our client SSE (data: {token})
    const reader = llmRes.body.getReader();
    const decoder = new TextDecoder();

    const logUserId = user.id;

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let buffer = "";
        let fullAnswer = "";

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
                  fullAnswer += token;
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
          // Best-effort quality log. Await BEFORE closing the stream so the
          // serverless function stays alive until the write completes — a
          // fire-and-forget after close() gets frozen/killed on Vercel.
          // logChatInteraction swallows its own errors, so this never throws.
          if (fullAnswer) {
            await logChatInteraction({
              userId: logUserId,
              locale: typeof locale === "string" ? locale : null,
              question: userMessage,
              answer: fullAnswer,
              usedRag,
              usedPrecalc,
              usedDeterministic,
            });
          }
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
    if (chargedAiCredit && chargedUserId) {
      await refundCredits({
        userId: chargedUserId,
        feature: "ai_tax_question",
        amount: aiCreditCost,
        errorCode: "PROVIDER_FAILED_REFUNDED",
        metadata: { route: "/api/chat" },
      }).catch(() => {});
    }

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
      available: ok,
    }),
    {
      status: ok ? 200 : 503,
      headers: { "Content-Type": "application/json" },
    }
  );
}
