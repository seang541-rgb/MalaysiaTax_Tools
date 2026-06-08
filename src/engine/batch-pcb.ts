import {
  BatchEmployeeInput,
  BatchPcbResult,
  BatchPcbSummary,
} from "./types";
import { estimateMonthlyPcb } from "./pcb";

export function calculateBatchPcb(
  yearOfAssessment: number,
  employees: BatchEmployeeInput[]
): BatchPcbSummary {
  const results: BatchPcbResult[] = employees.map((emp) => {
    const pcb = estimateMonthlyPcb({
      yearOfAssessment,
      monthlyGrossSalary: emp.monthlyGrossSalary,
      maritalStatus: emp.maritalStatus,
      spouseHasIncome: emp.spouseHasIncome,
      numberOfChildren: emp.numberOfChildren,
    });

    return {
      employee: emp,
      monthlyPcb: pcb.monthlyPcb,
      annualPcb: pcb.annualPcb,
      annualTax: pcb.annualTax,
    };
  });

  const totalMonthlyPcb = Math.round(
    results.reduce((sum, r) => sum + r.monthlyPcb, 0) * 100
  ) / 100;
  const totalAnnualPcb = Math.round(
    results.reduce((sum, r) => sum + r.annualPcb, 0) * 100
  ) / 100;
  const totalAnnualTax = Math.round(
    results.reduce((sum, r) => sum + r.annualTax, 0) * 100
  ) / 100;

  return {
    employees: results,
    totalMonthlyPcb,
    totalAnnualPcb,
    totalAnnualTax,
  };
}
