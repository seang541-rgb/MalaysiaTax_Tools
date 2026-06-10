import { describe, it, expect } from "vitest";
import {
  calculateTaxComputation,
  TaxComputationInput,
} from "../../src/engine/tax-computation";

const ZERO_ADDBACKS = {
  depreciation: 0,
  provisions: 0,
  entertainmentDisallowed: 0,
  finesPenalties: 0,
  privateExpenses: 0,
  donationsInPnl: 0,
  other: 0,
};

const ZERO_NONTAXABLE = {
  exemptDividends: 0,
  capitalGains: 0,
  unrealisedForexGain: 0,
  other: 0,
};

function baseInput(overrides: Partial<TaxComputationInput> = {}): TaxComputationInput {
  return {
    profitBeforeTax: 0,
    addBacks: { ...ZERO_ADDBACKS },
    nonTaxableIncome: { ...ZERO_NONTAXABLE },
    capitalAllowanceCurrent: 0,
    capitalAllowanceBroughtForward: 0,
    businessLossBroughtForward: 0,
    otherIncome: 0,
    approvedDonations: 0,
    isSme: true,
    paidUpCapital: 1000000,
    annualRevenue: 5000000,
    ...overrides,
  };
}

describe("calculateTaxComputation", () => {
  it("passes profit straight through with no adjustments", () => {
    const r = calculateTaxComputation(baseInput({ profitBeforeTax: 500000 }));
    expect(r.adjustedIncome).toBe(500000);
    expect(r.statutoryBusinessIncome).toBe(500000);
    expect(r.aggregateIncome).toBe(500000);
    expect(r.chargeableIncome).toBe(500000);
    // SME: 150k×15% + 350k×17% = 22,500 + 59,500 = 82,000
    expect(r.tax.totalTax).toBe(82000);
  });

  it("adds back depreciation and deducts capital allowance", () => {
    const r = calculateTaxComputation(
      baseInput({
        profitBeforeTax: 400000,
        addBacks: { ...ZERO_ADDBACKS, depreciation: 100000 },
        capitalAllowanceCurrent: 140000,
      })
    );
    expect(r.adjustedIncome).toBe(500000);
    expect(r.capitalAllowanceUsed).toBe(140000);
    expect(r.statutoryBusinessIncome).toBe(360000);
    expect(r.chargeableIncome).toBe(360000);
  });

  it("excludes exempt dividends and capital gains from taxable income", () => {
    const r = calculateTaxComputation(
      baseInput({
        profitBeforeTax: 600000,
        nonTaxableIncome: {
          ...ZERO_NONTAXABLE,
          exemptDividends: 50000,
          capitalGains: 150000,
        },
      })
    );
    expect(r.adjustedIncome).toBe(400000);
    expect(r.chargeableIncome).toBe(400000);
  });

  it("restricts capital allowance to adjusted income and carries forward excess", () => {
    const r = calculateTaxComputation(
      baseInput({
        profitBeforeTax: 100000,
        capitalAllowanceCurrent: 80000,
        capitalAllowanceBroughtForward: 50000,
      })
    );
    expect(r.capitalAllowanceUsed).toBe(100000);
    expect(r.capitalAllowanceCarriedForward).toBe(30000);
    expect(r.statutoryBusinessIncome).toBe(0);
    expect(r.chargeableIncome).toBe(0);
    expect(r.tax.totalTax).toBe(0);
  });

  it("sets off brought-forward losses against statutory business income only", () => {
    const r = calculateTaxComputation(
      baseInput({
        profitBeforeTax: 200000,
        businessLossBroughtForward: 300000,
        otherIncome: 50000,
      })
    );
    expect(r.lossBroughtForwardUsed).toBe(200000);
    // other income is NOT shielded by b/f business loss
    expect(r.aggregateIncome).toBe(50000);
    expect(r.chargeableIncome).toBe(50000);
    expect(r.lossCarriedForward).toBe(100000);
  });

  it("treats negative adjusted income as current-year loss usable against other income", () => {
    const r = calculateTaxComputation(
      baseInput({
        profitBeforeTax: -150000,
        otherIncome: 100000,
      })
    );
    expect(r.adjustedIncome).toBe(0);
    expect(r.currentYearLoss).toBe(150000);
    expect(r.currentYearLossUsed).toBe(100000);
    expect(r.chargeableIncome).toBe(0);
    expect(r.lossCarriedForward).toBe(50000);
  });

  it("caps approved donations at 10% of aggregate income", () => {
    const r = calculateTaxComputation(
      baseInput({
        profitBeforeTax: 1000000,
        addBacks: { ...ZERO_ADDBACKS, donationsInPnl: 200000 },
        approvedDonations: 200000,
      })
    );
    expect(r.aggregateIncome).toBe(1200000);
    expect(r.donationsAllowed).toBe(120000);
    expect(r.donationsDisallowed).toBe(80000);
    expect(r.chargeableIncome).toBe(1080000);
  });

  it("computes a full worksheet end to end", () => {
    const r = calculateTaxComputation(
      baseInput({
        profitBeforeTax: 800000,
        addBacks: {
          depreciation: 120000,
          provisions: 30000,
          entertainmentDisallowed: 10000,
          finesPenalties: 5000,
          privateExpenses: 15000,
          donationsInPnl: 20000,
          other: 0,
        },
        nonTaxableIncome: { ...ZERO_NONTAXABLE, exemptDividends: 40000 },
        capitalAllowanceCurrent: 150000,
        businessLossBroughtForward: 100000,
        otherIncome: 60000,
        approvedDonations: 20000,
      })
    );
    // 800k + 200k − 40k = 960k adjusted
    expect(r.adjustedIncome).toBe(960000);
    // 960k − 150k CA = 810k statutory
    expect(r.statutoryBusinessIncome).toBe(810000);
    // 810k − 100k loss b/f = 710k; + 60k other = 770k aggregate
    expect(r.aggregateIncome).toBe(770000);
    // donations 20k < 77k cap → fully allowed
    expect(r.donationsAllowed).toBe(20000);
    expect(r.chargeableIncome).toBe(750000);
    // SME: 22,500 + 76,500 + 150k×24% = 135,000
    expect(r.tax.totalTax).toBe(135000);
    expect(r.tax.isSmeQualified).toBe(true);
  });

  it("uses standard 24% rate when SME disqualified by foreign ownership", () => {
    const r = calculateTaxComputation(
      baseInput({
        profitBeforeTax: 500000,
        foreignOwnershipOver20Pct: true,
      })
    );
    expect(r.tax.isSmeQualified).toBe(false);
    expect(r.tax.totalTax).toBe(120000);
  });

  it("never produces negative chargeable income", () => {
    const r = calculateTaxComputation(
      baseInput({
        profitBeforeTax: 50000,
        businessLossBroughtForward: 500000,
        approvedDonations: 100000,
      })
    );
    expect(r.chargeableIncome).toBe(0);
    expect(r.lossCarriedForward).toBe(450000);
  });
});
