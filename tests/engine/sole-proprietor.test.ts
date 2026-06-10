import { describe, it, expect } from "vitest";
import {
  calculateSoleProprietorTax,
  SoleProprietorInput,
} from "../../src/engine/sole-proprietor";

function base(overrides: Partial<SoleProprietorInput> = {}): SoleProprietorInput {
  return {
    yearOfAssessment: 2025,
    businessRevenue: 0,
    businessExpenses: 0,
    capitalAllowance: 0,
    otherIncome: 0,
    totalReliefs: 9000,
    maritalStatus: "single",
    spouseHasIncome: false,
    zakatAmount: 0,
    ...overrides,
  };
}

describe("calculateSoleProprietorTax", () => {
  it("computes adjusted business income after expenses and capital allowance", () => {
    const r = calculateSoleProprietorTax(
      base({ businessRevenue: 200000, businessExpenses: 80000, capitalAllowance: 20000 })
    );
    expect(r.adjustedBusinessIncome).toBe(100000);
    expect(r.businessLoss).toBe(0);
  });

  it("taxes business income at individual rates (RM91k chargeable)", () => {
    const r = calculateSoleProprietorTax(
      base({ businessRevenue: 200000, businessExpenses: 80000, capitalAllowance: 20000 })
    );
    // chargeable 100000 - 9000 = 91000
    expect(r.chargeableIncome).toBe(91000);
    // 150 + 450 + 900 + 2200 + 3990 = 7690
    expect(r.taxBeforeRebate).toBe(7690);
    expect(r.rebateAmount).toBe(0);
    expect(r.taxPayable).toBe(7690);
  });

  it("records a business loss when expenses exceed revenue", () => {
    const r = calculateSoleProprietorTax(
      base({ businessRevenue: 50000, businessExpenses: 60000, capitalAllowance: 10000, otherIncome: 30000 })
    );
    expect(r.adjustedBusinessIncome).toBe(0);
    expect(r.businessLoss).toBe(20000);
    // total income only from other income 30000
    expect(r.totalIncome).toBe(30000);
  });

  it("applies the RM400 rebate when chargeable income ≤ RM35,000", () => {
    const r = calculateSoleProprietorTax(
      base({ businessRevenue: 50000, businessExpenses: 60000, capitalAllowance: 10000, otherIncome: 30000 })
    );
    // CI 21000; tax = 150 + 30 = 180; rebate 400 → 0
    expect(r.chargeableIncome).toBe(21000);
    expect(r.taxBeforeRebate).toBe(180);
    expect(r.rebateAmount).toBe(400);
    expect(r.taxPayable).toBe(0);
  });

  it("doubles the rebate for a married sole proprietor with no spouse income", () => {
    const r = calculateSoleProprietorTax(
      base({ businessRevenue: 40000, totalReliefs: 9000, maritalStatus: "married", spouseHasIncome: false })
    );
    // CI 31000 ≤ 35000 → rebate 800
    expect(r.rebateAmount).toBe(800);
  });

  it("adds other personal income to business income", () => {
    const r = calculateSoleProprietorTax(
      base({ businessRevenue: 100000, businessExpenses: 40000, otherIncome: 24000 })
    );
    expect(r.adjustedBusinessIncome).toBe(60000);
    expect(r.totalIncome).toBe(84000);
  });

  it("deducts zakat as a rebate against tax", () => {
    const r = calculateSoleProprietorTax(
      base({ businessRevenue: 200000, businessExpenses: 80000, capitalAllowance: 20000, zakatAmount: 2000 })
    );
    // tax 7690 − zakat 2000 = 5690
    expect(r.zakatDeduction).toBe(2000);
    expect(r.taxPayable).toBe(5690);
  });

  it("computes an effective rate over total income", () => {
    const r = calculateSoleProprietorTax(
      base({ businessRevenue: 200000, businessExpenses: 80000, capitalAllowance: 20000 })
    );
    // 7690 / 100000 = 7.69%
    expect(r.effectiveRate).toBe(7.69);
  });

  it("produces zero tax for income fully covered by reliefs", () => {
    const r = calculateSoleProprietorTax(
      base({ businessRevenue: 15000, businessExpenses: 5000, totalReliefs: 12000 })
    );
    expect(r.chargeableIncome).toBe(0);
    expect(r.taxPayable).toBe(0);
  });
});
