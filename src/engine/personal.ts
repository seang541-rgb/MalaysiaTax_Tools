import {
  TaxCalculationInput,
  TaxCalculationResult,
  TaxBandResult,
  ReliefClaim,
} from "./types";
import { getTaxRates } from "./tax-rates";
import { getReliefDefinitions } from "./tax-reliefs";

function sumIncome(input: TaxCalculationInput): number {
  const i = input.income;
  return i.employment + i.commission + i.rental + i.interest + i.dividend + i.other;
}

function calculateReliefs(
  claims: ReliefClaim[],
  yearOfAssessment: number
): number {
  const definitions = getReliefDefinitions(yearOfAssessment);
  let total = 0;
  for (const claim of claims) {
    const def = definitions.find((d) => d.id === claim.reliefId);
    if (def) {
      total += Math.min(claim.amount, def.maxAmount);
    }
  }
  return total;
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

export function calculatePersonalTax(
  input: TaxCalculationInput
): TaxCalculationResult {
  const grossIncome = sumIncome(input);
  const totalReliefs = calculateReliefs(input.reliefs, input.yearOfAssessment);
  const chargeableIncome = Math.max(0, grossIncome - totalReliefs);

  const bandBreakdown = calculateTaxByBands(
    chargeableIncome,
    input.yearOfAssessment
  );
  const taxBeforeRebate = bandBreakdown.reduce(
    (sum, b) => sum + b.taxForBand,
    0
  );

  let rebateAmount = 0;
  if (chargeableIncome <= 35000) {
    rebateAmount = 400;
    if (input.maritalStatus === "married" && !input.spouseHasIncome) {
      rebateAmount += 400;
    }
  }

  const afterRebate = Math.max(0, taxBeforeRebate - rebateAmount);
  const zakatDeduction = Math.min(input.zakatAmount, afterRebate);
  const taxAfterRebateAndZakat = Math.max(0, afterRebate - zakatDeduction);

  const totalPcbPaid = input.monthlyPcbPaid * 12;
  const balanceTaxPayable = taxAfterRebateAndZakat - totalPcbPaid;

  return {
    grossIncome,
    totalReliefs,
    chargeableIncome,
    bandBreakdown,
    taxBeforeRebate,
    rebateAmount,
    zakatDeduction,
    taxAfterRebateAndZakat,
    totalPcbPaid,
    balanceTaxPayable,
  };
}
