import { describe, it, expect } from "vitest";
import { calculateCorporateTax } from "@/engine/corporate";
import { CorporateTaxInput } from "@/engine/types";

function makeInput(overrides: Partial<CorporateTaxInput> = {}): CorporateTaxInput {
  return {
    yearOfAssessment: 2025,
    chargeableIncome: 0,
    isSme: false,
    paidUpCapital: 1000000,
    annualRevenue: 10000000,
    ...overrides,
  };
}

describe("calculateCorporateTax", () => {
  it("returns zero tax for zero income", () => {
    const result = calculateCorporateTax(makeInput());
    expect(result.totalTax).toBe(0);
    expect(result.effectiveRate).toBe(0);
  });

  it("applies flat 24% for non-SME", () => {
    const result = calculateCorporateTax(
      makeInput({ chargeableIncome: 1000000, isSme: false })
    );
    expect(result.isSmeQualified).toBe(false);
    expect(result.totalTax).toBe(240000);
    expect(result.effectiveRate).toBe(24);
  });

  it("applies SME preferential rates when qualified", () => {
    const result = calculateCorporateTax(
      makeInput({
        chargeableIncome: 1000000,
        isSme: true,
        paidUpCapital: 2000000,
        annualRevenue: 30000000,
      })
    );
    expect(result.isSmeQualified).toBe(true);
    // First 150k at 15% = 22,500
    // Next 450k at 17% = 76,500
    // Remaining 400k at 24% = 96,000
    expect(result.totalTax).toBe(22500 + 76500 + 96000);
    expect(result.bandBreakdown).toHaveLength(3);
  });

  it("SME tier 1 only (income <= RM150k)", () => {
    const result = calculateCorporateTax(
      makeInput({
        chargeableIncome: 100000,
        isSme: true,
        paidUpCapital: 500000,
        annualRevenue: 5000000,
      })
    );
    expect(result.totalTax).toBe(15000); // 100k * 15%
    expect(result.effectiveRate).toBe(15);
  });

  it("SME tier 1+2 (income between 150k-600k)", () => {
    const result = calculateCorporateTax(
      makeInput({
        chargeableIncome: 400000,
        isSme: true,
        paidUpCapital: 1000000,
        annualRevenue: 20000000,
      })
    );
    // 150k * 15% = 22,500 + 250k * 17% = 42,500
    expect(result.totalTax).toBe(22500 + 42500);
    expect(result.bandBreakdown).toHaveLength(2);
  });

  it("rejects SME if paid-up capital > RM2.5M", () => {
    const result = calculateCorporateTax(
      makeInput({
        chargeableIncome: 500000,
        isSme: true,
        paidUpCapital: 3000000,
        annualRevenue: 20000000,
      })
    );
    expect(result.isSmeQualified).toBe(false);
    expect(result.totalTax).toBe(120000); // 500k * 24%
  });

  it("rejects SME if revenue >= RM50M", () => {
    const result = calculateCorporateTax(
      makeInput({
        chargeableIncome: 500000,
        isSme: true,
        paidUpCapital: 1000000,
        annualRevenue: 50000000,
      })
    );
    expect(result.isSmeQualified).toBe(false);
    expect(result.totalTax).toBe(120000);
  });

  it("calculates correct effective rate for SME", () => {
    const result = calculateCorporateTax(
      makeInput({
        chargeableIncome: 600000,
        isSme: true,
        paidUpCapital: 1000000,
        annualRevenue: 10000000,
      })
    );
    // 150k*15% + 450k*17% = 22,500 + 76,500 = 99,000
    expect(result.totalTax).toBe(99000);
    expect(result.effectiveRate).toBe(16.5);
  });
});
