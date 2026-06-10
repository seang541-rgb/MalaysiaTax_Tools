import { describe, it, expect } from "vitest";
import { calculateRpgt, RpgtInput } from "../../src/engine/rpgt";

function base(overrides: Partial<RpgtInput> = {}): RpgtInput {
  return {
    disposalPrice: 800000,
    acquisitionPrice: 500000,
    allowableExpenses: 0,
    disposerType: "citizen_pr",
    holdingYears: 2,
    ...overrides,
  };
}

describe("calculateRpgt", () => {
  it("computes chargeable gain after acquisition cost and expenses", () => {
    const r = calculateRpgt(base({ allowableExpenses: 50000 }));
    expect(r.chargeableGain).toBe(250000);
  });

  it("applies 30% within first 3 years for citizens, with 10% exemption", () => {
    const r = calculateRpgt(base({ holdingYears: 2 }));
    // gain 300k; exemption = max(10k, 30k) = 30k; net 270k × 30% = 81k
    expect(r.rate).toBe(30);
    expect(r.scheduleExemption).toBe(30000);
    expect(r.netChargeableGain).toBe(270000);
    expect(r.rpgtPayable).toBe(81000);
    expect(r.holdingBracket).toBe("within3");
  });

  it("applies 20% in the 4th year", () => {
    const r = calculateRpgt(base({ holdingYears: 3.5 }));
    expect(r.rate).toBe(20);
    expect(r.holdingBracket).toBe("year4");
  });

  it("applies 15% in the 5th year", () => {
    const r = calculateRpgt(base({ holdingYears: 4.5 }));
    expect(r.rate).toBe(15);
    expect(r.holdingBracket).toBe("year5");
  });

  it("citizens pay 0% from the 6th year onwards", () => {
    const r = calculateRpgt(base({ holdingYears: 7 }));
    expect(r.rate).toBe(0);
    expect(r.rpgtPayable).toBe(0);
    expect(r.holdingBracket).toBe("year6plus");
  });

  it("companies pay 10% from the 6th year (no individual exemption)", () => {
    const r = calculateRpgt(
      base({ disposerType: "company", holdingYears: 7 })
    );
    expect(r.rate).toBe(10);
    expect(r.scheduleExemption).toBe(0);
    expect(r.netChargeableGain).toBe(300000);
    expect(r.rpgtPayable).toBe(30000);
  });

  it("foreigners pay 30% within 5 years and 10% from the 6th", () => {
    const within = calculateRpgt(
      base({ disposerType: "foreigner", holdingYears: 4 })
    );
    expect(within.rate).toBe(30);
    expect(within.holdingBracket).toBe("within5");
    // foreigner is an individual → schedule exemption applies
    expect(within.scheduleExemption).toBe(30000);

    const after = calculateRpgt(
      base({ disposerType: "foreigner", holdingYears: 6 })
    );
    expect(after.rate).toBe(10);
    expect(after.holdingBracket).toBe("year6plus");
  });

  it("uses 10% exemption when 10% of gain exceeds RM10,000", () => {
    const r = calculateRpgt(
      base({ disposalPrice: 1000000, acquisitionPrice: 500000 })
    );
    // gain 500k; exemption = max(10k, 50k) = 50k
    expect(r.scheduleExemption).toBe(50000);
  });

  it("uses RM10,000 floor when 10% of gain is smaller", () => {
    const r = calculateRpgt(
      base({ disposalPrice: 560000, acquisitionPrice: 500000 })
    );
    // gain 60k; 10% = 6k < 10k → exemption 10k
    expect(r.scheduleExemption).toBe(10000);
    expect(r.netChargeableGain).toBe(50000);
  });

  it("once-in-a-lifetime exemption zeroes the tax for individuals", () => {
    const r = calculateRpgt(
      base({ holdingYears: 1, onceInLifetimeExemption: true })
    );
    expect(r.onceInLifetimeApplied).toBe(true);
    expect(r.netChargeableGain).toBe(0);
    expect(r.rpgtPayable).toBe(0);
  });

  it("once-in-a-lifetime exemption does not apply to companies", () => {
    const r = calculateRpgt(
      base({ disposerType: "company", onceInLifetimeExemption: true })
    );
    expect(r.onceInLifetimeApplied).toBe(false);
    expect(r.rpgtPayable).toBeGreaterThan(0);
  });

  it("returns zero tax when there is no gain (loss on disposal)", () => {
    const r = calculateRpgt(
      base({ disposalPrice: 400000, acquisitionPrice: 500000 })
    );
    expect(r.chargeableGain).toBe(0);
    expect(r.rpgtPayable).toBe(0);
  });
});
