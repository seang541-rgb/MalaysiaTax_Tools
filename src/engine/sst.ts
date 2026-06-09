import { SstInput, SstResult, ServiceTaxCategory } from "./types";

/**
 * Malaysia SST (Sales & Service Tax) — effective 1 July 2025
 *
 * Sales Tax (unchanged structure):
 *   - 5% on certain goods, 10% standard rate
 *   - Registration threshold: RM500,000 annual taxable turnover
 *
 * Service Tax (major scope expansion 1 July 2025):
 *   | Category                                | Rate | Registration threshold |
 *   |-----------------------------------------|------|------------------------|
 *   | General services (professional, IT...)  | 8%   | RM500,000              |
 *   | Food & beverage                         | 6%   | RM1,500,000            |
 *   | Telecommunications                      | 6%   | RM500,000              |
 *   | Vehicle parking                         | 6%   | RM500,000              |
 *   | Logistics                               | 6%   | RM500,000              |
 *   | Rental/leasing (non-residential) — NEW  | 8%   | RM1,000,000            |
 *   | Construction (non-residential) — NEW    | 6%   | RM1,500,000            |
 *   | Financial (fee/commission) — NEW        | 8%   | RM1,000,000            |
 *   | Private healthcare (non-citizens) — NEW | 6%   | RM1,500,000            |
 *   | Private education — NEW                 | 6%   | No threshold           |
 *
 * Notes:
 *   - Beauty services were proposed but withdrawn before implementation.
 *   - Education: applies to private schools charging > RM60,000/student/year,
 *     and higher education for non-citizen students.
 *   - Residential rental and residential construction are NOT taxable.
 *   - Grace period (no penalties) ran 1 Jul – 31 Dec 2025; full enforcement
 *     from 1 Jan 2026.
 */

const SALES_TAX_THRESHOLD = 500000;

interface ServiceCategoryConfig {
  rate: number;      // decimal, e.g. 0.08
  threshold: number; // RM; 0 = no threshold (always registrable)
}

export const SERVICE_TAX_CATEGORIES: Record<ServiceTaxCategory, ServiceCategoryConfig> = {
  general:      { rate: 0.08, threshold: 500000 },
  fnb:          { rate: 0.06, threshold: 1500000 },
  telecom:      { rate: 0.06, threshold: 500000 },
  parking:      { rate: 0.06, threshold: 500000 },
  logistics:    { rate: 0.06, threshold: 500000 },
  rental:       { rate: 0.08, threshold: 1000000 },
  construction: { rate: 0.06, threshold: 1500000 },
  financial:    { rate: 0.08, threshold: 1000000 },
  healthcare:   { rate: 0.06, threshold: 1500000 },
  education:    { rate: 0.06, threshold: 0 },
};

export function calculateSst(input: SstInput): SstResult {
  let taxRate: number;
  let threshold: number;
  let serviceCategory: ServiceTaxCategory | undefined;

  if (input.taxType === "service") {
    serviceCategory = input.serviceCategory ?? "general";
    const config = SERVICE_TAX_CATEGORIES[serviceCategory];
    taxRate = config.rate;
    threshold = config.threshold;
  } else {
    taxRate = (input.salesTaxRate ?? 10) / 100;
    threshold = SALES_TAX_THRESHOLD;
  }

  // threshold 0 = no threshold (registrable from first ringgit of taxable services)
  const isRegistrationRequired =
    threshold === 0
      ? input.taxableRevenue > 0
      : input.taxableRevenue >= threshold;

  // Only estimate tax once registration is required
  const estimatedTax = isRegistrationRequired
    ? Math.round(input.taxableRevenue * taxRate * 100) / 100
    : 0;

  const monthlyTax = Math.round((estimatedTax / 12) * 100) / 100;

  return {
    taxableRevenue: input.taxableRevenue,
    isRegistrationRequired,
    taxType: input.taxType,
    serviceCategory,
    taxRate: taxRate * 100,
    estimatedTax,
    monthlyTax,
    registrationThreshold: threshold,
  };
}
