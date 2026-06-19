import { describe, it, expect } from "vitest";
import { calculatePersonalTax } from "../engine/personal";
import { TaxCalculationInput } from "../engine/types";

const PERSONAL_RELIEF = [{ reliefId: "individual", amount: 9000 }];

function makeInput(overrides: Partial<TaxCalculationInput> = {}): TaxCalculationInput {
  return {
    yearOfAssessment: 2025,
    income: { employment: 0, commission: 0, rental: 0, interest: 0, dividend: 0, other: 0 },
    reliefs: PERSONAL_RELIEF,
    maritalStatus: "single",
    spouseHasIncome: false,
    zakatAmount: 0,
    monthlyPcbPaid: 0,
    ...overrides,
  };
}

function income(employment: number) {
  return { employment, commission: 0, rental: 0, interest: 0, dividend: 0, other: 0 };
}

describe("Personal Tax Engine", () => {
  describe("basic tax calculation", () => {
    it("should return zero tax for income below personal relief", () => {
      const result = calculatePersonalTax(makeInput({ income: income(5000) }));
      expect(result.grossIncome).toBe(5000);
      expect(result.chargeableIncome).toBe(0);
      expect(result.taxBeforeRebate).toBe(0);
    });

    it("should calculate tax for RM30,000 income correctly", () => {
      const result = calculatePersonalTax(makeInput({ income: income(30000) }));
      // Chargeable: 30000 - 9000 = 21000
      // 0-5000: 0%, 5000-20000: 1%=150, 20000-21000: 3%=30
      expect(result.chargeableIncome).toBe(21000);
      expect(result.taxBeforeRebate).toBe(180);
    });

    it("should calculate tax for RM80,000 income correctly (THE key test)", () => {
      const result = calculatePersonalTax(makeInput({ income: income(80000) }));
      // Chargeable: 71000
      // 0%=0, 1%=150, 3%=450, 6%=900, 11%=2200, 19% on 1000=190
      expect(result.chargeableIncome).toBe(71000);
      expect(result.taxBeforeRebate).toBe(3890);
    });

    it("should calculate tax for RM120,000 income correctly", () => {
      const result = calculatePersonalTax(makeInput({ income: income(120000) }));
      // Chargeable: 111000
      // Cumulative at 100k: 9400, 25% on 11000=2750
      expect(result.chargeableIncome).toBe(111000);
      expect(result.taxBeforeRebate).toBe(12150);
    });

    it("should handle zero income", () => {
      const result = calculatePersonalTax(makeInput({ income: income(0) }));
      expect(result.grossIncome).toBe(0);
      expect(result.chargeableIncome).toBe(0);
      expect(result.taxBeforeRebate).toBe(0);
    });
  });

  describe("rebate", () => {
    it("should apply RM400 rebate when chargeable income <= 35000", () => {
      const result = calculatePersonalTax(makeInput({ income: income(40000) }));
      // Chargeable: 31000, Tax: 0+150+330=480, Rebate: 400 => 80
      expect(result.chargeableIncome).toBe(31000);
      expect(result.rebateAmount).toBe(400);
      expect(result.taxAfterRebateAndZakat).toBe(80);
    });

    it("should apply spouse rebate for married with no-income spouse", () => {
      const result = calculatePersonalTax(makeInput({
        income: income(40000),
        maritalStatus: "married",
        spouseHasIncome: false,
      }));
      // Rebate: 800, Tax: 480 => max(0, 480-800)=0
      expect(result.rebateAmount).toBe(800);
      expect(result.taxAfterRebateAndZakat).toBe(0);
    });

    it("should NOT apply rebate when chargeable income > 35000", () => {
      const result = calculatePersonalTax(makeInput({ income: income(50000) }));
      // Chargeable: 41000 (>35000)
      expect(result.chargeableIncome).toBe(41000);
      expect(result.rebateAmount).toBe(0);
    });
  });

  describe("zakat deduction", () => {
    it("should deduct zakat from tax payable", () => {
      const result = calculatePersonalTax(makeInput({
        income: income(80000),
        zakatAmount: 1000,
      }));
      // Tax: 3890, Zakat: 1000 => 2890
      expect(result.zakatDeduction).toBe(1000);
      expect(result.taxAfterRebateAndZakat).toBe(2890);
    });

    it("should cap zakat deduction at tax payable", () => {
      const result = calculatePersonalTax(makeInput({
        income: income(15000),
        zakatAmount: 99999,
      }));
      // Chargeable: 6000, Tax: 10 (1% on 1000), Rebate: 400 => 0
      expect(result.taxAfterRebateAndZakat).toBe(0);
    });
  });

  describe("band breakdown", () => {
    it("should produce correct number of bands for RM71,000 chargeable", () => {
      const result = calculatePersonalTax(makeInput({ income: income(80000) }));
      // 6 bands: 0-5k, 5k-20k, 20k-35k, 35k-50k, 50k-70k, 70k-71k
      expect(result.bandBreakdown.length).toBe(6);
      const lastBand = result.bandBreakdown[result.bandBreakdown.length - 1];
      expect(lastBand.taxableInBand).toBe(1000);
      expect(lastBand.taxForBand).toBe(190);
    });

    it("should not skip any band even when amount is small", () => {
      // Income exactly at band boundary
      const result = calculatePersonalTax(makeInput({ income: income(14000) }));
      // Chargeable: 5000, exactly fills band 1 only
      expect(result.bandBreakdown.length).toBe(1);
      expect(result.bandBreakdown[0].taxForBand).toBe(0);
    });
  });

  describe("multiple income sources", () => {
    it("sums progressive income sources but excludes single-tier dividends", () => {
      const result = calculatePersonalTax(makeInput({
        income: { employment: 50000, commission: 10000, rental: 12000, interest: 3000, dividend: 5000, other: 0 },
      }));
      // 50000 + 10000 + 12000 + 3000 = 75000; the 5000 dividend is single-tier exempt
      expect(result.grossIncome).toBe(75000);
    });
  });

  describe("PCB balance", () => {
    it("should show negative balance (refund) when PCB > tax", () => {
      const result = calculatePersonalTax(makeInput({
        income: income(80000),
        monthlyPcbPaid: 400,
      }));
      // Tax: 3890, PCB: 4800 => -910
      expect(result.totalPcbPaid).toBe(4800);
      expect(result.balanceTaxPayable).toBe(-910);
    });

    it("should show positive balance when PCB < tax", () => {
      const result = calculatePersonalTax(makeInput({
        income: income(80000),
        monthlyPcbPaid: 200,
      }));
      // Tax: 3890, PCB: 2400 => 1490
      expect(result.balanceTaxPayable).toBe(1490);
    });
  });

  describe("no reliefs", () => {
    it("should tax full income when no reliefs claimed", () => {
      const result = calculatePersonalTax(makeInput({
        income: income(80000),
        reliefs: [],
      }));
      // Chargeable: 80000 (no deductions)
      expect(result.chargeableIncome).toBe(80000);
      // 0+150+450+900+2200+1900(19% on 10000) = 5600
      expect(result.taxBeforeRebate).toBe(5600);
    });
  });

  describe("dividend tax (YA2025+)", () => {
    const div = (dividend: number) => ({
      employment: 0, commission: 0, rental: 0, interest: 0, dividend, other: 0,
    });

    it("charges no dividend tax at or below RM100,000", () => {
      const result = calculatePersonalTax(makeInput({ income: div(100000) }));
      expect(result.dividendTax).toBe(0);
    });

    it("charges 2% on dividend income above RM100,000", () => {
      const result = calculatePersonalTax(makeInput({ income: div(150000) }));
      expect(result.dividendTax).toBe(1000); // 2% of 50000
    });

    it("does not charge dividend tax before YA2025", () => {
      const result = calculatePersonalTax(
        makeInput({ yearOfAssessment: 2024, income: div(150000) })
      );
      expect(result.dividendTax).toBe(0);
    });

    it("rebate does not offset dividend tax", () => {
      const result = calculatePersonalTax(makeInput({
        income: { employment: 40000, commission: 0, rental: 0, interest: 0, dividend: 150000, other: 0 },
        reliefs: PERSONAL_RELIEF,
      }));
      // chargeable 31000 -> income tax 480 -> rebate 400 -> 80; dividend tax 1000 separate
      expect(result.taxAfterRebateAndZakat).toBe(80);
      expect(result.dividendTax).toBe(1000);
      expect(result.balanceTaxPayable).toBe(1080);
    });
  });
});
