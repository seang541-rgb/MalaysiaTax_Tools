import { IncomeInput, ReliefClaim, TaxCalculationResult } from "./types";
import { calculatePersonalTax } from "./personal";
import { getReliefDefinitions } from "./tax-reliefs";

export interface SpouseTaxProfile {
  income: IncomeInput;
  reliefs: ReliefClaim[];
  zakatAmount: number;
  monthlyPcbPaid: number;
}

export interface JointAssessmentInput {
  yearOfAssessment: number;
  spouse1: SpouseTaxProfile;
  spouse2: SpouseTaxProfile;
}

export interface JointAssessmentComparison {
  separate: {
    spouse1: TaxCalculationResult;
    spouse2: TaxCalculationResult;
    totalTax: number;
  };
  joint: TaxCalculationResult;
  separateTax: number;
  jointTax: number;
  recommended: "separate" | "joint";
  /** Absolute tax difference between the two methods. */
  saving: number;
}

/** Tax liability of an assessment, excluding PCB (a prepayment, irrelevant here). */
function liabilityOf(result: TaxCalculationResult): number {
  return result.taxAfterRebateAndZakat + result.dividendTax;
}

function grossIncome(income: IncomeInput): number {
  return (
    income.employment +
    income.commission +
    income.rental +
    income.interest +
    income.dividend +
    income.other
  );
}

function combineIncome(a: IncomeInput, b: IncomeInput): IncomeInput {
  return {
    employment: a.employment + b.employment,
    commission: a.commission + b.commission,
    rental: a.rental + b.rental,
    interest: a.interest + b.interest,
    dividend: a.dividend + b.dividend,
    other: a.other + b.other,
  };
}

/**
 * Reliefs claimable by the assessed spouse under joint assessment.
 *
 * Both spouses' claims for the same relief are pooled and then capped at the
 * single statutory maximum — so a personal relief is never doubled, and shared
 * caps (lifestyle, EPF, etc.) behave as one pot. The RM4,000 spouse relief that
 * defines joint assessment is always granted.
 *
 * This is an approximation: real LHDN transfer rules are item-specific, but
 * pool-and-cap matches the common cases. The UI flags the result as an estimate.
 */
export function poolReliefsForJoint(
  reliefsA: ReliefClaim[],
  reliefsB: ReliefClaim[],
  yearOfAssessment: number
): ReliefClaim[] {
  const definitions = getReliefDefinitions(yearOfAssessment);
  const maxFor = (id: string) =>
    definitions.find((d) => d.id === id)?.maxAmount ?? Infinity;

  const pooled = new Map<string, number>();
  for (const claim of [...reliefsA, ...reliefsB]) {
    pooled.set(claim.reliefId, (pooled.get(claim.reliefId) ?? 0) + claim.amount);
  }

  // Joint assessment always grants the spouse relief at its statutory max.
  pooled.set("spouse", maxFor("spouse"));

  return Array.from(pooled, ([reliefId, amount]) => ({
    reliefId,
    amount: Math.min(amount, maxFor(reliefId)),
  }));
}

export function compareJointVsSeparate(
  input: JointAssessmentInput
): JointAssessmentComparison {
  const { yearOfAssessment, spouse1, spouse2 } = input;
  const spouse1Earns = grossIncome(spouse1.income) > 0;
  const spouse2Earns = grossIncome(spouse2.income) > 0;

  // ── Separate: each spouse assessed individually on their own income ──
  const sep1 = calculatePersonalTax({
    yearOfAssessment,
    income: spouse1.income,
    reliefs: spouse1.reliefs,
    maritalStatus: "married",
    spouseHasIncome: spouse2Earns,
    zakatAmount: spouse1.zakatAmount,
    monthlyPcbPaid: spouse1.monthlyPcbPaid,
  });
  const sep2 = calculatePersonalTax({
    yearOfAssessment,
    income: spouse2.income,
    reliefs: spouse2.reliefs,
    maritalStatus: "married",
    spouseHasIncome: spouse1Earns,
    zakatAmount: spouse2.zakatAmount,
    monthlyPcbPaid: spouse2.monthlyPcbPaid,
  });
  const separateTax = liabilityOf(sep1) + liabilityOf(sep2);

  // ── Joint: combined income under one spouse, pooled reliefs + spouse relief ──
  // The pool-and-cap model is symmetric, so whichever spouse is assessed yields
  // the same tax; one computation suffices.
  const joint = calculatePersonalTax({
    yearOfAssessment,
    income: combineIncome(spouse1.income, spouse2.income),
    reliefs: poolReliefsForJoint(
      spouse1.reliefs,
      spouse2.reliefs,
      yearOfAssessment
    ),
    maritalStatus: "married",
    spouseHasIncome: false,
    zakatAmount: spouse1.zakatAmount + spouse2.zakatAmount,
    monthlyPcbPaid: spouse1.monthlyPcbPaid + spouse2.monthlyPcbPaid,
  });
  const jointTax = liabilityOf(joint);

  return {
    separate: { spouse1: sep1, spouse2: sep2, totalTax: separateTax },
    joint,
    separateTax,
    jointTax,
    recommended: jointTax < separateTax ? "joint" : "separate",
    saving: Math.abs(separateTax - jointTax),
  };
}
