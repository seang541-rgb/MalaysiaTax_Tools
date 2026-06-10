import { describe, it, expect } from "vitest";
import { calculateStampDuty, StampDutyInput } from "../../src/engine/stamp-duty";

function base(overrides: Partial<StampDutyInput> = {}): StampDutyInput {
  return {
    propertyPrice: 500000,
    buyerType: "citizen_pr",
    loanAmount: 0,
    ...overrides,
  };
}

describe("calculateStampDuty", () => {
  it("computes tiered MOT for a RM500k property", () => {
    const r = calculateStampDuty(base({ propertyPrice: 500000 }));
    // 1% × 100k + 2% × 400k = 1,000 + 8,000 = 9,000
    expect(r.motDuty).toBe(9000);
    expect(r.motTiers).toHaveLength(2);
  });

  it("computes tiered MOT for a RM1.5M property across all four tiers", () => {
    const r = calculateStampDuty(base({ propertyPrice: 1500000 }));
    // 1k + 8k + 15k (3%×500k) + 20k (4%×500k) = 44,000
    expect(r.motDuty).toBe(44000);
    expect(r.motTiers).toHaveLength(4);
  });

  it("adds 0.5% loan agreement stamp duty", () => {
    const r = calculateStampDuty(base({ propertyPrice: 500000, loanAmount: 450000 }));
    expect(r.loanDuty).toBe(2250);
    expect(r.totalDuty).toBe(11250);
  });

  it("applies flat 4% for foreign buyers", () => {
    const r = calculateStampDuty(base({ propertyPrice: 500000, buyerType: "foreigner" }));
    expect(r.foreignerFlatRate).toBe(true);
    expect(r.motDuty).toBe(20000);
    expect(r.motTiers).toHaveLength(1);
  });

  it("grants full exemption to first-time buyers of property ≤ RM500k", () => {
    const r = calculateStampDuty(
      base({ propertyPrice: 450000, loanAmount: 400000, firstTimeBuyer: true })
    );
    expect(r.firstTimeExemptionApplied).toBe(true);
    expect(r.motDuty).toBe(0);
    expect(r.loanDuty).toBe(0);
    expect(r.totalDuty).toBe(0);
    // pre-exemption figures still surfaced for transparency
    expect(r.motDutyBeforeExemption).toBe(8000);
  });

  it("does not grant first-time exemption above RM500k", () => {
    const r = calculateStampDuty(
      base({ propertyPrice: 600000, firstTimeBuyer: true })
    );
    expect(r.firstTimeExemptionApplied).toBe(false);
    expect(r.motDuty).toBeGreaterThan(0);
  });

  it("does not grant first-time exemption to foreign buyers", () => {
    const r = calculateStampDuty(
      base({ propertyPrice: 400000, buyerType: "foreigner", firstTimeBuyer: true })
    );
    expect(r.firstTimeExemptionApplied).toBe(false);
    expect(r.motDuty).toBe(16000);
  });

  it("handles a cash purchase (no loan)", () => {
    const r = calculateStampDuty(base({ propertyPrice: 300000, loanAmount: 0 }));
    expect(r.loanDuty).toBe(0);
    // 1k + 2%×200k = 1k + 4k = 5k
    expect(r.motDuty).toBe(5000);
    expect(r.totalDuty).toBe(5000);
  });
});
