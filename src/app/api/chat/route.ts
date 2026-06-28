import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { embed, chatStream, llmConfigured, llmInfo } from "@/lib/llm";
import { logChatInteraction } from "@/lib/ai-chat-log";
import { billingErrorResponse } from "@/lib/billing/errors";
import {
  consumeCredits,
  InsufficientCreditsError,
  refundCredits,
} from "@/lib/billing/credits";
import { BILLING_FEATURE_COSTS } from "@/lib/billing/plans";
import {
  buildAgentTurn,
  buildDeterministicFallbackAnswer,
  type AgentChatMessage,
} from "@/lib/agent/orchestrator";
import { checkRateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

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
    return "";
  }
}

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

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rateKey = user.id ? `user:${user.id}` : `ip:${ip}`;
    const rateLimit = await checkRateLimit({
      key: rateKey,
      route: "/api/chat",
      limit: 10,
      windowSeconds: 60,
    });
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: "Too many requests. Please wait a moment.",
          resetAt: rateLimit.resetAt,
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = (await request.json().catch(() => null)) as {
      messages?: unknown;
      locale?: unknown;
    } | null;
    const messages = body?.messages;
    const locale = body?.locale;

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

    const sanitizedMessages: AgentChatMessage[] = messages.map((m) => ({
      role: isChatMessage(m) && m.role === "assistant" ? "assistant" : "user",
      content:
        isChatMessage(m) && typeof m.content === "string"
          ? m.content.slice(0, MAX_MESSAGE_LENGTH)
          : "",
    }));

    const lastUserMsg = [...sanitizedMessages].reverse().find(
      (m: { role: string }) => m.role === "user"
    );
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

    const ragContext = userMessage ? await retrieveContext(userMessage) : "";
    const agentTurn = buildAgentTurn({
      locale,
      userMessage,
      ragContext,
      messages: sanitizedMessages,
    });

    const llmRes = await chatStream(agentTurn.llmMessages);

    if (!llmRes.ok || !llmRes.body) {
      const errText = await llmRes.text().catch(() => "");
      const fallbackAnswer = buildDeterministicFallbackAnswer(
        agentTurn.agentContext,
        locale
      );
      if (fallbackAnswer) {
        await logChatInteraction({
          userId: user.id,
          locale: typeof locale === "string" ? locale : null,
          question: userMessage,
          answer: fallbackAnswer,
          usedRag: agentTurn.usedRag,
          usedPrecalc: agentTurn.usedPrecalc,
          usedDeterministic: agentTurn.usedDeterministic,
          agentToolName: agentTurn.agentContext?.toolName ?? null,
          agentNeedsFollowUp: agentTurn.agentContext?.needsFollowUp ?? false,
          agentMissingFields:
            agentTurn.agentContext?.missingFields.map(
              (field) => field.field
            ) ?? [],
        });

        const payload = `data: ${JSON.stringify({ token: fallbackAnswer })}\n\ndata: [DONE]\n\n`;
        return new Response(payload, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }

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

    const reader = llmRes.body.getReader();
    const decoder = new TextDecoder();
    const chargedFeature = "ai_tax_question" as const;
    const chargedAmount = aiCreditCost;

    const usedRag = agentTurn.usedRag;
    const usedPrecalc = agentTurn.usedPrecalc;
    const usedDeterministic = agentTurn.usedDeterministic;
    const logUserId = user.id;

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let buffer = "";
        let fullAnswer = "";
        let sawDone = false;
        let streamFailed = false;
        let streamFailure: unknown;

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
                sawDone = true;
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
                // Ignore malformed provider SSE lines.
              }
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (err) {
          streamFailed = true;
          streamFailure = err;
        } finally {
          if (streamFailed && !sawDone) {
            await Promise.resolve(
              refundCredits({
                userId: logUserId,
                feature: chargedFeature,
                amount: chargedAmount,
                errorCode: "STREAM_FAILED_REFUNDED",
                metadata: {
                  route: "/api/chat",
                  partialAnswerLength: fullAnswer.length,
                },
              })
            ).catch(() => {});
          }

          if (fullAnswer) {
            await logChatInteraction({
              userId: logUserId,
              locale: typeof locale === "string" ? locale : null,
              question: userMessage,
              answer: fullAnswer,
              usedRag,
              usedPrecalc,
              usedDeterministic,
              agentToolName: agentTurn.agentContext?.toolName ?? null,
              agentNeedsFollowUp:
                agentTurn.agentContext?.needsFollowUp ?? false,
              agentMissingFields:
                agentTurn.agentContext?.missingFields.map(
                  (field) => field.field
                ) ?? [],
            });
          }
          if (!streamFailed) {
            controller.close();
          } else {
            queueMicrotask(() => {
              controller.error(streamFailure);
            });
          }
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
      await Promise.resolve(
        refundCredits({
          userId: chargedUserId,
          feature: "ai_tax_question",
          amount: aiCreditCost,
          errorCode: "PROVIDER_FAILED_REFUNDED",
          metadata: { route: "/api/chat" },
        })
      ).catch(() => {});
    }

    return new Response(
      JSON.stringify({ error: "Failed to reach the LLM provider." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

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
