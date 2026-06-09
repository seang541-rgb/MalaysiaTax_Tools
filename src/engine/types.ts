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
  // SME disqualifiers (Income Tax Act s2A/s2B; foreign ownership rule from YA2024)
  isSubsidiaryOfLargeCompany?: boolean; // related to a company with paid-up capital > RM2.5M
  foreignOwnershipOver20Pct?: boolean;  // > 20% shares held by foreign companies / non-citizens
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
// Updated for the 1 July 2025 service tax scope expansion

export type ServiceTaxCategory =
  | "general"      // professional, IT, consulting, etc. — 8%, RM500k
  | "fnb"          // food & beverage — 6%, RM1.5M
  | "telecom"      // telecommunications — 6%, RM500k
  | "parking"      // vehicle parking — 6%, RM500k
  | "logistics"    // logistics — 6%, RM500k
  | "rental"       // rental/leasing (non-residential) — 8%, RM1M (new Jul 2025)
  | "construction" // construction (non-residential) — 6%, RM1.5M (new Jul 2025)
  | "financial"    // fee/commission-based financial services — 8%, RM1M (new Jul 2025)
  | "healthcare"   // private healthcare for non-citizens — 6%, RM1.5M (new Jul 2025)
  | "education";   // private education >RM60k/yr or non-citizen — 6%, no threshold (new Jul 2025)

export interface SstInput {
  taxableRevenue: number;       // annual taxable turnover
  taxType: "sales" | "service"; // sales tax or service tax
  salesTaxRate?: 5 | 10;        // sales tax: 5% or 10%
  serviceCategory?: ServiceTaxCategory; // defaults to "general"
}

export interface SstResult {
  taxableRevenue: number;
  isRegistrationRequired: boolean;
  taxType: "sales" | "service";
  serviceCategory?: ServiceTaxCategory;
  taxRate: number;               // percentage
  estimatedTax: number;          // annual
  monthlyTax: number;            // monthly estimate
  registrationThreshold: number; // category-dependent
}
