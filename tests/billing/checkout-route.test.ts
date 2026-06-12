import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const upsertMock = vi.fn();
const maybeSingleMock = vi.fn();
const sessionsCreateMock = vi.fn();
const customersCreateMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      getUser: getUserMock,
    },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: maybeSingleMock,
            })),
          })),
          upsert: upsertMock,
        };
      }

      throw new Error(`Unexpected table ${table}`);
    }),
  })),
}));

vi.mock("@/lib/stripe", () => ({
  createStripeClient: vi.fn(() => ({
    checkout: {
      sessions: {
        create: sessionsCreateMock,
      },
    },
    customers: {
      create: customersCreateMock,
    },
  })),
}));

describe("billing checkout route", () => {
  beforeEach(() => {
    vi.resetModules();
    getUserMock.mockReset();
    upsertMock.mockReset();
    maybeSingleMock.mockReset();
    sessionsCreateMock.mockReset();
    customersCreateMock.mockReset();
    delete process.env.STRIPE_PRICE_STARTER;
    delete process.env.NEXT_PUBLIC_APP_URL;

    maybeSingleMock.mockResolvedValue({ data: null, error: null });
    upsertMock.mockResolvedValue({ error: null });
    customersCreateMock.mockResolvedValue({ id: "cus_123" });
    sessionsCreateMock.mockResolvedValue({
      url: "https://checkout.stripe.com/c/pay/cs_test_123",
    });
  });

  it("requires authentication", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const { POST } = await import("@/app/api/billing/checkout/route");

    const res = await POST(
      new Request("http://localhost/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ packId: "starter", locale: "en" }),
      })
    );

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      error: {
        code: "AUTH_REQUIRED",
        message: "Please sign in to buy credits.",
      },
    });
  });

  it("rejects unknown packs", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "user@example.com" } },
    });
    const { POST } = await import("@/app/api/billing/checkout/route");

    const res = await POST(
      new Request("http://localhost/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ packId: "missing", locale: "en" }),
      })
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: {
        code: "INVALID_PACK",
        message: "Unknown credit pack.",
      },
    });
  });

  it("rejects malformed checkout requests", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "user@example.com" } },
    });
    const { POST } = await import("@/app/api/billing/checkout/route");

    const res = await POST(
      new Request("http://localhost/api/billing/checkout", {
        method: "POST",
        body: "{bad json",
      })
    );

    expect(res.status).toBe(400);
    expect(sessionsCreateMock).not.toHaveBeenCalled();
  });

  it("rejects configured packs without Stripe price env vars", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "user@example.com" } },
    });
    const { POST } = await import("@/app/api/billing/checkout/route");

    const res = await POST(
      new Request("http://localhost/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ packId: "starter", locale: "en" }),
      })
    );

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({
      error: {
        code: "CHECKOUT_UNAVAILABLE",
        message: "This credit pack is not configured yet.",
      },
    });
  });

  it("falls back to a safe locale when creating checkout URLs", async () => {
    process.env.STRIPE_PRICE_STARTER = "price_starter";
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "user@example.com" } },
    });
    const { POST } = await import("@/app/api/billing/checkout/route");

    const res = await POST(
      new Request("http://localhost/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({
          packId: "starter",
          locale: "https://evil.example",
        }),
      })
    );

    expect(res.status).toBe(200);
    expect(sessionsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: expect.stringContaining("/en/billing/success"),
        cancel_url: expect.stringContaining("/en/pricing"),
      })
    );
  });
});
