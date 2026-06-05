export interface TaxBand {
  min: number;
  max: number;
  rate: number;
}

export interface TaxBandResult {
  band: TaxBand;
  taxableInBand: number;
  taxForBand: number;
}

export interface ReliefDefinition {
  id: string;
  maxAmount: number;
  category: "personal" | "family" | "medical" | "education" | "lifestyle" | "contribution" | "housing";
}

export interface ReliefClaim {
  reliefId: string;
  amount: number;
}

export interface IncomeInput {
  employment: number;
  commission: number;
  rental: number;
  interest: number;
  dividend: number;
  other: number;
}

export interface TaxCalculationInput {
  yearOfAssessment: number;
  income: IncomeInput;
  reliefs: ReliefClaim[];
  maritalStatus: "single" | "married";
  spouseHasIncome: boolean;
  zakatAmount: number;
  monthlyPcbPaid: number;
}

export interface TaxCalculationResult {
  grossIncome: number;
  totalReliefs: number;
  chargeableIncome: number;
  bandBreakdown: TaxBandResult[];
  taxBeforeRebate: number;
  rebateAmount: number;
  zakatDeduction: number;
  taxAfterRebateAndZakat: number;
  totalPcbPaid: number;
  balanceTaxPayable: number;
}

export interface PcbEstimate {
  monthlyPcb: number;
  annualPcb: number;
  annualTax: number;
  difference: number;
}
