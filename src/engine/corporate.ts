import {
  CorporateTaxInput,
  CorporateTaxResult,
  CorporateTaxBand,
  CorporateTaxBandResult,
} from "./types";

/**
 * Malaysia Corporate Tax Rates YA2025
 *
 * SME (paid-up capital <= RM2.5M AND annual revenue < RM50M):
 *   - First RM150,000: 15%
 *   - RM150,001 – RM600,000: 17%
 *   - Above RM600,000: 24%
 *
 * Non-SME (standard):
 *   - All income: 24%
 */

const SME_BANDS_YA2025: CorporateTaxBand[] = [
  { min: 0, max: 150000, rate: 0.15, label: "sme_tier1" },
  { min: 150000, max: 600000, rate: 0.17, label: "sme_tier2" },
  { min: 600000, max: Infinity, rate: 0.24, label: "sme_tier3" },
];

const STANDARD_BANDS_YA2025: CorporateTaxBand[] = [
  { min: 0, max: Infinity, rate: 0.24, label: "standard" },
];

function getCorporateTaxBands(
  isSme: boolean,
  _yearOfAssessment: number
): CorporateTaxBand[] {
  return isSme ? SME_BANDS_YA2025 : STANDARD_BANDS_YA2025;
}

function checkSmeEligibility(input: CorporateTaxInput): boolean {
  if (!input.isSme) return false;
  return input.paidUpCapital <= 2500000 && input.annualRevenue < 50000000;
}

export function calculateCorporateTax(
  input: CorporateTaxInput
): CorporateTaxResult {
  const isSmeQualified = checkSmeEligibility(input);
  const bands = getCorporateTaxBands(isSmeQualified, input.yearOfAssessment);

  const breakdown: CorporateTaxBandResult[] = [];
  let remaining = Math.max(0, input.chargeableIncome);

  for (const band of bands) {
    if (remaining <= 0) break;
    const bandWidth =
      band.max === Infinity ? remaining : band.max - band.min;
    const taxableInBand = Math.min(remaining, bandWidth);
    const taxForBand = Math.round(taxableInBand * band.rate * 100) / 100;
    breakdown.push({ band, taxableInBand, taxForBand });
    remaining -= taxableInBand;
  }

  const totalTax = breakdown.reduce((sum, b) => sum + b.taxForBand, 0);
  const effectiveRate =
    input.chargeableIncome > 0
      ? Math.round((totalTax / input.chargeableIncome) * 10000) / 100
      : 0;

  return {
    chargeableIncome: input.chargeableIncome,
    isSmeQualified,
    bandBreakdown: breakdown,
    totalTax,
    effectiveRate,
  };
}
