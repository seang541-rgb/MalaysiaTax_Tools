/**
 * Stamp Duty — Malaysia (property transactions)
 *
 * Verified against PwC Malaysia Tax Booklet / LHDN (2025):
 *   https://www.pwc.com/my/en/publications/mtb/stamp-duty.html
 *
 * Instrument of Transfer (MOT) — ad valorem, progressive on the higher of
 * price or market value:
 *   1% on first RM100,000
 *   2% on RM100,001 – RM500,000
 *   3% on RM500,001 – RM1,000,000
 *   4% above RM1,000,000
 *
 * Non-citizen / foreign-company buyers (excluding PR): flat 4% currently.
 * (Budget 2026 proposed raising this to a flat rate of up to 8% for
 *  instruments executed on/after 1 Jan 2026 — not yet enacted; flagged
 *  in the UI rather than hard-coded.)
 *
 * Loan agreement stamp duty: flat 0.5% of the loan amount.
 *
 * First-time homebuyer exemption: 100% exemption on MOT and loan stamp
 * duty for residential property up to RM500,000 (extended to 31 Dec 2027).
 */

export type StampBuyerType = "citizen_pr" | "foreigner";

export interface StampDutyInput {
  propertyPrice: number;        // higher of purchase price or market value
  buyerType: StampBuyerType;
  loanAmount: number;           // 0 if cash purchase
  firstTimeBuyer?: boolean;     // residential ≤ RM500k → full exemption
}

export interface StampDutyTier {
  from: number;
  to: number;          // Infinity for top tier
  rate: number;        // percentage
  duty: number;        // duty for the portion in this tier
}

export interface StampDutyResult {
  propertyPrice: number;
  motTiers: StampDutyTier[];
  motDutyBeforeExemption: number;
  loanAmount: number;
  loanDutyBeforeExemption: number;
  firstTimeExemptionApplied: boolean;
  motDuty: number;              // after exemption
  loanDuty: number;             // after exemption
  totalDuty: number;
  foreignerFlatRate: boolean;   // true if flat-rate path used
}

const MOT_TIERS: { upTo: number; rate: number }[] = [
  { upTo: 100000, rate: 0.01 },
  { upTo: 500000, rate: 0.02 },
  { upTo: 1000000, rate: 0.03 },
  { upTo: Infinity, rate: 0.04 },
];

const FOREIGNER_FLAT_RATE = 0.04;
const LOAN_RATE = 0.005;
const FIRST_TIME_CAP = 500000;

function computeTieredMot(price: number): { tiers: StampDutyTier[]; total: number } {
  const tiers: StampDutyTier[] = [];
  let remaining = price;
  let prevBound = 0;
  let total = 0;

  for (const tier of MOT_TIERS) {
    if (remaining <= 0) break;
    const bandWidth = tier.upTo === Infinity ? remaining : tier.upTo - prevBound;
    const taxable = Math.min(remaining, bandWidth);
    const duty = Math.round(taxable * tier.rate * 100) / 100;
    tiers.push({
      from: prevBound,
      to: tier.upTo,
      rate: tier.rate * 100,
      duty,
    });
    total += duty;
    remaining -= taxable;
    prevBound = tier.upTo;
  }

  return { tiers, total: Math.round(total * 100) / 100 };
}

export function calculateStampDuty(input: StampDutyInput): StampDutyResult {
  const propertyPrice = Math.max(0, input.propertyPrice);
  const loanAmount = Math.max(0, input.loanAmount);

  let motTiers: StampDutyTier[];
  let motDutyBeforeExemption: number;
  const foreignerFlatRate = input.buyerType === "foreigner";

  if (foreignerFlatRate) {
    const duty = Math.round(propertyPrice * FOREIGNER_FLAT_RATE * 100) / 100;
    motTiers = [
      { from: 0, to: Infinity, rate: FOREIGNER_FLAT_RATE * 100, duty },
    ];
    motDutyBeforeExemption = duty;
  } else {
    const tiered = computeTieredMot(propertyPrice);
    motTiers = tiered.tiers;
    motDutyBeforeExemption = tiered.total;
  }

  const loanDutyBeforeExemption = Math.round(loanAmount * LOAN_RATE * 100) / 100;

  // First-time homebuyer: 100% exemption on MOT + loan for property ≤ RM500k
  const firstTimeExemptionApplied =
    !!input.firstTimeBuyer &&
    !foreignerFlatRate &&
    propertyPrice <= FIRST_TIME_CAP;

  const motDuty = firstTimeExemptionApplied ? 0 : motDutyBeforeExemption;
  const loanDuty = firstTimeExemptionApplied ? 0 : loanDutyBeforeExemption;
  const totalDuty = Math.round((motDuty + loanDuty) * 100) / 100;

  return {
    propertyPrice,
    motTiers,
    motDutyBeforeExemption,
    loanAmount,
    loanDutyBeforeExemption,
    firstTimeExemptionApplied,
    motDuty,
    loanDuty,
    totalDuty,
    foreignerFlatRate,
  };
}
