import { describe, it, expect } from "vitest";
import { estimateMonthlyPcb } from "@/engine/pcb";

describe("estimateMonthlyPcb", () => {
  it("returns zero PCB for income below tax threshold", () => {
    const result = estimateMonthlyPcb({
      yearOfAssessment: 2025,
      monthlyGrossSalary: 2000,
      maritalStatus: "single",
      spouseHasIncome: false,
      numberOfChildren: 0,
    });
    expect(result.monthlyPcb).toBe(0);
    expect(result.annualTax).toBe(0);
  });

  it("estimates non-zero PCB for RM5,000/month salary", () => {
    const result = estimateMonthlyPcb({
      yearOfAssessment: 2025,
      monthlyGrossSalary: 5000,
      maritalStatus: "single",
      spouseHasIncome: false,
      numberOfChildren: 0,
    });
    expect(result.monthlyPcb).toBeGreaterThan(0);
    expect(result.annualPcb).toBe(result.monthlyPcb * 12);
  });

  it("married with non-working spouse pays less than single", () => {
    const single = estimateMonthlyPcb({
      yearOfAssessment: 2025,
      monthlyGrossSalary: 8000,
      maritalStatus: "single",
      spouseHasIncome: false,
      numberOfChildren: 0,
    });
    const married = estimateMonthlyPcb({
      yearOfAssessment: 2025,
      monthlyGrossSalary: 8000,
      maritalStatus: "married",
      spouseHasIncome: false,
      numberOfChildren: 0,
    });
    expect(married.monthlyPcb).toBeLessThan(single.monthlyPcb);
  });

  it("more children reduces PCB", () => {
    const noKids = estimateMonthlyPcb({
      yearOfAssessment: 2025,
      monthlyGrossSalary: 8000,
      maritalStatus: "married",
      spouseHasIncome: false,
      numberOfChildren: 0,
    });
    const twoKids = estimateMonthlyPcb({
      yearOfAssessment: 2025,
      monthlyGrossSalary: 8000,
      maritalStatus: "married",
      spouseHasIncome: false,
      numberOfChildren: 2,
    });
    expect(twoKids.monthlyPcb).toBeLessThan(noKids.monthlyPcb);
  });

  it("difference shows annual tax minus annual PCB", () => {
    const result = estimateMonthlyPcb({
      yearOfAssessment: 2025,
      monthlyGrossSalary: 5000,
      maritalStatus: "single",
      spouseHasIncome: false,
      numberOfChildren: 0,
    });
    expect(result.difference).toBeCloseTo(result.annualTax - result.annualPcb, 2);
  });
});
