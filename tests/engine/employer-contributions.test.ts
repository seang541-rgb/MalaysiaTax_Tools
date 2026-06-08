import { describe, it, expect } from "vitest";
import {
  calculateEmployerContributions,
  calculateBatchContributions,
} from "@/engine/employer-contributions";

describe("calculateEmployerContributions", () => {
  it("calculates EPF 13% for salary <= RM5,000", () => {
    const result = calculateEmployerContributions({
      monthlyGrossSalary: 4000,
      employeeAge: "below60",
      isMalaysianOrPR: true,
    });
    expect(result.epfEmployer).toBe(520); // 4000 * 13%
    expect(result.epfEmployee).toBe(440); // 4000 * 11%
  });

  it("calculates EPF 12% for salary > RM5,000", () => {
    const result = calculateEmployerContributions({
      monthlyGrossSalary: 8000,
      employeeAge: "below60",
      isMalaysianOrPR: true,
    });
    expect(result.epfEmployer).toBe(960); // 8000 * 12%
    expect(result.epfEmployee).toBe(880); // 8000 * 11%
  });

  it("caps EPF at RM20,000 wage ceiling", () => {
    const result = calculateEmployerContributions({
      monthlyGrossSalary: 30000,
      employeeAge: "below60",
      isMalaysianOrPR: true,
    });
    expect(result.epfEmployer).toBe(2400); // 20000 * 12%
    expect(result.epfEmployee).toBe(2200); // 20000 * 11%
  });

  it("calculates EPF 4% for age 60-65", () => {
    const result = calculateEmployerContributions({
      monthlyGrossSalary: 5000,
      employeeAge: "60to65",
      isMalaysianOrPR: true,
    });
    expect(result.epfEmployer).toBe(200); // 5000 * 4%
    expect(result.epfEmployee).toBe(0); // voluntary
  });

  it("EPF exempt for above 65", () => {
    const result = calculateEmployerContributions({
      monthlyGrossSalary: 5000,
      employeeAge: "above65",
      isMalaysianOrPR: true,
    });
    expect(result.epfEmployer).toBe(0);
    expect(result.epfEmployee).toBe(0);
  });

  it("calculates SOCSO correctly for below 60 Malaysian", () => {
    const result = calculateEmployerContributions({
      monthlyGrossSalary: 4000,
      employeeAge: "below60",
      isMalaysianOrPR: true,
    });
    expect(result.socsoEmployer).toBe(70); // 4000 * 1.75%
    expect(result.socsoEmployee).toBe(20); // 4000 * 0.5%
  });

  it("caps SOCSO at RM6,000 wage ceiling", () => {
    const result = calculateEmployerContributions({
      monthlyGrossSalary: 10000,
      employeeAge: "below60",
      isMalaysianOrPR: true,
    });
    expect(result.socsoEmployer).toBe(105); // 6000 * 1.75%
    expect(result.socsoEmployee).toBe(30); // 6000 * 0.5%
  });

  it("SOCSO exempt for age 60+", () => {
    const result = calculateEmployerContributions({
      monthlyGrossSalary: 5000,
      employeeAge: "60to65",
      isMalaysianOrPR: true,
    });
    expect(result.socsoEmployer).toBe(0);
    expect(result.socsoEmployee).toBe(0);
  });

  it("calculates EIS correctly", () => {
    const result = calculateEmployerContributions({
      monthlyGrossSalary: 4000,
      employeeAge: "below60",
      isMalaysianOrPR: true,
    });
    expect(result.eisEmployer).toBe(8); // 4000 * 0.2%
    expect(result.eisEmployee).toBe(8); // 4000 * 0.2%
  });

  it("caps EIS at RM6,000 wage ceiling", () => {
    const result = calculateEmployerContributions({
      monthlyGrossSalary: 10000,
      employeeAge: "below60",
      isMalaysianOrPR: true,
    });
    expect(result.eisEmployer).toBe(12); // 6000 * 0.2%
  });

  it("non-Malaysian exempt from SOCSO and EIS", () => {
    const result = calculateEmployerContributions({
      monthlyGrossSalary: 5000,
      employeeAge: "below60",
      isMalaysianOrPR: false,
    });
    expect(result.socsoEmployer).toBe(0);
    expect(result.eisEmployer).toBe(0);
    // EPF still applies
    expect(result.epfEmployer).toBe(650); // 5000 * 13%
  });

  it("calculates total employer cost correctly", () => {
    const result = calculateEmployerContributions({
      monthlyGrossSalary: 5000,
      employeeAge: "below60",
      isMalaysianOrPR: true,
    });
    const expectedEmployer = result.epfEmployer + result.socsoEmployer + result.eisEmployer;
    expect(result.totalEmployer).toBe(expectedEmployer);
    expect(result.totalCost).toBe(5000 + expectedEmployer);
  });
});

describe("calculateBatchContributions", () => {
  it("returns empty summary for no employees", () => {
    const result = calculateBatchContributions([]);
    expect(result.employees).toHaveLength(0);
    expect(result.totalMonthlyEmployerCost).toBe(0);
  });

  it("calculates batch for multiple employees", () => {
    const result = calculateBatchContributions([
      {
        name: "Ali",
        monthlyGrossSalary: 3000,
        employeeAge: "below60",
        isMalaysianOrPR: true,
      },
      {
        name: "Siti",
        monthlyGrossSalary: 8000,
        employeeAge: "below60",
        isMalaysianOrPR: true,
      },
    ]);
    expect(result.employees).toHaveLength(2);
    expect(result.totalMonthlySalary).toBe(11000);
    expect(result.totalMonthlyEmployerCost).toBeGreaterThan(0);
    expect(result.totalMonthlyTotalCost).toBe(
      result.totalMonthlySalary + result.totalMonthlyEmployerCost
    );
  });
});
