import { beforeEach, describe, expect, it, vi } from "vitest";

const grantCreditsMock = vi.fn();
const constructEventMock = vi.fn();
const maybeSingleMock = vi.fn();
const insertMock = vi.fn();

vi.mock("@/lib/billing/credits", () => ({
  grantCredits: grantCreditsMock,
}));

vi.mock("@/lib/stripe", () => ({
  createStripeClient: vi.fn(() => ({
    webhooks: {
      constructEvent: constructEventMock,
    },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table !== "stripe_events") {
        throw new Error(`Unexpected table ${table}`);
      }

      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: maybeSingleMock,
          })),
        })),
        insert: insertMock,
      };
    }),
  })),
}));

function webhookRequest() {
  return new Request("http://localhost/api/billing/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": "sig_test" },
    body: "{}",
  });
}

function checkoutCompletedEvent() {
  return {
    id: "evt_123",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_123",
        payment_status: "paid",
        amount_total: 900,
        currency: "myr",
        metadata: {
          user_id: "user-1",
          pack_id: "starter",
          credits: "10",
        },
      },
    },
  };
}

describe("stripe billing webhook route", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    grantCreditsMock.mockReset();
    constructEventMock.mockReset();
    maybeSingleMock.mockReset();
    insertMock.mockReset();

    constructEventMock.mockReturnValue(checkoutCompletedEvent());
    maybeSingleMock.mockResolvedValue({ data: null, error: null });
    insertMock.mockResolvedValue({ error: null });
    grantCreditsMock.mockResolvedValue({ balance: 10 });
  });

  it("grants credits and records the Stripe event", async () => {
    const { POST } = await import("@/app/api/billing/stripe/webhook/route");

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(grantCreditsMock).toHaveBeenCalledWith({
      userId: "user-1",
      amount: 10,
      stripeSessionId: "cs_123",
      stripeEventId: "evt_123",
      metadata: {
        pack_id: "starter",
        amount_total: 900,
        currency: "myr",
      },
    });
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "evt_123",
        type: "checkout.session.completed",
      })
    );
  });

  it("does not grant credits twice for an already recorded event", async () => {
    maybeSingleMock.mockResolvedValueOnce({
      data: { id: "evt_123" },
      error: null,
    });
    const { POST } = await import("@/app/api/billing/stripe/webhook/route");

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      received: true,
      duplicate: true,
    });
    expect(grantCreditsMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("fails loudly when the Stripe event cannot be recorded", async () => {
    insertMock.mockResolvedValueOnce({
      error: { message: "database unavailable" },
    });
    const { POST } = await import("@/app/api/billing/stripe/webhook/route");

    await expect(POST(webhookRequest())).rejects.toThrow(
      "database unavailable"
    );
  });
});
