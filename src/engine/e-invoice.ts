/**
 * Malaysia e-Invoice (LHDN MyInvois) phase checker
 *
 * Implementation timeline (per LHDN, updated Dec 2025):
 *   Phase 1: turnover > RM100M            → mandatory 1 Aug 2024
 *   Phase 2: RM25M < turnover ≤ RM100M    → mandatory 1 Jan 2025
 *   Phase 3: RM5M  < turnover ≤ RM25M     → mandatory 1 Jul 2025
 *   Phase 4: RM1M  < turnover ≤ RM5M      → mandatory 1 Jan 2026
 *            (relaxation period extended to 31 Dec 2027)
 *   Exempt:  turnover ≤ RM1M              → permanently exempt
 *            (threshold raised from RM500k to RM1M, effective 1 Jan 2026;
 *             the formerly planned Phase 5 was cancelled. Voluntary opt-in allowed.)
 *
 * Key rule: from 1 Jan 2026, any single transaction ≥ RM10,000 requires an
 * individual e-invoice — consolidated e-invoices are no longer accepted for these.
 *
 * Turnover basis: annual turnover/revenue per FY2022 audited financial
 * statements (or as defined by LHDN for newer businesses).
 */

export interface EInvoiceInput {
  annualRevenue: number; // RM
}

export interface EInvoiceResult {
  annualRevenue: number;
  isExempt: boolean;
  phase: 1 | 2 | 3 | 4 | null;     // null when exempt
  mandatoryDate: string | null;     // ISO date, null when exempt
  relaxationEnd: string | null;     // end of penalty-free relaxation period
  exemptionThreshold: number;       // RM1,000,000
}

export const EINVOICE_EXEMPTION_THRESHOLD = 1000000;

const PHASES: {
  phase: 1 | 2 | 3 | 4;
  min: number; // exclusive lower bound
  max: number; // inclusive upper bound
  mandatoryDate: string;
  relaxationEnd: string;
}[] = [
  { phase: 1, min: 100000000, max: Infinity,  mandatoryDate: "2024-08-01", relaxationEnd: "2025-01-31" },
  { phase: 2, min: 25000000,  max: 100000000, mandatoryDate: "2025-01-01", relaxationEnd: "2025-06-30" },
  { phase: 3, min: 5000000,   max: 25000000,  mandatoryDate: "2025-07-01", relaxationEnd: "2025-12-31" },
  { phase: 4, min: 1000000,   max: 5000000,   mandatoryDate: "2026-01-01", relaxationEnd: "2027-12-31" },
];

export function checkEInvoicePhase(input: EInvoiceInput): EInvoiceResult {
  const revenue = Math.max(0, input.annualRevenue);

  if (revenue <= EINVOICE_EXEMPTION_THRESHOLD) {
    return {
      annualRevenue: revenue,
      isExempt: true,
      phase: null,
      mandatoryDate: null,
      relaxationEnd: null,
      exemptionThreshold: EINVOICE_EXEMPTION_THRESHOLD,
    };
  }

  const match = PHASES.find((p) => revenue > p.min && revenue <= p.max)!;

  return {
    annualRevenue: revenue,
    isExempt: false,
    phase: match.phase,
    mandatoryDate: match.mandatoryDate,
    relaxationEnd: match.relaxationEnd,
    exemptionThreshold: EINVOICE_EXEMPTION_THRESHOLD,
  };
}
