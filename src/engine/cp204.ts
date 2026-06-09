/**
 * CP204 — Estimated Tax Payable calculator (Section 107C, Income Tax Act 1967)
 *
 * Rules implemented:
 * - Estimate must be submitted no later than 30 days before the basis period begins.
 * - Minimum estimate: not less than 85% of the (revised) estimate for the
 *   immediately preceding year of assessment.
 * - Paid in equal monthly instalments (CP207) starting from the 2nd month of
 *   the basis period; each due by the 15th of the month.
 * - Revisions (CP204A) allowed in the 6th and 9th month of the basis period
 *   (plus a temporary 11th-month option for YA2024–2026).
 * - Underestimation penalty (s107C(10)): if actual tax exceeds the (revised)
 *   estimate by more than 30% of actual tax, the excess above the 30% buffer
 *   is penalised at 10%.
 * - New SMEs are exempt from CP204 for the first 2 YAs from commencement.
 */

export interface Cp204Input {
  estimatedTax: number;        // current-year estimate (RM)
  basisPeriodMonths?: number;  // length of basis period, default 12
  priorYearEstimate?: number;  // prior YA (revised) estimate for the 85% check
  actualTax?: number;          // optional: actual tax for penalty simulation
}

export interface Cp204Installment {
  installmentNo: number; // 1-based
  monthOfBasisPeriod: number; // payment month (2 = 2nd month of basis period)
  amount: number;
}

export interface Cp204Result {
  estimatedTax: number;
  // 85% minimum rule
  minimumRequired: number | null;  // null when no prior estimate provided
  meetsMinimum: boolean | null;
  // installment schedule
  installmentCount: number;
  monthlyAmount: number;       // standard installment
  finalAmount: number;         // last installment (adjusted for rounding)
  installments: Cp204Installment[];
  // revision windows
  revisionMonths: number[];    // months of basis period when CP204A can be filed
  // underestimation penalty simulation
  penalty: {
    actualTax: number;
    difference: number;        // actual - estimate
    buffer: number;            // 30% of actual
    excessOverBuffer: number;  // max(0, difference - buffer)
    penaltyAmount: number;     // 10% of excess
  } | null;
}

export function calculateCp204(input: Cp204Input): Cp204Result {
  const months = Math.max(1, Math.round(input.basisPeriodMonths ?? 12));
  const estimate = Math.max(0, input.estimatedTax);

  // 85% minimum rule
  let minimumRequired: number | null = null;
  let meetsMinimum: boolean | null = null;
  if (input.priorYearEstimate != null && input.priorYearEstimate > 0) {
    minimumRequired = Math.round(input.priorYearEstimate * 0.85 * 100) / 100;
    meetsMinimum = estimate >= minimumRequired;
  }

  // Equal monthly instalments from the 2nd month of the basis period.
  // Number of instalments equals the number of months in the basis period.
  const installmentCount = months;
  const monthlyAmount = Math.floor((estimate / installmentCount) * 100) / 100;
  const finalAmount =
    Math.round((estimate - monthlyAmount * (installmentCount - 1)) * 100) / 100;

  const installments: Cp204Installment[] = [];
  for (let i = 1; i <= installmentCount; i++) {
    installments.push({
      installmentNo: i,
      monthOfBasisPeriod: i + 1, // starts from 2nd month
      amount: i === installmentCount ? finalAmount : monthlyAmount,
    });
  }

  // Revision windows: 6th and 9th month (11th month temporary for YA2024-2026)
  const revisionMonths = [6, 9, 11];

  // Underestimation penalty (s107C(10))
  let penalty: Cp204Result["penalty"] = null;
  if (input.actualTax != null && input.actualTax > 0) {
    const actual = input.actualTax;
    const difference = Math.max(0, actual - estimate);
    const buffer = Math.round(actual * 0.3 * 100) / 100;
    const excessOverBuffer = Math.max(0, Math.round((difference - buffer) * 100) / 100);
    const penaltyAmount = Math.round(excessOverBuffer * 0.1 * 100) / 100;
    penalty = {
      actualTax: actual,
      difference,
      buffer,
      excessOverBuffer,
      penaltyAmount,
    };
  }

  return {
    estimatedTax: estimate,
    minimumRequired,
    meetsMinimum,
    installmentCount,
    monthlyAmount,
    finalAmount,
    installments,
    revisionMonths,
    penalty,
  };
}
