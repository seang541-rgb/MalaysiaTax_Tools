/**
 * Central registry of authoritative sources and "last verified" dates for
 * each tax topic. Surfaced in the UI via <SourceNote topic="..."/> so every
 * figure is traceable to an official source — important for a tax tool's
 * credibility. Update `verified` whenever the figures are re-checked.
 */

export interface TaxSource {
  label: string;
  url: string;
}

export interface TaxSourceEntry {
  verified: string; // ISO year-month, e.g. "2026-06"
  reviewedLabel?: string;
  rulePeriod?: string;
  sources: TaxSource[];
}

export type TaxTopic =
  | "personal"
  | "corporate"
  | "sst"
  | "e-invoice"
  | "rpgt"
  | "stamp-duty"
  | "withholding-tax"
  | "sole-proprietor"
  | "cp204"
  | "capital-allowance"
  | "employer-contributions"
  | "joint-assessment";

export const TAX_SOURCES: Record<TaxTopic, TaxSourceEntry> = {
  personal: {
    verified: "2026-06",
    sources: [
      {
        label: "LHDN — Individual Income Tax Rates",
        url: "https://www.hasil.gov.my/en/individual/individual-life-cycle/how-to-declare-income/tax-rate/",
      },
    ],
  },
  corporate: {
    verified: "2026-06",
    sources: [
      {
        label: "LHDN — Company Tax Rates",
        url: "https://www.hasil.gov.my/en/company/company-tax-rate/",
      },
    ],
  },
  sst: {
    verified: "2026-06",
    sources: [
      { label: "RMCD MySST", url: "https://mysst.customs.gov.my/" },
    ],
  },
  "e-invoice": {
    verified: "2026-06",
    sources: [
      { label: "LHDN e-Invoice", url: "https://www.hasil.gov.my/en/e-invoice/" },
    ],
  },
  rpgt: {
    verified: "2026-06",
    sources: [
      {
        label: "LHDN — RPGT Rates",
        url: "https://www.hasil.gov.my/en/rpgt/real-property-gains-tax-rpgt-rates/",
      },
    ],
  },
  "stamp-duty": {
    verified: "2026-06",
    sources: [
      { label: "LHDN - Stamp Duty", url: "https://www.hasil.gov.my/en/stamp-duty/" },
    ],
  },
  "withholding-tax": {
    verified: "2026-06",
    sources: [
      {
        label: "LHDN - Withholding Tax",
        url: "https://www.hasil.gov.my/en/legislation/withholding-tax/",
      },
    ],
  },
  "sole-proprietor": {
    verified: "2026-06",
    sources: [
      {
        label: "LHDN - Individual Income Tax Rates",
        url: "https://www.hasil.gov.my/en/individual/individual-life-cycle/how-to-declare-income/tax-rate/",
      },
    ],
  },
  cp204: {
    verified: "2026-06",
    sources: [
      {
        label: "LHDN — Tax Estimation (CP204)",
        url: "https://www.hasil.gov.my/en/company/tax-estimation/",
      },
    ],
  },
  "capital-allowance": {
    verified: "2026-06",
    sources: [
      {
        label: "LHDN - Public Rulings (Capital Allowances)",
        url: "https://www.hasil.gov.my/en/legislation/public-rulings/",
      },
    ],
  },
  "employer-contributions": {
    verified: "2026-06",
    sources: [
      { label: "KWSP/EPF", url: "https://www.kwsp.gov.my/" },
      { label: "PERKESO/SOCSO", url: "https://www.perkeso.gov.my/" },
    ],
  },
  "joint-assessment": {
    verified: "2026-06",
    reviewedLabel: "Comparison rules reviewed",
    rulePeriod: "YA 2025",
    sources: [
      {
        label: "LHDN - Individual Income Tax Rates",
        url: "https://www.hasil.gov.my/en/individual/individual-life-cycle/how-to-declare-income/tax-rate/",
      },
      { label: "LHDN", url: "https://www.hasil.gov.my/" },
    ],
  },
};
