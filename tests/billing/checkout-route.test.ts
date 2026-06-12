import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      getUser: getUserMock,
    },
  })),
}));

describe("billing checkout route", () => {
  beforeEach(() => {
    vi.resetModules();
    getUserMock.mockReset();
    delete process.env.STRIPE_PRICE_STARTER;
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
});
