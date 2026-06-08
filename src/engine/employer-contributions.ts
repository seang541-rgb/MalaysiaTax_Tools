import {
  EmployerContributionInput,
  EmployerContributionResult,
  BatchContributionInput,
  BatchContributionResult,
  BatchContributionSummary,
} from "./types";

/**
 * Malaysia EPF Rates 2025
 *
 * Employer:
 *   - Salary ≤ RM5,000: 13%
 *   - Salary > RM5,000: 12%
 *   - Age 60-65: 4% (employer), employee optional
 *   - Above 65: 0% (exempt)
 *
 * Employee:
 *   - Below 60: 11%
 *   - Age 60-65: 0% (optional, can elect 5.5% or 0%)
 *   - Above 65: 0%
 *
 * EPF wage ceiling: RM20,000/month (for mandatory contributions)
 */

const EPF_WAGE_CEILING = 20000;

function calculateEpf(
  salary: number,
  age: "below60" | "60to65" | "above65"
): { employer: number; employee: number } {
  if (age === "above65") {
    return { employer: 0, employee: 0 };
  }

  const cappedSalary = Math.min(salary, EPF_WAGE_CEILING);

  if (age === "60to65") {
    // Employer 4%, Employee voluntary (we assume 0% for calculation)
    return {
      employer: Math.round(cappedSalary * 0.04 * 100) / 100,
      employee: 0,
    };
  }

  // Below 60
  const employerRate = salary <= 5000 ? 0.13 : 0.12;
  return {
    employer: Math.round(cappedSalary * employerRate * 100) / 100,
    employee: Math.round(cappedSalary * 0.11 * 100) / 100,
  };
}

/**
 * Malaysia SOCSO Rates 2025
 *
 * Two schemes:
 *   - Employment Injury Scheme (EIS/PERKESO): employer 1.25%
 *   - Invalidity Pension Scheme: employer 0.5%, employee 0.5%
 *   - Total employer: 1.75%, employee: 0.5%
 *
 * Wage ceiling: RM6,000/month
 * Only for employees below 60 (new employees above 60 exempt)
 * Malaysian/PR only
 */

const SOCSO_WAGE_CEILING = 6000;

function calculateSocso(
  salary: number,
  age: "below60" | "60to65" | "above65",
  isMalaysianOrPR: boolean
): { employer: number; employee: number } {
  // SOCSO only for below 60, Malaysian/PR
  if (age !== "below60" || !isMalaysianOrPR) {
    return { employer: 0, employee: 0 };
  }

  const cappedSalary = Math.min(salary, SOCSO_WAGE_CEILING);
  return {
    employer: Math.round(cappedSalary * 0.0175 * 100) / 100,
    employee: Math.round(cappedSalary * 0.005 * 100) / 100,
  };
}

/**
 * Malaysia EIS (Employment Insurance System / SIP) 2025
 *
 * Employer: 0.2%, Employee: 0.2%
 * Wage ceiling: RM6,000/month
 * Only for employees below 60, Malaysian/PR
 */

const EIS_WAGE_CEILING = 6000;

function calculateEis(
  salary: number,
  age: "below60" | "60to65" | "above65",
  isMalaysianOrPR: boolean
): { employer: number; employee: number } {
  if (age !== "below60" || !isMalaysianOrPR) {
    return { employer: 0, employee: 0 };
  }

  const cappedSalary = Math.min(salary, EIS_WAGE_CEILING);
  return {
    employer: Math.round(cappedSalary * 0.002 * 100) / 100,
    employee: Math.round(cappedSalary * 0.002 * 100) / 100,
  };
}

export function calculateEmployerContributions(
  input: EmployerContributionInput
): EmployerContributionResult {
  const epf = calculateEpf(input.monthlyGrossSalary, input.employeeAge);
  const socso = calculateSocso(
    input.monthlyGrossSalary,
    input.employeeAge,
    input.isMalaysianOrPR
  );
  const eis = calculateEis(
    input.monthlyGrossSalary,
    input.employeeAge,
    input.isMalaysianOrPR
  );

  const totalEmployer = Math.round(
    (epf.employer + socso.employer + eis.employer) * 100
  ) / 100;
  const totalEmployee = Math.round(
    (epf.employee + socso.employee + eis.employee) * 100
  ) / 100;

  return {
    employee: input,
    epfEmployer: epf.employer,
    epfEmployee: epf.employee,
    socsoEmployer: socso.employer,
    socsoEmployee: socso.employee,
    eisEmployer: eis.employer,
    eisEmployee: eis.employee,
    totalEmployer,
    totalEmployee,
    totalCost: Math.round(
      (input.monthlyGrossSalary + totalEmployer) * 100
    ) / 100,
  };
}

export function calculateBatchContributions(
  employees: BatchContributionInput[]
): BatchContributionSummary {
  const results: BatchContributionResult[] = employees.map((emp) => ({
    employee: emp,
    contributions: calculateEmployerContributions({
      monthlyGrossSalary: emp.monthlyGrossSalary,
      employeeAge: emp.employeeAge,
      isMalaysianOrPR: emp.isMalaysianOrPR,
    }),
  }));

  const round = (n: number) => Math.round(n * 100) / 100;

  return {
    employees: results,
    totalMonthlyEpfEmployer: round(
      results.reduce((s, r) => s + r.contributions.epfEmployer, 0)
    ),
    totalMonthlySocsoEmployer: round(
      results.reduce((s, r) => s + r.contributions.socsoEmployer, 0)
    ),
    totalMonthlyEisEmployer: round(
      results.reduce((s, r) => s + r.contributions.eisEmployer, 0)
    ),
    totalMonthlyEmployerCost: round(
      results.reduce((s, r) => s + r.contributions.totalEmployer, 0)
    ),
    totalMonthlySalary: round(
      results.reduce((s, r) => s + r.contributions.employee.monthlyGrossSalary, 0)
    ),
    totalMonthlyTotalCost: round(
      results.reduce((s, r) => s + r.contributions.totalCost, 0)
    ),
  };
}
