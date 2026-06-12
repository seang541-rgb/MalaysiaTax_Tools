import { describe, expect, it } from "vitest";
import {
  BILLING_FEATURE_COSTS,
  BILLING_PACKS,
  getBillingPack,
  getStripePriceEnvName,
} from "@/lib/billing/plans";

describe("billing plans", () => {
  it("defines the approved credit packs", () => {
    expect(BILLING_PACKS).toEqual([
      {
        id: "starter",
        name: "Starter",
        priceMyr: 9,
        credits: 10,
        stripePriceEnv: "STRIPE_PRICE_STARTER",
      },
      {
        id: "pro",
        name: "Pro",
        priceMyr: 29,
        credits: 40,
        stripePriceEnv: "STRIPE_PRICE_PRO",
      },
      {
        id: "business",
        name: "Business",
        priceMyr: 79,
        credits: 120,
        stripePriceEnv: "STRIPE_PRICE_BUSINESS",
      },
    ]);
  });

  it("looks up packs by id", () => {
    expect(getBillingPack("pro")?.credits).toBe(40);
    expect(getBillingPack("unknown")).toBeNull();
  });

  it("maps pack ids to Stripe price env var names", () => {
    expect(getStripePriceEnvName("business")).toBe("STRIPE_PRICE_BUSINESS");
    expect(getStripePriceEnvName("missing")).toBeNull();
  });

  it("keeps all paid feature costs as positive integers", () => {
    for (const [feature, cost] of Object.entries(BILLING_FEATURE_COSTS)) {
      expect(feature.length).toBeGreaterThan(0);
      expect(Number.isInteger(cost)).toBe(true);
      expect(cost).toBeGreaterThan(0);
    }
  });

  it("charges AI Tax one credit", () => {
    expect(BILLING_FEATURE_COSTS.ai_tax_question).toBe(1);
  });

  it("uses the approved per-use credit charges", () => {
    expect(BILLING_FEATURE_COSTS.ai_tax_question).toBe(1);
    expect(BILLING_FEATURE_COSTS.corporate_tax_calculation).toBe(2);
    expect(BILLING_FEATURE_COSTS.sst_calculation).toBe(2);
    expect(BILLING_FEATURE_COSTS.employer_obligations_calculation).toBe(2);
    expect(BILLING_FEATURE_COSTS.property_calculation).toBe(2);
    expect(BILLING_FEATURE_COSTS.einvoice_check).toBe(2);
    expect(BILLING_FEATURE_COSTS.corporate_tools_run).toBe(2);
    expect(BILLING_FEATURE_COSTS.batch_pcb_run).toBe(5);
  });
});
