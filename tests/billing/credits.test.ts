import { describe, expect, it, vi } from "vitest";
import {
  consumeCreditsWithClient,
  getBalanceWithClient,
  refundCreditsWithClient,
} from "@/lib/billing/credits";

describe("billing credit helpers", () => {
  it("reads a missing balance as zero", async () => {
    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      })),
    };

    await expect(getBalanceWithClient(client, "user-1")).resolves.toBe(0);
  });

  it("returns the current balance", async () => {
    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { balance: 12 },
              error: null,
            }),
          })),
        })),
      })),
    };

    await expect(getBalanceWithClient(client, "user-1")).resolves.toBe(12);
  });

  it("throws insufficient credits when RPC reports blocked usage", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: [{ success: false, balance: 0, required: 1 }],
        error: null,
      }),
    };

    await expect(
      consumeCreditsWithClient(client, {
        userId: "user-1",
        feature: "ai_tax_question",
        amount: 1,
        requestSummary: { source: "test" },
      })
    ).rejects.toMatchObject({
      code: "INSUFFICIENT_CREDITS",
      balance: 0,
      required: 1,
    });
  });

  it("returns new balance when usage succeeds", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: [{ success: true, balance: 4, required: 1 }],
        error: null,
      }),
    };

    await expect(
      consumeCreditsWithClient(client, {
        userId: "user-1",
        feature: "ai_tax_question",
        amount: 1,
        requestSummary: {},
      })
    ).resolves.toEqual({ balance: 4, required: 1 });
  });

  it("refunds credits through RPC", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: 6, error: null }),
    };

    await expect(
      refundCreditsWithClient(client, {
        userId: "user-1",
        feature: "ai_tax_question",
        amount: 1,
        errorCode: "PROVIDER_FAILED_REFUNDED",
        metadata: { reason: "provider" },
      })
    ).resolves.toBe(6);
  });
});
