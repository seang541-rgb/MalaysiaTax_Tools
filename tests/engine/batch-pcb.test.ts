import { describe, it, expect } from "vitest";
import { calculateBatchPcb } from "@/engine/batch-pcb";

describe("calculateBatchPcb", () => {
  it("returns empty summary for no employees", () => {
    const result = calculateBatchPcb(2025, []);
    expect(result.employees).toHaveLength(0);
    expect(result.totalMonthlyPcb).toBe(0);
    expect(result.totalAnnualPcb).toBe(0);
  });

  it("calculates PCB for a single employee", () => {
    const result = calculateBatchPcb(2025, [
      {
        name: "Ali",
        monthlyGrossSalary: 5000,
        maritalStatus: "single",
        spouseHasIncome: false,
        numberOfChildren: 0,
      },
    ]);
    expect(result.employees).toHaveLength(1);
    expect(result.employees[0].monthlyPcb).toBeGreaterThan(0);
    expect(result.totalMonthlyPcb).toBe(result.employees[0].monthlyPcb);
  });

  it("calculates PCB for multiple employees", () => {
    const result = calculateBatchPcb(2025, [
      {
        name: "Ali",
        monthlyGrossSalary: 5000,
        maritalStatus: "single",
        spouseHasIncome: false,
        numberOfChildren: 0,
      },
      {
        name: "Siti",
        monthlyGrossSalary: 8000,
        maritalStatus: "married",
        spouseHasIncome: false,
        numberOfChildren: 2,
      },
      {
        name: "Kumar",
        monthlyGrossSalary: 3000,
        maritalStatus: "single",
        spouseHasIncome: false,
        numberOfChildren: 0,
      },
    ]);
    expect(result.employees).toHaveLength(3);
    const sumMonthly = result.employees.reduce((s, e) => s + e.monthlyPcb, 0);
    expect(result.totalMonthlyPcb).toBeCloseTo(sumMonthly, 1);
  });

  it("preserves employee names in results", () => {
    const result = calculateBatchPcb(2025, [
      {
        name: "Wong",
        monthlyGrossSalary: 6000,
        maritalStatus: "single",
        spouseHasIncome: false,
        numberOfChildren: 0,
      },
    ]);
    expect(result.employees[0].employee.name).toBe("Wong");
  });

  it("handles low-income employees with zero PCB", () => {
    const result = calculateBatchPcb(2025, [
      {
        name: "Intern",
        monthlyGrossSalary: 1500,
        maritalStatus: "single",
        spouseHasIncome: false,
        numberOfChildren: 0,
      },
    ]);
    expect(result.employees[0].monthlyPcb).toBe(0);
    expect(result.totalMonthlyPcb).toBe(0);
  });
});
