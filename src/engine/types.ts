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

// ─── Phase 3: Employer Statutory Contributions (EPF/SOCSO/EIS) ───

export interface EmployerContributionInput {
  monthlyGrossSalary: number;
  employeeAge: "below60" | "60to65" | "above65"; // affects EPF rates
  isMalaysianOrPR: boolean; // non-citizens have different SOCSO/EIS rules
}

export interface EmployerContributionResult {
  employee: EmployerContributionInput;
  epfEmployer: number;   // monthly
  epfEmployee: number;   // monthly
  socsoEmployer: number; // monthly
  socsoEmployee: number; // monthly
  eisEmployer: number;   // monthly
  eisEmployee: number;   // monthly
  totalEmployer: number; // monthly total employer portion
  totalEmployee: number; // monthly total employee deduction
  totalCost: number;     // monthly salary + employer portion
}

export interface BatchContributionInput {
  name: string;
  monthlyGrossSalary: number;
  employeeAge: "below60" | "60to65" | "above65";
  isMalaysianOrPR: boolean;
}

export interface BatchContributionResult {
  employee: BatchContributionInput;
  contributions: EmployerContributionResult;
}

export interface BatchContributionSummary {
  employees: BatchContributionResult[];
  totalMonthlyEpfEmployer: number;
  totalMonthlySocsoEmployer: number;
  totalMonthlyEisEmployer: number;
  totalMonthlyEmployerCost: number;
  totalMonthlySalary: number;
  totalMonthlyTotalCost: number; // salary + all employer portions
}

// ─── Phase 3: SST (Sales & Service Tax) ───

export interface SstInput {
  taxableRevenue: number;       // annual taxable turnover
  taxType: "sales" | "service"; // sales tax or service tax
  salesTaxRate?: 5 | 10;        // sales tax: 5% or 10%
}

export interface SstResult {
  taxableRevenue: number;
  isRegistrationRequired: boolean; // threshold RM500k
  taxType: "sales" | "service";
  taxRate: number;               // percentage
  estimatedTax: number;          // annual
  monthlyTax: number;            // monthly estimate
  registrationThreshold: number; // RM500k
}
