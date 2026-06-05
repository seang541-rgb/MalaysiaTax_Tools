import { describe, it, expect } from "vitest";
import { TAX_RATES_YA2025 } from "@/engine/tax-rates";
import { TAX_RELIEFS_YA2025 } from "@/engine/tax-reliefs";
import { calculatePersonalTax } from "@/engine/personal";
import { TaxCalculationInput } from "@/engine/types";

describe("Tax rate data integrity", () => {
  it("has 10 progressive bands", () => {
    expect(TAX_RATES_YA2025).toHaveLength(10);
  });

  it("bands are contiguous with no gaps", () => {
    for (let i = 1; i < TAX_RATES_YA2025.length; i++) {
      expect(TAX_RATES_YA2025[i].min).toBe(TAX_RATES_YA2025[i - 1].max);
    }
  });

  it("starts at 0 and ends at Infinity", () => {
    expect(TAX_RATES_YA2025[0].min).toBe(0);
    expect(TAX_RATES_YA2025[TAX_RATES_YA2025.length - 1].max).toBe(Infinity);
  });

  it("rates are non-decreasing", () => {
    for (let i = 1; i < TAX_RATES_YA2025.length; i++) {
      expect(TAX_RATES_YA2025[i].rate).toBeGreaterThanOrEqual(
        TAX_RATES_YA2025[i - 1].rate
      );
    }
  });
});

describe("Relief data integrity", () => {
  it("all reliefs have unique ids", () => {
    const ids = TAX_RELIEFS_YA2025.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all reliefs have positive maxAmount", () => {
    for (const relief of TAX_RELIEFS_YA2025) {
      expect(relief.maxAmount).toBeGreaterThan(0);
    }
  });
});

function makeInput(overrides: Partial<TaxCalculationInput> = {}): TaxCalculationInput {
  return {
    yearOfAssessment: 2025,
    income: {
      employment: 0,
      commission: 0,
      rental: 0,
      interest: 0,
      dividend: 0,
      other: 0,
    },
    reliefs: [],
    maritalStatus: "single",
    spouseHasIncome: false,
    zakatAmount: 0,
    monthlyPcbPaid: 0,
    ...overrides,
  };
}

describe("calculatePersonalTax", () => {
  it("returns zero tax for zero income", () => {
    const result = calculatePersonalTax(makeInput());
    expect(result.grossIncome).toBe(0);
    expect(result.taxAfterRebateAndZakat).toBe(0);
  });

  it("calculates correct tax for RM48,000 employment income (single, individual relief only)", () => {
    const input = makeInput({
      income: { employment: 48000, commission: 0, rental: 0, interest: 0, dividend: 0, other: 0 },
      reliefs: [{ reliefId: "individual", amount: 9000 }],
    });
    const result = calculatePersonalTax(input);
    expect(result.grossIncome).toBe(48000);
    expect(result.totalReliefs).toBe(9000);
    expect(result.chargeableIncome).toBe(39000);
    // First 5000 = 0, next 15000 = 150, next 15000 = 450, next 4000 = 240
    expect(result.taxBeforeRebate).toBe(840);
  });

  it("calculates correct tax for RM100,000 employment income", () => {
    const input = makeInput({
      income: { employment: 100000, commission: 0, rental: 0, interest: 0, dividend: 0, other: 0 },
      reliefs: [{ reliefId: "individual", amount: 9000 }],
    });
    const result = calculatePersonalTax(input);
    expect(result.chargeableIncome).toBe(91000);
    // First 5000=0, 15000=150, 15000=450, 15000=900, 20000=2200, 21000=3990
    expect(result.taxBeforeRebate).toBe(7690);
  });

  it("applies RM400 rebate when chargeable income <= RM35,000", () => {
    const input = makeInput({
      income: { employment: 40000, commission: 0, rental: 0, interest: 0, dividend: 0, other: 0 },
      reliefs: [{ reliefId: "individual", amount: 9000 }],
    });
    const result = calculatePersonalTax(input);
    expect(result.chargeableIncome).toBe(31000);
    // First 5000=0, 15000=150, 11000=330 => total 480
    expect(result.taxBeforeRebate).toBe(480);
    expect(result.rebateAmount).toBe(400);
    expect(result.taxAfterRebateAndZakat).toBe(80);
  });

  it("does not apply rebate when chargeable income > RM35,000", () => {
    const input = makeInput({
      income: { employment: 60000, commission: 0, rental: 0, interest: 0, dividend: 0, other: 0 },
      reliefs: [{ reliefId: "individual", amount: 9000 }],
    });
    const result = calculatePersonalTax(input);
    expect(result.chargeableIncome).toBe(51000);
    expect(result.rebateAmount).toBe(0);
  });

  it("deducts zakat from tax", () => {
    const input = makeInput({
      income: { employment: 100000, commission: 0, rental: 0, interest: 0, dividend: 0, other: 0 },
      reliefs: [{ reliefId: "individual", amount: 9000 }],
      zakatAmount: 1000,
    });
    const result = calculatePersonalTax(input);
    expect(result.zakatDeduction).toBe(1000);
    expect(result.taxAfterRebateAndZakat).toBe(result.taxBeforeRebate - 1000);
  });

  it("zakat deduction cannot exceed tax payable", () => {
    const input = makeInput({
      income: { employment: 40000, commission: 0, rental: 0, interest: 0, dividend: 0, other: 0 },
      reliefs: [{ reliefId: "individual", amount: 9000 }],
      zakatAmount: 9999,
    });
    const result = calculatePersonalTax(input);
    expect(result.taxAfterRebateAndZakat).toBe(0);
  });

  it("caps relief claims at maxAmount", () => {
    const input = makeInput({
      income: { employment: 100000, commission: 0, rental: 0, interest: 0, dividend: 0, other: 0 },
      reliefs: [{ reliefId: "individual", amount: 99999 }],
    });
    const result = calculatePersonalTax(input);
    expect(result.totalReliefs).toBe(9000);
  });

  it("calculates balance with PCB paid", () => {
    const input = makeInput({
      income: { employment: 100000, commission: 0, rental: 0, interest: 0, dividend: 0, other: 0 },
      reliefs: [{ reliefId: "individual", amount: 9000 }],
      monthlyPcbPaid: 500,
    });
    const result = calculatePersonalTax(input);
    expect(result.totalPcbPaid).toBe(6000);
    expect(result.balanceTaxPayable).toBe(result.taxAfterRebateAndZakat - 6000);
  });

  it("sums multiple income sources", () => {
    const input = makeInput({
      income: { employment: 50000, commission: 10000, rental: 5000, interest: 0, dividend: 0, other: 0 },
      reliefs: [{ reliefId: "individual", amount: 9000 }],
    });
    const result = calculatePersonalTax(input);
    expect(result.grossIncome).toBe(65000);
  });
});
