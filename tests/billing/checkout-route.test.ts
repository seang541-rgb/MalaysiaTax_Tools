import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const upsertMock = vi.fn();
const maybeSingleMock = vi.fn();
const sessionsCreateMock = vi.fn();
const customersCreateMock = vi.fn();
const customersRetrieveMock = vi.fn();

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
      retrieve: customersRetrieveMock,
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
    customersRetrieveMock.mockReset();
    delete process.env.STRIPE_PRICE_STARTER;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.NEXT_PUBLIC_APP_URL;

    maybeSingleMock.mockResolvedValue({ data: null, error: null });
    upsertMock.mockResolvedValue({ error: null });
    customersCreateMock.mockResolvedValue({ id: "cus_123" });
    customersRetrieveMock.mockResolvedValue({ id: "cus_123" });
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

  it("keeps the Stripe checkout session placeholder unencoded", async () => {
    process.env.STRIPE_PRICE_STARTER = "price_starter";
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

    expect(res.status).toBe(200);
    expect(sessionsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: expect.stringContaining(
          "session_id={CHECKOUT_SESSION_ID}"
        ),
      })
    );
  });

  it("reuses an existing Stripe customer when it exists in the active mode", async () => {
    process.env.STRIPE_PRICE_STARTER = "price_starter";
    maybeSingleMock.mockResolvedValue({
      data: {
        stripe_customer_id: "cus_existing",
        email: "user@example.com",
      },
      error: null,
    });
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

    expect(res.status).toBe(200);
    expect(customersRetrieveMock).toHaveBeenCalledWith("cus_existing");
    expect(customersCreateMock).not.toHaveBeenCalled();
    expect(upsertMock).not.toHaveBeenCalled();
    expect(sessionsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_existing" })
    );
  });

  it("creates a temporary test customer when the stored customer belongs to live mode", async () => {
    process.env.STRIPE_PRICE_STARTER = "price_starter";
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    maybeSingleMock.mockResolvedValue({
      data: {
        stripe_customer_id: "cus_live_existing",
        email: "user@example.com",
      },
      error: null,
    });
    customersRetrieveMock.mockRejectedValue({
      type: "StripeInvalidRequestError",
      code: "resource_missing",
    });
    customersCreateMock.mockResolvedValue({ id: "cus_test_new" });
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

    expect(res.status).toBe(200);
    expect(customersCreateMock).toHaveBeenCalledWith({
      email: "user@example.com",
      metadata: { user_id: "user-1" },
    });
    expect(upsertMock).not.toHaveBeenCalled();
    expect(sessionsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_test_new" })
    );
  });
});
