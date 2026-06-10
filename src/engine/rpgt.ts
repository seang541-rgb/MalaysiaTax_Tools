/**
 * Real Property Gains Tax (RPGT) — Malaysia
 *
 * Verified against LHDN RPGT rate schedule (2025):
 *   https://www.hasil.gov.my/en/rpgt/real-property-gains-tax-rpgt-rates/
 *
 * Rates by disposer category and holding period (year of disposal):
 *
 *   Citizen / PR (individual):
 *     ≤3 yrs 30% · 4th yr 20% · 5th yr 15% · 6th yr+ 0%
 *   Company (incorporated in Malaysia):
 *     ≤3 yrs 30% · 4th yr 20% · 5th yr 15% · 6th yr+ 10%
 *   Non-citizen / foreigner / foreign company:
 *     ≤5 yrs 30% · 6th yr+ 10%
 *
 * Schedule 4 exemption (individuals only): the greater of RM10,000 or
 * 10% of the chargeable gain. A separate once-in-a-lifetime exemption
 * fully exempts the gain on a private residence (citizens/PR only).
 *
 * Self-assessment system since 1 Jan 2025: dispose → compute → e-file
 * via MyTax within 60 days of disposal.
 */

export type RpgtDisposerType = "citizen_pr" | "company" | "foreigner";

export interface RpgtInput {
  disposalPrice: number;       // selling price
  acquisitionPrice: number;    // original purchase price
  allowableExpenses: number;   // legal fees, agent commission, renovation, etc.
  disposerType: RpgtDisposerType;
  holdingYears: number;        // years between acquisition and disposal (may be fractional)
  onceInLifetimeExemption?: boolean; // private residence, individuals only
}

export interface RpgtResult {
  disposalPrice: number;
  acquisitionPrice: number;
  allowableExpenses: number;
  chargeableGain: number;       // before exemption (floored at 0)
  scheduleExemption: number;    // RM10k / 10% rule (individuals)
  onceInLifetimeApplied: boolean;
  netChargeableGain: number;    // after exemptions
  rate: number;                 // percentage applied
  holdingBracket: string;       // i18n key suffix: within3 | year4 | year5 | year6plus
  rpgtPayable: number;
}

interface RateRule {
  // upper bound (inclusive) of holding years for this bracket; Infinity for last
  maxYears: number;
  rate: number;
  bracket: string;
}

const RATE_TABLE: Record<RpgtDisposerType, RateRule[]> = {
  citizen_pr: [
    { maxYears: 3, rate: 0.3, bracket: "within3" },
    { maxYears: 4, rate: 0.2, bracket: "year4" },
    { maxYears: 5, rate: 0.15, bracket: "year5" },
    { maxYears: Infinity, rate: 0, bracket: "year6plus" },
  ],
  company: [
    { maxYears: 3, rate: 0.3, bracket: "within3" },
    { maxYears: 4, rate: 0.2, bracket: "year4" },
    { maxYears: 5, rate: 0.15, bracket: "year5" },
    { maxYears: Infinity, rate: 0.1, bracket: "year6plus" },
  ],
  foreigner: [
    { maxYears: 5, rate: 0.3, bracket: "within5" },
    { maxYears: Infinity, rate: 0.1, bracket: "year6plus" },
  ],
};

function resolveRate(type: RpgtDisposerType, holdingYears: number): RateRule {
  const table = RATE_TABLE[type];
  for (const rule of table) {
    if (holdingYears <= rule.maxYears) return rule;
  }
  return table[table.length - 1];
}

export function calculateRpgt(input: RpgtInput): RpgtResult {
  const disposalPrice = Math.max(0, input.disposalPrice);
  const acquisitionPrice = Math.max(0, input.acquisitionPrice);
  const allowableExpenses = Math.max(0, input.allowableExpenses);

  const chargeableGain = Math.max(
    0,
    disposalPrice - acquisitionPrice - allowableExpenses
  );

  const isIndividual = input.disposerType !== "company";

  // Once-in-a-lifetime full exemption (private residence, individuals only)
  const onceInLifetimeApplied =
    !!input.onceInLifetimeExemption && isIndividual && chargeableGain > 0;

  // Schedule 4 exemption: greater of RM10,000 or 10% of gain (individuals only)
  const scheduleExemption =
    isIndividual && !onceInLifetimeApplied
      ? Math.min(chargeableGain, Math.max(10000, chargeableGain * 0.1))
      : 0;

  const netChargeableGain = onceInLifetimeApplied
    ? 0
    : Math.max(0, chargeableGain - scheduleExemption);

  const rule = resolveRate(input.disposerType, input.holdingYears);
  const rpgtPayable = Math.round(netChargeableGain * rule.rate * 100) / 100;

  return {
    disposalPrice,
    acquisitionPrice,
    allowableExpenses,
    chargeableGain,
    scheduleExemption,
    onceInLifetimeApplied,
    netChargeableGain,
    rate: rule.rate * 100,
    holdingBracket: rule.bracket,
    rpgtPayable,
  };
}
