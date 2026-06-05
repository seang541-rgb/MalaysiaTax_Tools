import { TaxBand } from "./types";

// Bands use exclusive upper bounds: min is inclusive, max is exclusive
// e.g. { min: 0, max: 5000 } covers the first RM5,000
export const TAX_RATES_YA2025: TaxBand[] = [
  { min: 0, max: 5000, rate: 0 },
  { min: 5000, max: 20000, rate: 0.01 },
  { min: 20000, max: 35000, rate: 0.03 },
  { min: 35000, max: 50000, rate: 0.06 },
  { min: 50000, max: 70000, rate: 0.11 },
  { min: 70000, max: 100000, rate: 0.19 },
  { min: 100000, max: 400000, rate: 0.25 },
  { min: 400000, max: 600000, rate: 0.26 },
  { min: 600000, max: 2000000, rate: 0.28 },
  { min: 2000000, max: Infinity, rate: 0.30 },
];

export function getTaxRates(yearOfAssessment: number): TaxBand[] {
  if (yearOfAssessment === 2025) {
    return TAX_RATES_YA2025;
  }
  return TAX_RATES_YA2025;
}
