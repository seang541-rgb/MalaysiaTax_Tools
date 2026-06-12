import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const consumeCreditsMock = vi.fn();

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
  InsufficientCreditsError: MockInsufficientCreditsError,
}));

describe("billing consume route", () => {
  beforeEach(() => {
    vi.resetModules();
    getUserMock.mockReset();
    consumeCreditsMock.mockReset();
  });

  it("requires authentication", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const { POST } = await import("@/app/api/billing/consume/route");

    const res = await POST(
      new Request("http://localhost/api/billing/consume", {
        method: "POST",
        body: JSON.stringify({ feature: "sst_calculation" }),
      }) as never
    );

    expect(res.status).toBe(401);
    expect(consumeCreditsMock).not.toHaveBeenCalled();
  });

  it("rejects unknown feature names", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const { POST } = await import("@/app/api/billing/consume/route");

    const res = await POST(
      new Request("http://localhost/api/billing/consume", {
        method: "POST",
        body: JSON.stringify({ feature: "personal_tax_calculation" }),
      }) as never
    );

    expect(res.status).toBe(400);
    expect(consumeCreditsMock).not.toHaveBeenCalled();
  });

  it("returns 402 when credits are insufficient", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    consumeCreditsMock.mockRejectedValue(new MockInsufficientCreditsError(1, 2));
    const { POST } = await import("@/app/api/billing/consume/route");

    const res = await POST(
      new Request("http://localhost/api/billing/consume", {
        method: "POST",
        body: JSON.stringify({ feature: "corporate_tax_calculation" }),
      }) as never
    );

    expect(res.status).toBe(402);
    await expect(res.json()).resolves.toEqual({
      error: {
        code: "INSUFFICIENT_CREDITS",
        message: "Not enough credits for this tool.",
        details: { balance: 1, requiredCredits: 2 },
      },
    });
  });

  it("consumes the configured credits for a paid feature", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    consumeCreditsMock.mockResolvedValue({ balance: 8, required: 2 });
    const { POST } = await import("@/app/api/billing/consume/route");

    const res = await POST(
      new Request("http://localhost/api/billing/consume", {
        method: "POST",
        body: JSON.stringify({
          feature: "sst_calculation",
          requestSummary: { taxableRevenue: 500000 },
        }),
      }) as never
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      balance: 8,
      chargedCredits: 2,
    });
    expect(consumeCreditsMock).toHaveBeenCalledWith({
      userId: "user-1",
      feature: "sst_calculation",
      amount: 2,
      requestSummary: { taxableRevenue: 500000 },
    });
  });
});
