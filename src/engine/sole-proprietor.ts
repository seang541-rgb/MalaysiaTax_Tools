import { TaxBandResult } from "./types";
import { getTaxRates } from "./tax-rates";

/**
 * Sole proprietor / partnership business income tax — Malaysia (Form B)
 *
 * A sole proprietor or partner is taxed at individual rates on business
 * income, not corporate rates. The flow:
 *
 *   Business revenue − allowable expenses − capital allowances
 *     = Adjusted business income (statutory income)
 *   + other personal income
 *     = Total income
 *   − reliefs
 *     = Chargeable income → individual tax bands → rebate/zakat
 *
 * Reuses the individual tax band schedule (getTaxRates) so it stays in
 * sync with the personal income tax calculator.
 */

export interface SoleProprietorInput {
  yearOfAssessment: number;
  businessRevenue: number;
  businessExpenses: number;     // allowable expenses
  capitalAllowance: number;     // current-year capital allowances
  otherIncome: number;          // employment, rental, etc. (already net)
  totalReliefs: number;         // total personal reliefs (incl. RM9,000 personal)
  maritalStatus: "single" | "married";
  spouseHasIncome: boolean;
  zakatAmount: number;
}

export interface SoleProprietorResult {
  adjustedBusinessIncome: number;
  businessLoss: number;          // if expenses+CA exceed revenue
  otherIncome: number;
  totalIncome: number;
  totalReliefs: number;
  chargeableIncome: number;
  bandBreakdown: TaxBandResult[];
  taxBeforeRebate: number;
  rebateAmount: number;
  zakatDeduction: number;
  taxPayable: number;
  effectiveRate: number;         // percentage of total income
}

function calculateTaxByBands(
  chargeableIncome: number,
  yearOfAssessment: number
): TaxBandResult[] {
  const bands = getTaxRates(yearOfAssessment);
  const results: TaxBandResult[] = [];
  let remaining = chargeableIncome;

  for (const band of bands) {
    if (remaining <= 0) break;
    const bandWidth = band.max === Infinity ? remaining : band.max - band.min;
    const taxableInBand = Math.min(remaining, bandWidth);
    const taxForBand = Math.round(taxableInBand * band.rate * 100) / 100;
    results.push({ band, taxableInBand, taxForBand });
    remaining -= taxableInBand;
  }

  return results;
}

export function calculateSoleProprietorTax(
  input: SoleProprietorInput
): SoleProprietorResult {
  const revenue = Math.max(0, input.businessRevenue);
  const expenses = Math.max(0, input.businessExpenses);
  const capitalAllowance = Math.max(0, input.capitalAllowance);
  const otherIncome = Math.max(0, input.otherIncome);

  const netBusiness = revenue - expenses - capitalAllowance;
  const adjustedBusinessIncome = Math.max(0, netBusiness);
  const businessLoss = Math.max(0, -netBusiness);

  const totalIncome = adjustedBusinessIncome + otherIncome;
  const totalReliefs = Math.max(0, input.totalReliefs);
  const chargeableIncome = Math.max(0, totalIncome - totalReliefs);

  const bandBreakdown = calculateTaxByBands(
    chargeableIncome,
    input.yearOfAssessment
  );
  const taxBeforeRebate = Math.round(
    bandBreakdown.reduce((sum, b) => sum + b.taxForBand, 0) * 100
  ) / 100;

  let rebateAmount = 0;
  if (chargeableIncome <= 35000) {
    rebateAmount = 400;
    if (input.maritalStatus === "married" && !input.spouseHasIncome) {
      rebateAmount += 400;
    }
  }

  const afterRebate = Math.max(0, taxBeforeRebate - rebateAmount);
  const zakatDeduction = Math.min(Math.max(0, input.zakatAmount), afterRebate);
  const taxPayable = Math.max(0, afterRebate - zakatDeduction);

  const effectiveRate =
    totalIncome > 0
      ? Math.round((taxPayable / totalIncome) * 10000) / 100
      : 0;

  return {
    adjustedBusinessIncome,
    businessLoss,
    otherIncome,
    totalIncome,
    totalReliefs,
    chargeableIncome,
    bandBreakdown,
    taxBeforeRebate,
    rebateAmount,
    zakatDeduction,
    taxPayable,
    effectiveRate,
  };
}
