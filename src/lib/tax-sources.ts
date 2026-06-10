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
  sources: TaxSource[];
}

export type TaxTopic =
  | "personal"
  | "corporate"
  | "sst"
  | "einvoice"
  | "rpgt"
  | "stampduty"
  | "wht"
  | "soleprop"
  | "cp204"
  | "capalw"
  | "employer";

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
  einvoice: {
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
  stampduty: {
    verified: "2026-06",
    sources: [
      { label: "LHDN — Stamp Duty", url: "https://www.hasil.gov.my/en/stamp-duty/" },
    ],
  },
  wht: {
    verified: "2026-06",
    sources: [
      {
        label: "LHDN — Withholding Tax",
        url: "https://www.hasil.gov.my/en/legislation/withholding-tax/",
      },
    ],
  },
  soleprop: {
    verified: "2026-06",
    sources: [
      {
        label: "LHDN — Individual Income Tax Rates",
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
  capalw: {
    verified: "2026-06",
    sources: [
      {
        label: "LHDN — Public Rulings (Capital Allowances)",
        url: "https://www.hasil.gov.my/en/legislation/public-rulings/",
      },
    ],
  },
  employer: {
    verified: "2026-06",
    sources: [
      { label: "KWSP/EPF", url: "https://www.kwsp.gov.my/" },
      { label: "PERKESO/SOCSO", url: "https://www.perkeso.gov.my/" },
    ],
  },
};
