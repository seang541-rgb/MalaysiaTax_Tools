import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const consumeCreditsMock = vi.fn();
const embedMock = vi.fn();
const chatStreamMock = vi.fn();

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
  refundCredits: vi.fn(),
  InsufficientCreditsError: MockInsufficientCreditsError,
}));

vi.mock("@/lib/llm", () => ({
  embed: embedMock,
  chatStream: chatStreamMock,
  llmConfigured: vi.fn(() => true),
  llmInfo: { CHAT_MODEL: "test-model" },
}));

describe("AI chat billing gate", () => {
  beforeEach(() => {
    vi.resetModules();
    getUserMock.mockReset();
    consumeCreditsMock.mockReset();
    embedMock.mockReset();
    chatStreamMock.mockReset();
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
});
