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

// ─── Phase 2: Corporate Tax ───

export interface CorporateTaxBand {
  min: number;
  max: number;
  rate: number;
  label: string;
}

export interface CorporateTaxBandResult {
  band: CorporateTaxBand;
  taxableInBand: number;
  taxForBand: number;
}

export interface CorporateTaxInput {
  yearOfAssessment: number;
  chargeableIncome: number;
  isSme: boolean; // Qualifies for SME preferential rates
  paidUpCapital: number; // RM — SME if <= RM2.5M
  annualRevenue: number; // RM — SME if < RM50M
}

export interface CorporateTaxResult {
  chargeableIncome: number;
  isSmeQualified: boolean;
  bandBreakdown: CorporateTaxBandResult[];
  totalTax: number;
  effectiveRate: number; // percentage
}

// ─── Phase 2: Batch PCB ───

export interface BatchEmployeeInput {
  name: string;
  monthlyGrossSalary: number;
  maritalStatus: "single" | "married";
  spouseHasIncome: boolean;
  numberOfChildren: number;
}

export interface BatchPcbResult {
  employee: BatchEmployeeInput;
  monthlyPcb: number;
  annualPcb: number;
  annualTax: number;
}

export interface BatchPcbSummary {
  employees: BatchPcbResult[];
  totalMonthlyPcb: number;
  totalAnnualPcb: number;
  totalAnnualTax: number;
}
