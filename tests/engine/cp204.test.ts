import { describe, it, expect } from "vitest";
import { calculateCp204 } from "@/engine/cp204";

describe("calculateCp204", () => {
  it("splits estimate into equal monthly installments starting month 2", () => {
    const result = calculateCp204({ estimatedTax: 120000 });
    expect(result.installmentCount).toBe(12);
    expect(result.monthlyAmount).toBe(10000);
    expect(result.finalAmount).toBe(10000);
    expect(result.installments[0].monthOfBasisPeriod).toBe(2);
    expect(result.installments[11].monthOfBasisPeriod).toBe(13);
  });

  it("adjusts final installment for rounding", () => {
    const result = calculateCp204({ estimatedTax: 100000 });
    // 100000 / 12 = 8333.33 floor
    expect(result.monthlyAmount).toBe(8333.33);
    expect(result.finalAmount).toBe(8333.37);
    const total = result.installments.reduce((s, i) => s + i.amount, 0);
    expect(Math.round(total * 100) / 100).toBe(100000);
  });

  it("checks the 85% minimum rule against prior year estimate", () => {
    const pass = calculateCp204({
      estimatedTax: 90000,
      priorYearEstimate: 100000,
    });
    expect(pass.minimumRequired).toBe(85000);
    expect(pass.meetsMinimum).toBe(true);

    const fail = calculateCp204({
      estimatedTax: 80000,
      priorYearEstimate: 100000,
    });
    expect(fail.meetsMinimum).toBe(false);
  });

  it("returns null minimum when no prior estimate given", () => {
    const result = calculateCp204({ estimatedTax: 50000 });
    expect(result.minimumRequired).toBeNull();
    expect(result.meetsMinimum).toBeNull();
  });

  it("calculates underestimation penalty (LHDN example)", () => {
    // Estimate 100k, actual 200k: buffer = 60k, excess = 40k, penalty = 4k
    const result = calculateCp204({
      estimatedTax: 100000,
      actualTax: 200000,
    });
    expect(result.penalty).not.toBeNull();
    expect(result.penalty!.buffer).toBe(60000);
    expect(result.penalty!.excessOverBuffer).toBe(40000);
    expect(result.penalty!.penaltyAmount).toBe(4000);
  });

  it("no penalty when actual within 30% buffer", () => {
    // Estimate 100k, actual 120k: difference 20k < buffer 36k → no penalty
    const result = calculateCp204({
      estimatedTax: 100000,
      actualTax: 120000,
    });
    expect(result.penalty!.excessOverBuffer).toBe(0);
    expect(result.penalty!.penaltyAmount).toBe(0);
  });

  it("no penalty when actual below estimate", () => {
    const result = calculateCp204({
      estimatedTax: 100000,
      actualTax: 80000,
    });
    expect(result.penalty!.difference).toBe(0);
    expect(result.penalty!.penaltyAmount).toBe(0);
  });

  it("supports non-12-month basis periods", () => {
    const result = calculateCp204({ estimatedTax: 60000, basisPeriodMonths: 6 });
    expect(result.installmentCount).toBe(6);
    expect(result.monthlyAmount).toBe(10000);
  });

  it("includes revision months 6, 9 and 11", () => {
    const result = calculateCp204({ estimatedTax: 10000 });
    expect(result.revisionMonths).toEqual([6, 9, 11]);
  });
});
