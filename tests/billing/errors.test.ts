import { describe, expect, it } from "vitest";
import { billingErrorResponse } from "@/lib/billing/errors";

describe("billing error responses", () => {
  it("serializes auth errors with a stable code", async () => {
    const res = billingErrorResponse("AUTH_REQUIRED", 401, "Please sign in.");

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      error: {
        code: "AUTH_REQUIRED",
        message: "Please sign in.",
      },
    });
  });

  it("includes optional details", async () => {
    const res = billingErrorResponse(
      "INSUFFICIENT_CREDITS",
      402,
      "Not enough credits.",
      { requiredCredits: 1, balance: 0 }
    );

    await expect(res.json()).resolves.toEqual({
      error: {
        code: "INSUFFICIENT_CREDITS",
        message: "Not enough credits.",
        details: { requiredCredits: 1, balance: 0 },
      },
    });
  });
});
