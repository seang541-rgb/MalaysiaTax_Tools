import { CorporateTaxResult } from "./types";
import { calculateCorporateTax } from "./corporate";

/**
 * Corporate tax computation worksheet (Malaysia)
 *
 * Converts accounting profit into chargeable income following the
 * standard tax computation order:
 *
 *   Profit before tax
 *   + non-deductible expenses (add-backs)
 *   − income not taxable as business income
 *   = Adjusted income (negative → current-year business loss)
 *   − capital allowances (restricted to adjusted income; excess c/f)
 *   = Statutory business income
 *   − unabsorbed business losses b/f (restricted; excess c/f, max 10 YAs)
 *   + other statutory income (rental, interest, etc.)
 *   = Aggregate income
 *   − current-year business loss (against aggregate income; excess c/f)
 *   − approved donations (capped at 10% of aggregate income)
 *   = Chargeable income → tax per SME/standard rates
 */

export interface AddBacks {
  depreciation: number;          // replaced by capital allowances
  provisions: number;            // general provisions (specific ones deductible)
  entertainmentDisallowed: number; // 50% non-deductible portion (or 100% non-client)
  finesPenalties: number;        // fines, penalties, compounds
  privateExpenses: number;       // private/domestic, not wholly & exclusively
  donationsInPnl: number;        // donations expensed in P&L (re-claimed separately)
  other: number;
}

export interface NonTaxableIncome {
  exemptDividends: number;       // single-tier dividends received
  capitalGains: number;          // gains on disposal not subject to income tax
  unrealisedForexGain: number;   // unrealised FX gains (trade: taxed when realised)
  other: number;
}

export interface TaxComputationInput {
  profitBeforeTax: number;
  addBacks: AddBacks;
  nonTaxableIncome: NonTaxableIncome;
  capitalAllowanceCurrent: number;
  capitalAllowanceBroughtForward: number;
  businessLossBroughtForward: number;
  otherIncome: number;           // rental, interest etc. (statutory, net)
  approvedDonations: number;     // to approved institutions (s44(6))
  // SME determination (same rules as corporate.ts)
  isSme: boolean;
  paidUpCapital: number;
  annualRevenue: number;
  isSubsidiaryOfLargeCompany?: boolean;
  foreignOwnershipOver20Pct?: boolean;
}

export interface TaxComputationResult {
  profitBeforeTax: number;
  totalAddBacks: number;
  totalNonTaxable: number;
  adjustedIncome: number;          // floored at 0
  currentYearLoss: number;         // 0 if adjusted income positive
  capitalAllowanceUsed: number;
  capitalAllowanceCarriedForward: number;
  statutoryBusinessIncome: number;
  lossBroughtForwardUsed: number;
  otherIncome: number;
  aggregateIncome: number;
  currentYearLossUsed: number;
  donationsAllowed: number;        // after 10% cap
  donationsDisallowed: number;     // portion above cap (lost, not c/f for companies)
  chargeableIncome: number;
  lossCarriedForward: number;      // unused b/f loss + unused current-year loss
  tax: CorporateTaxResult;
}

function sumAddBacks(a: AddBacks): number {
  return (
    a.depreciation +
    a.provisions +
    a.entertainmentDisallowed +
    a.finesPenalties +
    a.privateExpenses +
    a.donationsInPnl +
    a.other
  );
}

function sumNonTaxable(n: NonTaxableIncome): number {
  return n.exemptDividends + n.capitalGains + n.unrealisedForexGain + n.other;
}

export function calculateTaxComputation(
  input: TaxComputationInput
): TaxComputationResult {
  const totalAddBacks = sumAddBacks(input.addBacks);
  const totalNonTaxable = sumNonTaxable(input.nonTaxableIncome);

  const adjustedRaw = input.profitBeforeTax + totalAddBacks - totalNonTaxable;
  const adjustedIncome = Math.max(0, adjustedRaw);
  const currentYearLoss = Math.max(0, -adjustedRaw);

  // Capital allowances: restricted to adjusted income, excess carried forward
  const caAvailable =
    input.capitalAllowanceCurrent + input.capitalAllowanceBroughtForward;
  const capitalAllowanceUsed = Math.min(adjustedIncome, caAvailable);
  const capitalAllowanceCarriedForward = caAvailable - capitalAllowanceUsed;

  const statutoryBusinessIncome = adjustedIncome - capitalAllowanceUsed;

  // Unabsorbed business losses b/f: set off against statutory business income
  const lossBroughtForwardUsed = Math.min(
    statutoryBusinessIncome,
    Math.max(0, input.businessLossBroughtForward)
  );
  const statutoryAfterLoss = statutoryBusinessIncome - lossBroughtForwardUsed;

  const aggregateIncome = statutoryAfterLoss + Math.max(0, input.otherIncome);

  // Current-year business loss: set off against aggregate income
  const currentYearLossUsed = Math.min(aggregateIncome, currentYearLoss);
  const afterCurrentLoss = aggregateIncome - currentYearLossUsed;

  // Approved donations: capped at 10% of aggregate income (s44(6))
  const donationCap = aggregateIncome * 0.1;
  const donationsAllowed = Math.min(
    Math.max(0, input.approvedDonations),
    donationCap,
    afterCurrentLoss
  );
  const donationsDisallowed =
    Math.max(0, input.approvedDonations) - donationsAllowed;

  const chargeableIncome =
    Math.round((afterCurrentLoss - donationsAllowed) * 100) / 100;

  const lossCarriedForward =
    Math.max(0, input.businessLossBroughtForward) -
    lossBroughtForwardUsed +
    (currentYearLoss - currentYearLossUsed);

  const tax = calculateCorporateTax({
    yearOfAssessment: 2025,
    chargeableIncome,
    isSme: input.isSme,
    paidUpCapital: input.paidUpCapital,
    annualRevenue: input.annualRevenue,
    isSubsidiaryOfLargeCompany: input.isSubsidiaryOfLargeCompany,
    foreignOwnershipOver20Pct: input.foreignOwnershipOver20Pct,
  });

  return {
    profitBeforeTax: input.profitBeforeTax,
    totalAddBacks,
    totalNonTaxable,
    adjustedIncome,
    currentYearLoss,
    capitalAllowanceUsed,
    capitalAllowanceCarriedForward,
    statutoryBusinessIncome,
    lossBroughtForwardUsed,
    otherIncome: Math.max(0, input.otherIncome),
    aggregateIncome,
    currentYearLossUsed,
    donationsAllowed,
    donationsDisallowed,
    chargeableIncome,
    lossCarriedForward,
    tax,
  };
}
