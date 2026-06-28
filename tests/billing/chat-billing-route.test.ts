import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const consumeCreditsMock = vi.fn();
const refundCreditsMock = vi.fn();
const embedMock = vi.fn();
const chatStreamMock = vi.fn();
const checkRateLimitMock = vi.fn();
const buildAgentTurnWithRetrievalMock = vi.fn();
let realBuildAgentTurnWithRetrieval: typeof import("@/lib/agent/orchestrator").buildAgentTurnWithRetrieval;

class MockInsufficientCreditsError extends Error {
  code = "INSUFFICIENT_CREDITS" as const;

  constructor(
    public balance: number,
    public required: number
  ) {
    super("Insufficient credits.");
  }
}

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      getUser: getUserMock,
    },
  })),
}));

vi.mock("@/lib/billing/credits", () => ({
  consumeCredits: consumeCreditsMock,
  refundCredits: refundCreditsMock,
  InsufficientCreditsError: MockInsufficientCreditsError,
}));

vi.mock("@/lib/llm", () => ({
  embed: embedMock,
  chatStream: chatStreamMock,
  llmConfigured: vi.fn(() => true),
  llmInfo: { CHAT_MODEL: "test-model" },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: checkRateLimitMock,
}));

vi.mock("@/lib/agent/orchestrator", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/agent/orchestrator")>();
  realBuildAgentTurnWithRetrieval = actual.buildAgentTurnWithRetrieval;
  buildAgentTurnWithRetrievalMock.mockImplementation(
    actual.buildAgentTurnWithRetrieval
  );
  return {
    ...actual,
    buildAgentTurnWithRetrieval: buildAgentTurnWithRetrievalMock,
  };
});

describe("AI chat billing gate", () => {
  beforeEach(() => {
    vi.resetModules();
    getUserMock.mockReset();
    consumeCreditsMock.mockReset();
    refundCreditsMock.mockReset();
    embedMock.mockReset();
    chatStreamMock.mockReset();
    checkRateLimitMock.mockReset();
    buildAgentTurnWithRetrievalMock.mockReset();
    buildAgentTurnWithRetrievalMock.mockImplementation(
      realBuildAgentTurnWithRetrieval
    );
    checkRateLimitMock.mockResolvedValue({
      allowed: true,
      remaining: 9,
      resetAt: null,
    });
  });

  it("requires authentication for POST", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const { POST } = await import("@/app/api/chat/route");

    const res = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "How much tax for RM5000?" }],
        }),
      }) as never
    );

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      error: {
        code: "AUTH_REQUIRED",
        message: "Please sign in to use MYTax AI.",
      },
    });
    expect(consumeCreditsMock).not.toHaveBeenCalled();
    expect(embedMock).not.toHaveBeenCalled();
    expect(chatStreamMock).not.toHaveBeenCalled();
  });

  it("returns 402 before provider calls when credits are insufficient", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "user@example.com" } },
    });
    consumeCreditsMock.mockRejectedValue(
      new MockInsufficientCreditsError(0, 1)
    );
    const { POST } = await import("@/app/api/chat/route");

    const res = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "How much tax for RM5000?" }],
        }),
      }) as never
    );

    expect(res.status).toBe(402);
    await expect(res.json()).resolves.toEqual({
      error: {
        code: "INSUFFICIENT_CREDITS",
        message: "Not enough credits for MYTax AI.",
        details: { balance: 0, requiredCredits: 1 },
      },
    });
    expect(embedMock).not.toHaveBeenCalled();
    expect(chatStreamMock).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON before charging credits", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "user@example.com" } },
    });
    const { POST } = await import("@/app/api/chat/route");

    const res = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: "{bad json",
      }) as never
    );

    expect(res.status).toBe(400);
    expect(consumeCreditsMock).not.toHaveBeenCalled();
    expect(embedMock).not.toHaveBeenCalled();
    expect(chatStreamMock).not.toHaveBeenCalled();
  });

  it("rate limits before charging credits", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "user@example.com" } },
    });
    checkRateLimitMock.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: "2026-06-25T08:00:00.000Z",
    });
    const { POST } = await import("@/app/api/chat/route");

    const res = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "How much tax for RM5000?" }],
        }),
      }) as never
    );

    expect(res.status).toBe(429);
    expect(consumeCreditsMock).not.toHaveBeenCalled();
    expect(chatStreamMock).not.toHaveBeenCalled();
  });

  it("injects the calculator-aligned monthly salary pre-calculation", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "user@example.com" } },
    });
    consumeCreditsMock.mockResolvedValue({ balance: 9 });
    embedMock.mockRejectedValue(new Error("skip rag"));
    chatStreamMock.mockResolvedValue(
      new Response('data: {"choices":[{"delta":{"content":"ok"}}]}\n\ndata: [DONE]\n\n')
    );
    const { POST } = await import("@/app/api/chat/route");

    const res = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [
            { role: "user", content: "monthly salary RM5000 single" },
          ],
        }),
      }) as never
    );

    expect(res.status).toBe(200);
    expect(chatStreamMock).toHaveBeenCalledOnce();
    const messages = chatStreamMock.mock.calls[0][0] as Array<{
      role: string;
      content: string;
    }>;
    expect(messages[0].content).toContain(
      "Estimated EPF employee relief: RM4,000"
    );
    expect(messages[0].content).toContain("Estimated SOCSO/EIS relief: RM350");
    expect(messages[0].content).toContain("FINAL TAX PAYABLE: RM1,299");
  });

  it("injects exact SST threshold facts for revenue questions", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "user@example.com" } },
    });
    consumeCreditsMock.mockResolvedValue({ balance: 9 });
    embedMock.mockRejectedValue(new Error("skip rag"));
    chatStreamMock.mockResolvedValue(
      new Response('data: {"choices":[{"delta":{"content":"ok"}}]}\n\ndata: [DONE]\n\n')
    );
    const { POST } = await import("@/app/api/chat/route");

    const res = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          locale: "en",
          messages: [
            {
              role: "user",
              content:
                "Do I need to register SST if taxable service revenue is RM480,000?",
            },
          ],
        }),
      }) as never
    );

    expect(res.status).toBe(200);
    const messages = chatStreamMock.mock.calls[0][0] as Array<{
      role: string;
      content: string;
    }>;
    expect(messages[0].content).toContain("EXACT MYTAX FACTS (SST)");
    expect(messages[0].content).toContain("Reply language: English");
    expect(messages[0].content).toContain(
      "Conclusion: registration is not required."
    );
  });

  it("streams agent metadata before provider tokens", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "user@example.com" } },
    });
    consumeCreditsMock.mockResolvedValue({ balance: 9 });
    embedMock.mockRejectedValue(new Error("skip rag"));
    chatStreamMock.mockResolvedValue(
      new Response('data: {"choices":[{"delta":{"content":"ok"}}]}\n\ndata: [DONE]\n\n')
    );
    const { POST } = await import("@/app/api/chat/route");

    const res = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          locale: "en",
          messages: [
            {
              role: "user",
              content:
                "Do I need to register SST if taxable service revenue is RM700,000?",
            },
          ],
        }),
      }) as never
    );

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('"agent"');
    expect(text).toContain('"toolName":"sst_checker"');
    expect(text).toContain('"calculatorLabel":"SST Calculator"');
    expect(text).toContain('"calculatorPath":"/sst"');
    expect(text.indexOf('"agent"')).toBeLessThan(text.indexOf('"token":"ok"'));
  });

  it("streams deterministic assumptions in agent metadata", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "user@example.com" } },
    });
    consumeCreditsMock.mockResolvedValue({ balance: 9 });
    embedMock.mockRejectedValue(new Error("skip rag"));
    chatStreamMock.mockResolvedValue(
      new Response('data: {"choices":[{"delta":{"content":"ok"}}]}\n\ndata: [DONE]\n\n')
    );
    const { POST } = await import("@/app/api/chat/route");

    const res = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          locale: "en",
          messages: [
            {
              role: "user",
              content: "Single monthly salary RM5000, calculate personal tax.",
            },
          ],
        }),
      }) as never
    );

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('"assumptions"');
    expect(text).toContain("YA2025");
    expect(text).toContain("Malaysian tax resident individual");
  });

  it("asks for SST tax type before calculating ambiguous SST questions", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "user@example.com" } },
    });
    consumeCreditsMock.mockResolvedValue({ balance: 9 });
    embedMock.mockRejectedValue(new Error("skip rag"));
    chatStreamMock.mockResolvedValue(
      new Response('data: {"choices":[{"delta":{"content":"ok"}}]}\n\ndata: [DONE]\n\n')
    );
    const { POST } = await import("@/app/api/chat/route");

    const res = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          locale: "en",
          messages: [
            {
              role: "user",
              content: "RM700k SST need register?",
            },
          ],
        }),
      }) as never
    );

    expect(res.status).toBe(200);
    const messages = chatStreamMock.mock.calls[0][0] as Array<{
      role: string;
      content: string;
    }>;
    expect(messages[0].content).toContain("FOLLOW-UP REQUIRED");
    expect(messages[0].content).toContain("sales tax or service tax");
    expect(messages[0].content).not.toContain("Conclusion: registration is required.");
  });

  it("does not inject personal tax pre-calculation into corporate questions", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "user@example.com" } },
    });
    consumeCreditsMock.mockResolvedValue({ balance: 9 });
    embedMock.mockRejectedValue(new Error("skip rag"));
    chatStreamMock.mockResolvedValue(
      new Response('data: {"choices":[{"delta":{"content":"ok"}}]}\n\ndata: [DONE]\n\n')
    );
    const { POST } = await import("@/app/api/chat/route");

    const res = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content:
                "My SME company chargeable income is RM800,000. Calculate corporate tax.",
            },
          ],
        }),
      }) as never
    );

    expect(res.status).toBe(200);
    const messages = chatStreamMock.mock.calls[0][0] as Array<{
      role: string;
      content: string;
    }>;
    expect(messages[0].content).not.toContain(
      "PRE-CALCULATED TAX RESULT"
    );
  });

  it("returns deterministic fallback when the provider fails after a tool result", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "user@example.com" } },
    });
    consumeCreditsMock.mockResolvedValue({ balance: 9 });
    embedMock.mockRejectedValue(new Error("skip rag"));
    chatStreamMock.mockResolvedValue(
      new Response("provider exploded", { status: 502 })
    );
    const { POST } = await import("@/app/api/chat/route");

    const res = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content:
                "Single employee monthly gross salary RM5000, estimate PCB.",
            },
          ],
        }),
      }) as never
    );

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("deterministic MYTax result");
    expect(text).toContain("Monthly PCB: RM108.25");
    expect(text).toContain("data: [DONE]");
    expect(refundCreditsMock).not.toHaveBeenCalled();
  });

  it("returns a soft failure when the agent tool layer fails before provider work", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "user@example.com" } },
    });
    consumeCreditsMock.mockResolvedValue({ balance: 9 });
    embedMock.mockRejectedValue(new Error("skip rag"));
    buildAgentTurnWithRetrievalMock.mockResolvedValue({
      agentContext: null,
      agentFailureAnswer:
        "I could not complete the MYTax tool calculation. Try [MYTax calculators](/).",
      systemPrompt: "",
      llmMessages: [],
      usedRag: false,
      usedPrecalc: false,
      usedDeterministic: false,
    });
    const { POST } = await import("@/app/api/chat/route");

    const res = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "Service tax revenue RM700k" }],
        }),
      }) as never
    );

    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toContain("MYTax tool calculation");
    expect(chatStreamMock).not.toHaveBeenCalled();
    expect(refundCreditsMock).not.toHaveBeenCalled();
  });

  it("refunds credits when the provider returns a non-200 response without a tool result", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "user@example.com" } },
    });
    consumeCreditsMock.mockResolvedValue({ balance: 9 });
    embedMock.mockRejectedValue(new Error("skip rag"));
    chatStreamMock.mockResolvedValue(
      new Response("provider exploded", { status: 502 })
    );
    const { POST } = await import("@/app/api/chat/route");

    const res = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "When is the tax deadline?" }],
        }),
      }) as never
    );

    expect(res.status).toBe(502);
    expect(refundCreditsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        feature: "ai_tax_question",
        amount: 1,
        errorCode: "PROVIDER_FAILED_REFUNDED",
      })
    );
  });

  it("refunds credits when the provider stream fails before DONE", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "user@example.com" } },
    });
    consumeCreditsMock.mockResolvedValue({ balance: 9 });
    embedMock.mockRejectedValue(new Error("skip rag"));

    let sentPartial = false;
    const failingStream = new ReadableStream({
      pull(controller) {
        if (!sentPartial) {
          sentPartial = true;
          controller.enqueue(
            new TextEncoder().encode(
              'data: {"choices":[{"delta":{"content":"partial"}}]}\n\n'
            )
          );
          return;
        }

        controller.error(new Error("stream broke"));
      },
    });

    chatStreamMock.mockResolvedValue(new Response(failingStream));
    const { POST } = await import("@/app/api/chat/route");

    const res = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "monthly salary RM5000" }],
        }),
      }) as never
    );

    expect(res.status).toBe(200);
    const reader = res.body!.getReader();
    await expect(reader.read()).resolves.toMatchObject({ done: false });
    await expect(reader.read()).resolves.toMatchObject({ done: false });
    await expect(reader.read()).rejects.toThrow("stream broke");

    await vi.waitFor(() => {
      expect(refundCreditsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          feature: "ai_tax_question",
          amount: 1,
          errorCode: "STREAM_FAILED_REFUNDED",
        })
      );
    });
  });

  it("does not refund credits when the provider stream reaches DONE", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "user@example.com" } },
    });
    consumeCreditsMock.mockResolvedValue({ balance: 9 });
    embedMock.mockRejectedValue(new Error("skip rag"));
    chatStreamMock.mockResolvedValue(
      new Response('data: {"choices":[{"delta":{"content":"partial"}}]}\n\ndata: [DONE]\n\n')
    );
    const { POST } = await import("@/app/api/chat/route");

    const res = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "monthly salary RM5000" }],
        }),
      }) as never
    );

    expect(res.status).toBe(200);
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let output = "";
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      output += decoder.decode(chunk.value);
    }

    expect(output).toContain("data: [DONE]");
    expect(refundCreditsMock).not.toHaveBeenCalled();
  });

  it("does not refund credits when the stream emits DONE and then fails", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "user@example.com" } },
    });
    consumeCreditsMock.mockResolvedValue({ balance: 9 });
    embedMock.mockRejectedValue(new Error("skip rag"));

    let emittedDone = false;
    const doneThenErrorStream = new ReadableStream({
      pull(controller) {
        if (!emittedDone) {
          emittedDone = true;
          controller.enqueue(
            new TextEncoder().encode("data: [DONE]\n\n")
          );
          return;
        }

        controller.error(new Error("stream broke after done"));
      },
    });

    chatStreamMock.mockResolvedValue(new Response(doneThenErrorStream));
    const { POST } = await import("@/app/api/chat/route");

    const res = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "monthly salary RM5000" }],
        }),
      }) as never
    );

    expect(res.status).toBe(200);
    const reader = res.body!.getReader();
    await expect(reader.read()).resolves.toMatchObject({ done: false });
    await expect(reader.read()).rejects.toThrow("stream broke after done");

    await vi.waitFor(() => {
      expect(refundCreditsMock).not.toHaveBeenCalled();
    });
  });

  it("reports provider availability without charging credits", async () => {
    const { GET } = await import("@/app/api/chat/route");

    const res = await GET();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      status: "ok",
      configured: true,
      available: true,
    });
    expect(consumeCreditsMock).not.toHaveBeenCalled();
  });
});
