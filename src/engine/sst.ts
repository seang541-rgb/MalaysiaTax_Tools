import { SstInput, SstResult } from "./types";

/**
 * Malaysia SST (Sales & Service Tax) 2025
 *
 * Sales Tax:
 *   - 5% on certain goods (e.g., fruits, certain food items)
 *   - 10% on taxable goods (standard rate)
 *   - Registration threshold: RM500,000 annual taxable turnover
 *
 * Service Tax:
 *   - 8% on taxable services (increased from 6% in March 2024)
 *   - Covers: F&B, telecoms, insurance, hotels, professional services, etc.
 *   - Registration threshold: RM500,000 annual taxable turnover
 *   - Exceptions: food & beverage remains 6%, certain services exempt
 *
 * For simplicity, we use 8% as the standard service tax rate
 * and allow users to select 5% or 10% for sales tax.
 */

const SST_REGISTRATION_THRESHOLD = 500000;
const SERVICE_TAX_RATE = 0.08; // 8% standard

export function calculateSst(input: SstInput): SstResult {
  const isRegistrationRequired =
    input.taxableRevenue >= SST_REGISTRATION_THRESHOLD;

  let taxRate: number;
  if (input.taxType === "service") {
    taxRate = SERVICE_TAX_RATE;
  } else {
    taxRate = (input.salesTaxRate ?? 10) / 100;
  }

  // Only calculate tax if registration is required (above threshold)
  const estimatedTax = isRegistrationRequired
    ? Math.round(input.taxableRevenue * taxRate * 100) / 100
    : 0;

  const monthlyTax = Math.round((estimatedTax / 12) * 100) / 100;

  return {
    taxableRevenue: input.taxableRevenue,
    isRegistrationRequired,
    taxType: input.taxType,
    taxRate: taxRate * 100, // as percentage
    estimatedTax,
    monthlyTax,
    registrationThreshold: SST_REGISTRATION_THRESHOLD,
  };
}
