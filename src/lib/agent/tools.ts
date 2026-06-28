import { checkEInvoicePhase } from "@/engine/e-invoice";
import { calculateBatchPcb } from "@/engine/batch-pcb";
import {
  calculateCapitalAllowance,
  type CapitalAssetType,
} from "@/engine/capital-allowance";
import { calculateCorporateTax } from "@/engine/corporate";
import { calculateCp204 } from "@/engine/cp204";
import { calculateEmployerContributions } from "@/engine/employer-contributions";
import { compareJointVsSeparate } from "@/engine/joint-assessment";
import { calculatePersonalTax } from "@/engine/personal";
import { estimateMonthlyPcb } from "@/engine/pcb";
import { calculateRpgt, type RpgtDisposerType } from "@/engine/rpgt";
import { calculateSoleProprietorTax } from "@/engine/sole-proprietor";
import { calculateStampDuty, type StampBuyerType } from "@/engine/stamp-duty";
import { calculateSst } from "@/engine/sst";
import { calculateTaxComputation } from "@/engine/tax-computation";
import {
  calculateWithholdingTax,
  type WhtPaymentType,
} from "@/engine/withholding-tax";
import type {
  BatchEmployeeInput,
  EmployerContributionInput,
  IncomeInput,
  ReliefClaim,
  TaxCalculationInput,
} from "@/engine/types";
import type { AgentContextResult, AgentToolName } from "./types";
import {
  extractIncomeAmount,
  extractMoneyAmount,
  inferServiceTaxCategory,
  inferSstTaxType,
} from "./slots";

export { extractMoneyAmount } from "./slots";

const emptyResult: AgentContextResult = {
  toolName: null,
  context: "",
  needsFollowUp: false,
  followUpQuestion: null,
  missingFields: [],
  usedDeterministic: false,
};

function formatRM(amount: number): string {
  return `RM${amount.toLocaleString("en-MY", {
    maximumFractionDigits: 2,
  })}`;
}

function exactContext(title: string, lines: string[]): string {
  return [
    "",
    "",
    `--- EXACT MYTAX FACTS (${title}) ---`,
    ...lines,
    "--- END EXACT MYTAX FACTS ---",
    "IMPORTANT: Use these exact facts. Do not contradict them.",
  ].join("\n");
}

function followUpContext(question: string): string {
  return [
    "",
    "",
    "--- FOLLOW-UP REQUIRED ---",
    question,
    "--- END FOLLOW-UP REQUIRED ---",
    "IMPORTANT: Ask this one follow-up question before giving a tax calculation.",
  ].join("\n");
}

export function detectAgentTool(message: string): AgentToolName | null {
  const lower = message.toLowerCase();

  if (/e-?invoice|myinvois/.test(lower)) {
    return "e_invoice_phase_checker";
  }

  if (/sst|sales tax|service tax|cukai jualan|cukai perkhidmatan/.test(lower)) {
    return "sst_checker";
  }

  if (
    /joint\s+assessment|separate\s+assessment|joint\s+vs\s+separate|spouse\s+1|spouse\s+2|husband.*wife|wife.*husband/.test(
      lower
    )
  ) {
    return "joint_assessment_calculator";
  }

  if (
    /batch|payroll|multiple\s+employees|employee\s+list|staff\s+list/.test(
      lower
    ) &&
    /pcb|mtd|monthly\s+tax\s+deduction|potongan\s+cukai\s+bulanan/.test(lower)
  ) {
    return "batch_pcb_calculator";
  }

  if (
    /pcb|mtd|monthly\s+tax\s+deduction|potongan\s+cukai\s+bulanan|monthly\s+deduction|预扣税|每月扣税/.test(
      lower
    )
  ) {
    return "pcb_calculator";
  }

  if (
    /employer\s+contribution|employer\s+cost|statutory\s+contribution|epf|kwsp|socso|perkeso|eis|sip|公积金|社险|就业保险/.test(
      lower
    )
  ) {
    return "employer_contribution_calculator";
  }

  if (
    /stamp\s+duty|mot\b|memorandum\s+of\s+transfer|loan\s+agreement\s+duty|property\s+price|buying\s+(?:a\s+)?(?:house|property)|buy\s+(?:a\s+)?(?:house|property)/.test(
      lower
    )
  ) {
    return "stamp_duty_calculator";
  }

  if (
    /withholding\s+tax|\bwht\b|non[-\s]?resident|royalt(?:y|ies)|technical\s+fee|contract\s+payment|public\s+entertainer|dta\s+rate/.test(
      lower
    )
  ) {
    return "withholding_tax_calculator";
  }

  if (/cp204|cp204a|cp207|estimated\s+tax|tax\s+estimate/.test(lower)) {
    return "cp204_calculator";
  }

  if (
    /tax\s+computation|profit\s+before\s+tax|\bpbt\b|chargeable\s+income\s+worksheet/.test(
      lower
    )
  ) {
    return "tax_computation_calculator";
  }

  if (
    /sole\s+proprietor|sole\s+proprietorship|self[-\s]?employed|business\s+revenue|business\s+income|form\s+b/.test(
      lower
    )
  ) {
    return "sole_proprietor_tax_calculator";
  }

  if (
    /capital\s+allowance|allowance\s+schedule|qualifying\s+expenditure|asset\s+cost|ict\s+equipment|motor\s+vehicle|plant\s+(?:and|&)\s+machinery|industrial\s+building/.test(
      lower
    )
  ) {
    return "capital_allowance_calculator";
  }

  if (
    /rpgt|real\s+property\s+gains\s+tax|property\s+gains\s+tax|sold\s+(?:a\s+)?property|sell\s+(?:a\s+)?property|selling\s+(?:my\s+)?property|dispose\s+(?:of\s+)?property|disposal\s+price/.test(
      lower
    )
  ) {
    return "rpgt_calculator";
  }

  if (
    /company|corporate|sdn\.?\s?bhd|cukai korporat|company tax|corporate tax|chargeable income|sme/.test(
      lower
    )
  ) {
    return "corporate_tax_calculator";
  }

  const personalSignal =
    /personal|individual|income tax|salary|monthly|gaji|pendapatan|tax payable|how much tax/.test(
      lower
    );
  const otherToolSignal =
    /company|corporate|sdn|sst|sales tax|service tax|e-?invoice|myinvois|rpgt|property|employer|epf|socso|eis|cp204|sole proprietor|self[- ]?employed/.test(
      lower
    );

  if (personalSignal && !otherToolSignal) {
    return "personal_tax_calculator";
  }

  return null;
}

function extractMoneyAfter(message: string, labelPattern: string): number | null {
  const normalized = message.replace(/,/g, "").replace(/\s+/g, " ");
  const match = normalized.match(
    new RegExp(
      `(?:${labelPattern})[^0-9]*(?:RM|rm)?\\s*(\\d+(?:\\.\\d+)?)\\s*(million|juta|m\\b|k\\b|K\\b|ribu)?`,
      "i"
    )
  );
  if (!match) return null;

  let amount = Number.parseFloat(match[1]);
  const suffix = match[2]?.toLowerCase();
  if (suffix === "million" || suffix === "juta" || suffix === "m") {
    amount *= 1_000_000;
  } else if (suffix === "k" || suffix === "ribu") {
    amount *= 1_000;
  }

  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function extractChargeableIncome(message: string): number | null {
  return (
    extractMoneyAfter(message, "chargeable\\s+income|taxable\\s+income") ??
    extractMoneyAmount(message)
  );
}

function extractPaidUpCapital(message: string): number | null {
  return extractMoneyAfter(
    message,
    "paid[-\\s]?up\\s+capital|modal\\s+berbayar|share\\s+capital"
  );
}

function extractAnnualRevenue(message: string): number | null {
  return extractMoneyAfter(
    message,
    "annual\\s+revenue|revenue|turnover|sales|hasil"
  );
}

function extractDisposalPrice(message: string): number | null {
  return extractMoneyAfter(
    message,
    "disposal\\s+price|selling\\s+price|sale\\s+price|sold\\s+(?:a\\s+)?property\\s+for|sold\\s+for"
  );
}

function extractAcquisitionPrice(message: string): number | null {
  return extractMoneyAfter(
    message,
    "acquisition\\s+price|purchase\\s+price|bought\\s+(?:a\\s+)?property\\s+for|bought\\s+for|original\\s+purchase\\s+price"
  );
}

function extractAllowableExpenses(message: string): number {
  return (
    extractMoneyAfter(
      message,
      "allowable\\s+expenses|expenses|legal\\s+fees|renovation|agent\\s+commission"
    ) ?? 0
  );
}

function extractHoldingYears(message: string): number | null {
  const normalized = message.replace(/,/g, "").replace(/\s+/g, " ");
  const match = normalized.match(
    /(?:held|holding|owned|hold)\s*(?:for)?\s*(\d+(?:\.\d+)?)\s*(?:years?|yrs?)/i
  );
  if (!match) return null;

  const years = Number.parseFloat(match[1]);
  return Number.isFinite(years) && years >= 0 ? years : null;
}

function inferRpgtDisposerType(message: string): RpgtDisposerType {
  const lower = message.toLowerCase();
  if (/company|sdn\.?\s?bhd|corporate|incorporated/.test(lower)) {
    return "company";
  }
  if (/foreign|foreigner|non[-\s]?citizen|non[-\s]?resident/.test(lower)) {
    return "foreigner";
  }
  return "citizen_pr";
}

function extractPropertyPrice(message: string): number | null {
  return (
    extractMoneyAfter(
      message,
      "property\\s+price|property\\s+value|market\\s+value|purchase\\s+price|buying\\s+(?:a\\s+)?(?:house|property)\\s+for|buy\\s+(?:a\\s+)?(?:house|property)\\s+for"
    ) ?? extractMoneyAmount(message)
  );
}

function extractLoanAmount(message: string): number {
  return (
    extractMoneyAfter(
      message,
      "loan\\s+amount|loan|mortgage|financing\\s+amount"
    ) ?? 0
  );
}

function inferStampBuyerType(message: string): StampBuyerType {
  return /foreign|foreigner|non[-\s]?citizen|non[-\s]?resident/.test(
    message.toLowerCase()
  )
    ? "foreigner"
    : "citizen_pr";
}

function inferFirstTimeBuyer(message: string): boolean {
  return /first[-\s]?time|first\s+home|first\s+house|first\s+property|rumah\s+pertama/.test(
    message.toLowerCase()
  );
}

function extractGrossPaymentAmount(message: string): number | null {
  return (
    extractMoneyAfter(
      message,
      "gross\\s+amount|gross\\s+payment|payment\\s+amount|payment|amount"
    ) ?? extractMoneyAmount(message)
  );
}

function extractDtaRate(message: string): number | undefined {
  const match = message.match(
    /(?:dta|treaty)\s+rate[^0-9]*(\d+(?:\.\d+)?)\s*%?/i
  );
  if (!match) return undefined;

  const rate = Number.parseFloat(match[1]);
  return Number.isFinite(rate) && rate >= 0 ? rate : undefined;
}

function inferWhtPaymentType(message: string): WhtPaymentType | null {
  const lower = message.toLowerCase();
  if (/interest/.test(lower)) return "interest";
  if (/royalt(?:y|ies)/.test(lower)) return "royalty";
  if (/contract/.test(lower)) return "contract";
  if (/public\s+entertainer|entertainer/.test(lower)) {
    return "public_entertainer";
  }
  if (/technical|advisory|special\s+class|s4a|section\s+4a/.test(lower)) {
    return "special_4a";
  }
  if (/section\s+4f|4\(f\)|other\s+gain/.test(lower)) return "other_4f";
  return null;
}

function extractEstimatedTax(message: string): number | null {
  return extractMoneyAfter(
    message,
    "estimated\\s+tax|tax\\s+estimate|cp204"
  );
}

function extractPriorYearEstimate(message: string): number | undefined {
  return (
    extractMoneyAfter(
      message,
      "prior\\s+year\\s+estimate|previous\\s+year\\s+estimate|last\\s+year\\s+estimate"
    ) ?? undefined
  );
}

function extractActualTax(message: string): number | undefined {
  return extractMoneyAfter(message, "actual\\s+tax|final\\s+tax") ?? undefined;
}

function extractBasisPeriodMonths(message: string): number | undefined {
  const match = message.match(
    /(?:basis\s+period|period)\s*(?:of|is|=)?\s*(\d+)\s*months?/i
  );
  if (!match) return undefined;

  const months = Number.parseInt(match[1], 10);
  return Number.isFinite(months) && months > 0 ? months : undefined;
}

function extractAssetCost(message: string): number | null {
  return (
    extractMoneyAfter(
      message,
      "asset\\s+cost|cost|purchase\\s+cost|qualifying\\s+expenditure"
    ) ?? extractMoneyAmount(message)
  );
}

function inferCapitalAssetType(message: string): CapitalAssetType {
  const lower = message.toLowerCase();
  if (/ict|computer|software|laptop|equipment/.test(lower)) return "ict";
  if (/motor\s+vehicle|car|vehicle/.test(lower)) return "motor_vehicle";
  if (/small\s+value|low\s+value/.test(lower)) return "small_value";
  if (/office|furniture|fixture/.test(lower)) return "office";
  if (/industrial\s+building|factory\s+building/.test(lower)) {
    return "industrial_building";
  }
  if (/heavy\s+machinery/.test(lower)) return "heavy_machinery";
  return "general_pm";
}

function inferNewVehicleUnder150k(message: string): boolean {
  return /new\s+(?:motor\s+)?vehicle|new\s+car|under\s+rm?150k|below\s+rm?150k|<=\s*rm?150k/.test(
    message.toLowerCase()
  );
}

function extractBusinessRevenue(message: string): number | null {
  return extractMoneyAfter(
    message,
    "business\\s+revenue|business\\s+income|revenue|sales|turnover"
  );
}

function extractBusinessExpenses(message: string): number {
  return (
    extractMoneyAfter(
      message,
      "business\\s+expenses|allowable\\s+expenses|expenses|costs"
    ) ?? 0
  );
}

function extractCapitalAllowanceAmount(message: string): number {
  return extractMoneyAfter(message, "capital\\s+allowance") ?? 0;
}

function extractOtherIncome(message: string): number {
  return extractMoneyAfter(message, "other\\s+income") ?? 0;
}

function extractTotalReliefs(message: string): number {
  return extractMoneyAfter(message, "total\\s+reliefs|reliefs") ?? 9_000;
}

function extractZakatAmount(message: string): number {
  return extractMoneyAfter(message, "zakat") ?? 0;
}

function extractProfitBeforeTax(message: string): number | null {
  return extractMoneyAfter(
    message,
    "profit\\s+before\\s+tax|pbt|accounting\\s+profit"
  );
}

function extractDepreciation(message: string): number {
  return extractMoneyAfter(message, "depreciation") ?? 0;
}

function extractNonTaxableIncome(message: string): number {
  return (
    extractMoneyAfter(
      message,
      "non[-\\s]?taxable\\s+income|exempt\\s+dividends|capital\\s+gains"
    ) ?? 0
  );
}

function extractBusinessLossBroughtForward(message: string): number {
  return (
    extractMoneyAfter(
      message,
      "business\\s+loss\\s+brought\\s+forward|loss\\s+brought\\s+forward"
    ) ?? 0
  );
}

function extractApprovedDonations(message: string): number {
  return extractMoneyAfter(message, "approved\\s+donations|donations") ?? 0;
}

function extractMonthlyGrossSalary(message: string): number | null {
  return (
    extractMoneyAfter(
      message,
      "monthly\\s+gross\\s+salary|gross\\s+salary|monthly\\s+salary|monthly\\s+wage|salary|wage|gaji"
    ) ?? extractMoneyAmount(message)
  );
}

function inferEmployeeAgeBand(
  message: string
): EmployerContributionInput["employeeAge"] {
  const lower = message.toLowerCase();
  if (/above\s+65|over\s+65|older\s+than\s+65|65\+/.test(lower)) {
    return "above65";
  }
  if (/60\s*(?:to|-|and)\s*65|age\s+6[0-5]|aged\s+6[0-5]/.test(lower)) {
    return "60to65";
  }
  return "below60";
}

function inferMalaysianOrPr(message: string): boolean {
  return !/non[-\s]?malaysian|not\s+malaysian|foreign|expatriate|foreigner/.test(
    message.toLowerCase()
  );
}

function inferMaritalStatus(message: string): TaxCalculationInput["maritalStatus"] {
  return /married|spouse|wife|husband|berkahwin|已婚/.test(
    message.toLowerCase()
  )
    ? "married"
    : "single";
}

function inferSpouseHasIncome(message: string): boolean {
  const lower = message.toLowerCase();
  if (
    /spouse\s+(?:no|without|zero)\s+income|non[-\s]?working\s+spouse|wife\s+(?:no|without|zero)\s+income|husband\s+(?:no|without|zero)\s+income|配偶无收入/.test(
      lower
    )
  ) {
    return false;
  }
  return true;
}

function inferNumberOfChildren(message: string): number {
  const lower = message.toLowerCase();
  const childMatch = lower.match(/(\d+)\s*(?:children|child|kids|anak|子女|孩子)/);
  if (!childMatch) return 0;

  const count = Number.parseInt(childMatch[1], 10);
  return Number.isFinite(count) && count > 0 ? Math.min(count, 20) : 0;
}

function buildPcbContext(message: string): AgentContextResult {
  const lower = message.toLowerCase();
  const salaryLooksAnnual =
    /annual\s+salary|yearly\s+salary|per\s+year|setahun/.test(lower) &&
    !/monthly|per\s+month|bulan/.test(lower);
  const monthlyGrossSalary = salaryLooksAnnual
    ? null
    : extractMonthlyGrossSalary(message);

  if (monthlyGrossSalary === null) {
    const question =
      "What is the employee's monthly gross salary in RM for the PCB estimate?";
    return {
      ...emptyResult,
      toolName: "pcb_calculator",
      context: followUpContext(question),
      needsFollowUp: true,
      followUpQuestion: question,
      missingFields: [{ field: "monthlyGrossSalary", question }],
    };
  }

  const maritalStatus = inferMaritalStatus(message);
  const spouseHasIncome =
    maritalStatus === "married" ? inferSpouseHasIncome(message) : true;
  const numberOfChildren = inferNumberOfChildren(message);
  const result = estimateMonthlyPcb({
    yearOfAssessment: 2025,
    monthlyGrossSalary,
    maritalStatus,
    spouseHasIncome,
    numberOfChildren,
  });

  return {
    ...emptyResult,
    toolName: "pcb_calculator",
    context: exactContext("PCB monthly tax deduction (YA2025)", [
      `Monthly gross salary: ${formatRM(monthlyGrossSalary)}.`,
      `Marital status: ${maritalStatus}.`,
      `Spouse has income: ${spouseHasIncome ? "yes" : "no"}.`,
      `Children under 18: ${numberOfChildren}.`,
      `Monthly PCB: ${formatRM(result.monthlyPcb)}.`,
      `Annual PCB: ${formatRM(result.annualPcb)}.`,
      `Annual tax: ${formatRM(result.annualTax)}.`,
      `Rounding difference: ${formatRM(result.difference)}.`,
    ]),
    usedDeterministic: true,
  };
}

function annualEmploymentIncome(amount: number): IncomeInput {
  return {
    employment: amount,
    commission: 0,
    rental: 0,
    interest: 0,
    dividend: 0,
    other: 0,
  };
}

function extractSpouseAnnualIncome(
  message: string,
  spouseNumber: 1 | 2
): number | null {
  const spouseLabel =
    spouseNumber === 1
      ? "spouse\\s*(?:1|one)|husband|wife\\s*1"
      : "spouse\\s*(?:2|two)|wife|husband\\s*2";

  return extractMoneyAfter(
    message,
    `${spouseLabel}\\s*(?:annual\\s+)?(?:income|salary|employment\\s+income)`
  );
}

function buildJointAssessmentContext(message: string): AgentContextResult {
  const spouse1Income = extractSpouseAnnualIncome(message, 1);
  const spouse2Income = extractSpouseAnnualIncome(message, 2);

  if (spouse1Income === null || spouse2Income === null) {
    const question =
      "What are spouse 1 and spouse 2 annual income amounts in RM for the joint assessment comparison?";
    return {
      ...emptyResult,
      toolName: "joint_assessment_calculator",
      context: followUpContext(question),
      needsFollowUp: true,
      followUpQuestion: question,
      missingFields: [
        ...(spouse1Income === null
          ? [{ field: "spouse1AnnualIncome", question }]
          : []),
        ...(spouse2Income === null
          ? [{ field: "spouse2AnnualIncome", question }]
          : []),
      ],
    };
  }

  const basicReliefs: ReliefClaim[] = [
    { reliefId: "individual", amount: 9_000 },
  ];
  const result = compareJointVsSeparate({
    yearOfAssessment: 2025,
    spouse1: {
      income: annualEmploymentIncome(spouse1Income),
      reliefs: basicReliefs,
      zakatAmount: 0,
      monthlyPcbPaid: 0,
    },
    spouse2: {
      income: annualEmploymentIncome(spouse2Income),
      reliefs: basicReliefs,
      zakatAmount: 0,
      monthlyPcbPaid: 0,
    },
  });

  return {
    ...emptyResult,
    toolName: "joint_assessment_calculator",
    context: exactContext("Joint vs separate assessment (YA2025)", [
      `Spouse 1 annual income: ${formatRM(spouse1Income)}.`,
      `Spouse 2 annual income: ${formatRM(spouse2Income)}.`,
      "Assumptions: Malaysian tax resident spouses, employment income only, individual relief RM9,000 each, no zakat, no PCB offsets.",
      `Spouse 1 separate tax: ${formatRM(result.separate.spouse1.taxAfterRebateAndZakat + result.separate.spouse1.dividendTax)}.`,
      `Spouse 2 separate tax: ${formatRM(result.separate.spouse2.taxAfterRebateAndZakat + result.separate.spouse2.dividendTax)}.`,
      `Separate assessment tax: ${formatRM(result.separateTax)}.`,
      `Joint assessment tax: ${formatRM(result.jointTax)}.`,
      `Recommended assessment: ${result.recommended}.`,
      `Tax difference: ${formatRM(result.saving)}.`,
    ]),
    usedDeterministic: true,
  };
}

function parseBatchPcbEmployees(message: string): BatchEmployeeInput[] {
  return message
    .split(/[;\n,]+/)
    .map((rawSegment, index) => {
      const segment = rawSegment.includes(":")
        ? rawSegment.slice(rawSegment.lastIndexOf(":") + 1)
        : rawSegment;
      const monthlyGrossSalary = extractMonthlyGrossSalary(segment);
      if (monthlyGrossSalary === null) return null;

      const nameMatch = segment.match(
        /^\s*([A-Za-z][A-Za-z .'-]{0,40}?)\s+(?:monthly|gross|salary|wage|gaji)/i
      );
      const name =
        nameMatch?.[1]?.trim().replace(/\s+/g, " ") || `Employee ${index + 1}`;
      const maritalStatus = inferMaritalStatus(segment);

      return {
        name,
        monthlyGrossSalary,
        maritalStatus,
        spouseHasIncome:
          maritalStatus === "married" ? inferSpouseHasIncome(segment) : true,
        numberOfChildren: inferNumberOfChildren(segment),
      };
    })
    .filter((employee): employee is BatchEmployeeInput => employee !== null);
}

function buildBatchPcbContext(message: string): AgentContextResult {
  const employees = parseBatchPcbEmployees(message);

  if (employees.length === 0) {
    const question =
      "What are the employee names and monthly gross salaries in RM for the batch PCB calculation?";
    return {
      ...emptyResult,
      toolName: "batch_pcb_calculator",
      context: followUpContext(question),
      needsFollowUp: true,
      followUpQuestion: question,
      missingFields: [{ field: "employees", question }],
    };
  }

  const result = calculateBatchPcb(2025, employees);
  const employeeLines = result.employees.map(
    ({ employee, monthlyPcb, annualPcb, annualTax }) =>
      `${employee.name}: monthly salary ${formatRM(employee.monthlyGrossSalary)}, monthly PCB ${formatRM(monthlyPcb)}, annual PCB ${formatRM(annualPcb)}, annual tax ${formatRM(annualTax)}.`
  );

  return {
    ...emptyResult,
    toolName: "batch_pcb_calculator",
    context: exactContext("Batch PCB payroll summary (YA2025)", [
      `Employee count: ${result.employees.length}.`,
      ...employeeLines,
      `Total monthly PCB: ${formatRM(result.totalMonthlyPcb)}.`,
      `Total annual PCB: ${formatRM(result.totalAnnualPcb)}.`,
      `Total annual tax: ${formatRM(result.totalAnnualTax)}.`,
    ]),
    usedDeterministic: true,
  };
}

function buildEmployerContributionContext(message: string): AgentContextResult {
  const lower = message.toLowerCase();
  const salaryLooksAnnual =
    /annual\s+salary|yearly\s+salary|per\s+year|setahun/.test(lower) &&
    !/monthly|per\s+month|bulan/.test(lower);
  const monthlyGrossSalary = salaryLooksAnnual
    ? null
    : extractMonthlyGrossSalary(message);

  if (monthlyGrossSalary === null) {
    const question =
      "What is the employee's monthly gross salary in RM for the employer contribution calculation?";
    return {
      ...emptyResult,
      toolName: "employer_contribution_calculator",
      context: followUpContext(question),
      needsFollowUp: true,
      followUpQuestion: question,
      missingFields: [{ field: "monthlyGrossSalary", question }],
    };
  }

  const employeeAge = inferEmployeeAgeBand(message);
  const isMalaysianOrPR = inferMalaysianOrPr(message);
  const result = calculateEmployerContributions({
    monthlyGrossSalary,
    employeeAge,
    isMalaysianOrPR,
  });

  return {
    ...emptyResult,
    toolName: "employer_contribution_calculator",
    context: exactContext("Employer statutory contributions (monthly)", [
      `Monthly gross salary: ${formatRM(result.employee.monthlyGrossSalary)}.`,
      `Employee age band: ${employeeAge}.`,
      `Malaysian/PR: ${isMalaysianOrPR ? "yes" : "no"}.`,
      `EPF employer: ${formatRM(result.epfEmployer)}.`,
      `EPF employee: ${formatRM(result.epfEmployee)}.`,
      `SOCSO employer: ${formatRM(result.socsoEmployer)}.`,
      `SOCSO employee: ${formatRM(result.socsoEmployee)}.`,
      `EIS employer: ${formatRM(result.eisEmployer)}.`,
      `EIS employee: ${formatRM(result.eisEmployee)}.`,
      `Total employer portion: ${formatRM(result.totalEmployer)}.`,
      `Total employee deductions: ${formatRM(result.totalEmployee)}.`,
      `Total employer cost: ${formatRM(result.totalCost)}.`,
    ]),
    usedDeterministic: true,
  };
}

function formatCorporateBandBreakdown(
  result: ReturnType<typeof calculateCorporateTax>
): string[] {
  return result.bandBreakdown.map((bandResult) => {
    const bandMax =
      bandResult.band.max === Infinity ? "above" : formatRM(bandResult.band.max);
    return `Band ${bandResult.band.label}: ${formatRM(bandResult.taxableInBand)} taxed at ${bandResult.band.rate * 100}% (${bandMax}) = ${formatRM(bandResult.taxForBand)}.`;
  });
}

function buildRpgtContext(message: string): AgentContextResult {
  const disposalPrice = extractDisposalPrice(message);
  const acquisitionPrice = extractAcquisitionPrice(message);
  const holdingYears = extractHoldingYears(message);

  if (
    disposalPrice === null ||
    acquisitionPrice === null ||
    holdingYears === null
  ) {
    const question =
      "What are the disposal price, acquisition price, and holding period in years for the RPGT estimate?";
    return {
      ...emptyResult,
      toolName: "rpgt_calculator",
      context: followUpContext(question),
      needsFollowUp: true,
      followUpQuestion: question,
      missingFields: [
        ...(disposalPrice === null
          ? [{ field: "disposalPrice", question }]
          : []),
        ...(acquisitionPrice === null
          ? [{ field: "acquisitionPrice", question }]
          : []),
        ...(holdingYears === null ? [{ field: "holdingYears", question }] : []),
      ],
    };
  }

  const disposerType = inferRpgtDisposerType(message);
  const result = calculateRpgt({
    disposalPrice,
    acquisitionPrice,
    allowableExpenses: extractAllowableExpenses(message),
    disposerType,
    holdingYears,
    onceInLifetimeExemption:
      /once[-\s]in[-\s]a[-\s]lifetime|private\s+residence\s+exemption/.test(
        message.toLowerCase()
      ),
  });

  return {
    ...emptyResult,
    toolName: "rpgt_calculator",
    context: exactContext("RPGT property disposal (YA2025)", [
      `Disposer type: ${disposerType}.`,
      `Disposal price: ${formatRM(result.disposalPrice)}.`,
      `Acquisition price: ${formatRM(result.acquisitionPrice)}.`,
      `Allowable expenses: ${formatRM(result.allowableExpenses)}.`,
      `Holding period: ${holdingYears} years.`,
      `Holding bracket: ${result.holdingBracket}.`,
      `Chargeable gain: ${formatRM(result.chargeableGain)}.`,
      `Schedule 4 exemption: ${formatRM(result.scheduleExemption)}.`,
      `Once-in-a-lifetime exemption applied: ${result.onceInLifetimeApplied ? "yes" : "no"}.`,
      `Net chargeable gain: ${formatRM(result.netChargeableGain)}.`,
      `RPGT rate: ${result.rate}%.`,
      `RPGT payable: ${formatRM(result.rpgtPayable)}.`,
    ]),
    usedDeterministic: true,
  };
}

function buildStampDutyContext(message: string): AgentContextResult {
  const propertyPrice = extractPropertyPrice(message);

  if (propertyPrice === null) {
    const question =
      "What is the property price or market value in RM for the stamp duty estimate?";
    return {
      ...emptyResult,
      toolName: "stamp_duty_calculator",
      context: followUpContext(question),
      needsFollowUp: true,
      followUpQuestion: question,
      missingFields: [{ field: "propertyPrice", question }],
    };
  }

  const buyerType = inferStampBuyerType(message);
  const loanAmount = extractLoanAmount(message);
  const firstTimeBuyer = inferFirstTimeBuyer(message);
  const result = calculateStampDuty({
    propertyPrice,
    buyerType,
    loanAmount,
    firstTimeBuyer,
  });

  const tierLines = result.motTiers.map((tier) => {
    const upper = tier.to === Infinity ? "above" : formatRM(tier.to);
    return `MOT tier ${formatRM(tier.from)}-${upper}: ${tier.rate}% = ${formatRM(tier.duty)}.`;
  });

  return {
    ...emptyResult,
    toolName: "stamp_duty_calculator",
    context: exactContext("Property stamp duty (YA2025)", [
      `Buyer type: ${buyerType}.`,
      `Property price: ${formatRM(result.propertyPrice)}.`,
      `Loan amount: ${formatRM(result.loanAmount)}.`,
      `Foreigner flat rate: ${result.foreignerFlatRate ? "yes" : "no"}.`,
      `First-time buyer: ${firstTimeBuyer ? "yes" : "no"}.`,
      `First-time exemption applied: ${result.firstTimeExemptionApplied ? "yes" : "no"}.`,
      `MOT duty before exemption: ${formatRM(result.motDutyBeforeExemption)}.`,
      `Loan agreement duty before exemption: ${formatRM(result.loanDutyBeforeExemption)}.`,
      `MOT duty payable: ${formatRM(result.motDuty)}.`,
      `Loan agreement duty payable: ${formatRM(result.loanDuty)}.`,
      `Total stamp duty: ${formatRM(result.totalDuty)}.`,
      ...tierLines,
    ]),
    usedDeterministic: true,
  };
}

function buildWithholdingTaxContext(message: string): AgentContextResult {
  const paymentType = inferWhtPaymentType(message);
  if (paymentType === null) {
    const question =
      "What type of non-resident payment is this: interest, royalty, technical fee, contract payment, public entertainer, or other Section 4(f) income?";
    return {
      ...emptyResult,
      toolName: "withholding_tax_calculator",
      context: followUpContext(question),
      needsFollowUp: true,
      followUpQuestion: question,
      missingFields: [{ field: "paymentType", question }],
    };
  }

  const grossAmount = extractGrossPaymentAmount(message);
  if (grossAmount === null) {
    const question =
      "What is the gross payment amount in RM for the withholding tax calculation?";
    return {
      ...emptyResult,
      toolName: "withholding_tax_calculator",
      context: followUpContext(question),
      needsFollowUp: true,
      followUpQuestion: question,
      missingFields: [{ field: "grossAmount", question }],
    };
  }

  const result = calculateWithholdingTax({
    paymentType,
    grossAmount,
    dtaRate: extractDtaRate(message),
  });
  const componentLines = result.components.map(
    (component) =>
      `Component ${component.label}: ${component.rate}% = ${formatRM(component.amount)}.`
  );

  return {
    ...emptyResult,
    toolName: "withholding_tax_calculator",
    context: exactContext("Withholding tax on non-resident payment (YA2025)", [
      `Payment type: ${result.paymentType}.`,
      `Gross amount: ${formatRM(result.grossAmount)}.`,
      `DTA applied: ${result.dtaApplied ? "yes" : "no"}.`,
      `Total withholding tax rate: ${result.totalRate}%.`,
      `Total withholding tax: ${formatRM(result.totalWht)}.`,
      `Net payment: ${formatRM(result.netPayment)}.`,
      `Form: ${result.form}.`,
      ...componentLines,
    ]),
    usedDeterministic: true,
  };
}

function buildCp204Context(message: string): AgentContextResult {
  const estimatedTax = extractEstimatedTax(message);
  if (estimatedTax === null) {
    const question =
      "What is the company's estimated tax payable in RM for the CP204 calculation?";
    return {
      ...emptyResult,
      toolName: "cp204_calculator",
      context: followUpContext(question),
      needsFollowUp: true,
      followUpQuestion: question,
      missingFields: [{ field: "estimatedTax", question }],
    };
  }

  const result = calculateCp204({
    estimatedTax,
    priorYearEstimate: extractPriorYearEstimate(message),
    actualTax: extractActualTax(message),
    basisPeriodMonths: extractBasisPeriodMonths(message),
  });
  const firstInstallment = result.installments[0];
  const lastInstallment = result.installments[result.installments.length - 1];
  const lines = [
    `Estimated tax: ${formatRM(result.estimatedTax)}.`,
    `Prior year estimate: ${
      result.minimumRequired === null
        ? "not provided"
        : formatRM(extractPriorYearEstimate(message) ?? 0)
    }.`,
    `Minimum required: ${
      result.minimumRequired === null
        ? "not applicable"
        : formatRM(result.minimumRequired)
    }.`,
    `Meets 85% minimum: ${
      result.meetsMinimum === null ? "not checked" : result.meetsMinimum ? "yes" : "no"
    }.`,
    `Installment count: ${result.installmentCount}.`,
    `Monthly installment: ${formatRM(result.monthlyAmount)}.`,
    `Final installment: ${formatRM(result.finalAmount)}.`,
    `First payment month of basis period: ${firstInstallment?.monthOfBasisPeriod ?? "n/a"}.`,
    `Last payment month of basis period: ${lastInstallment?.monthOfBasisPeriod ?? "n/a"}.`,
    `Revision months: ${result.revisionMonths.join(", ")}.`,
  ];

  if (result.penalty) {
    lines.push(
      `Actual tax: ${formatRM(result.penalty.actualTax)}.`,
      `Underestimation difference: ${formatRM(result.penalty.difference)}.`,
      `30% buffer: ${formatRM(result.penalty.buffer)}.`,
      `Excess over buffer: ${formatRM(result.penalty.excessOverBuffer)}.`,
      `Penalty amount: ${formatRM(result.penalty.penaltyAmount)}.`
    );
  }

  return {
    ...emptyResult,
    toolName: "cp204_calculator",
    context: exactContext("CP204 estimated tax payable (YA2025)", lines),
    usedDeterministic: true,
  };
}

function buildCapitalAllowanceContext(message: string): AgentContextResult {
  const cost = extractAssetCost(message);
  if (cost === null) {
    const question =
      "What is the asset cost in RM for the capital allowance calculation?";
    return {
      ...emptyResult,
      toolName: "capital_allowance_calculator",
      context: followUpContext(question),
      needsFollowUp: true,
      followUpQuestion: question,
      missingFields: [{ field: "assetCost", question }],
    };
  }

  const assetType = inferCapitalAssetType(message);
  const result = calculateCapitalAllowance({
    assetType,
    cost,
    isNewVehicleUnder150k:
      assetType === "motor_vehicle"
        ? inferNewVehicleUnder150k(message)
        : undefined,
  });
  const scheduleLines = result.schedule.slice(0, 6).map(
    (row) =>
      `Year ${row.year}: IA ${formatRM(row.initialAllowance)}, AA ${formatRM(row.annualAllowance)}, total ${formatRM(row.totalAllowance)}, residual ${formatRM(row.residualExpenditure)}.`
  );

  return {
    ...emptyResult,
    toolName: "capital_allowance_calculator",
    context: exactContext("Capital allowance (YA2025)", [
      `Asset type: ${result.assetType}.`,
      `Asset cost: ${formatRM(result.cost)}.`,
      `Qualifying expenditure: ${formatRM(result.qualifyingExpenditure)}.`,
      `Initial allowance rate: ${result.iaRate * 100}%.`,
      `Annual allowance rate: ${result.aaRate * 100}%.`,
      `Years to full claim: ${result.yearsToFullClaim}.`,
      ...scheduleLines,
    ]),
    usedDeterministic: true,
  };
}

function buildSoleProprietorContext(message: string): AgentContextResult {
  const businessRevenue = extractBusinessRevenue(message);
  if (businessRevenue === null) {
    const question =
      "What is the business revenue in RM for the sole proprietor tax calculation?";
    return {
      ...emptyResult,
      toolName: "sole_proprietor_tax_calculator",
      context: followUpContext(question),
      needsFollowUp: true,
      followUpQuestion: question,
      missingFields: [{ field: "businessRevenue", question }],
    };
  }

  const maritalStatus = inferMaritalStatus(message);
  const result = calculateSoleProprietorTax({
    yearOfAssessment: 2025,
    businessRevenue,
    businessExpenses: extractBusinessExpenses(message),
    capitalAllowance: extractCapitalAllowanceAmount(message),
    otherIncome: extractOtherIncome(message),
    totalReliefs: extractTotalReliefs(message),
    maritalStatus,
    spouseHasIncome:
      maritalStatus === "married" ? inferSpouseHasIncome(message) : true,
    zakatAmount: extractZakatAmount(message),
  });

  return {
    ...emptyResult,
    toolName: "sole_proprietor_tax_calculator",
    context: exactContext("Sole proprietor tax (YA2025)", [
      `Business revenue: ${formatRM(businessRevenue)}.`,
      `Business expenses: ${formatRM(extractBusinessExpenses(message))}.`,
      `Capital allowance: ${formatRM(extractCapitalAllowanceAmount(message))}.`,
      `Other income: ${formatRM(result.otherIncome)}.`,
      `Adjusted business income: ${formatRM(result.adjustedBusinessIncome)}.`,
      `Business loss: ${formatRM(result.businessLoss)}.`,
      `Total income: ${formatRM(result.totalIncome)}.`,
      `Total reliefs: ${formatRM(result.totalReliefs)}.`,
      `Chargeable income: ${formatRM(result.chargeableIncome)}.`,
      `Tax before rebate: ${formatRM(result.taxBeforeRebate)}.`,
      `Rebate: ${formatRM(result.rebateAmount)}.`,
      `Zakat deduction: ${formatRM(result.zakatDeduction)}.`,
      `Tax payable: ${formatRM(result.taxPayable)}.`,
      `Effective rate: ${result.effectiveRate}%.`,
    ]),
    usedDeterministic: true,
  };
}

function buildTaxComputationContext(message: string): AgentContextResult {
  const profitBeforeTax = extractProfitBeforeTax(message);
  if (profitBeforeTax === null) {
    const question =
      "What is the company's profit before tax in RM for the tax computation worksheet?";
    return {
      ...emptyResult,
      toolName: "tax_computation_calculator",
      context: followUpContext(question),
      needsFollowUp: true,
      followUpQuestion: question,
      missingFields: [{ field: "profitBeforeTax", question }],
    };
  }

  const lower = message.toLowerCase();
  const isStandard = /non[-\s]?sme|standard|not\s+sme/.test(lower);
  const result = calculateTaxComputation({
    profitBeforeTax,
    addBacks: {
      depreciation: extractDepreciation(message),
      provisions: 0,
      entertainmentDisallowed: 0,
      finesPenalties: 0,
      privateExpenses: 0,
      donationsInPnl: 0,
      other: 0,
    },
    nonTaxableIncome: {
      exemptDividends: extractNonTaxableIncome(message),
      capitalGains: 0,
      unrealisedForexGain: 0,
      other: 0,
    },
    capitalAllowanceCurrent: extractCapitalAllowanceAmount(message),
    capitalAllowanceBroughtForward: 0,
    businessLossBroughtForward: extractBusinessLossBroughtForward(message),
    otherIncome: extractOtherIncome(message),
    approvedDonations: extractApprovedDonations(message),
    isSme: !isStandard,
    paidUpCapital: extractPaidUpCapital(message) ?? 1_000_000,
    annualRevenue: extractAnnualRevenue(message) ?? 5_000_000,
  });

  return {
    ...emptyResult,
    toolName: "tax_computation_calculator",
    context: exactContext("Corporate tax computation (YA2025)", [
      `Profit before tax: ${formatRM(result.profitBeforeTax)}.`,
      `Total add-backs: ${formatRM(result.totalAddBacks)}.`,
      `Total non-taxable income: ${formatRM(result.totalNonTaxable)}.`,
      `Adjusted income: ${formatRM(result.adjustedIncome)}.`,
      `Current year loss: ${formatRM(result.currentYearLoss)}.`,
      `Capital allowance used: ${formatRM(result.capitalAllowanceUsed)}.`,
      `Capital allowance carried forward: ${formatRM(result.capitalAllowanceCarriedForward)}.`,
      `Statutory business income: ${formatRM(result.statutoryBusinessIncome)}.`,
      `Loss brought forward used: ${formatRM(result.lossBroughtForwardUsed)}.`,
      `Aggregate income: ${formatRM(result.aggregateIncome)}.`,
      `Donations allowed: ${formatRM(result.donationsAllowed)}.`,
      `Chargeable income: ${formatRM(result.chargeableIncome)}.`,
      `Loss carried forward: ${formatRM(result.lossCarriedForward)}.`,
      `SME qualified: ${result.tax.isSmeQualified ? "yes" : "no"}.`,
      `Corporate tax: ${formatRM(result.tax.totalTax)}.`,
    ]),
    usedDeterministic: true,
  };
}

function buildCorporateTaxContext(message: string): AgentContextResult {
  const lower = message.toLowerCase();
  const chargeableIncome = extractChargeableIncome(message);

  if (chargeableIncome === null) {
    const question =
      "What is the company chargeable income in RM for the corporate tax estimate?";
    return {
      ...emptyResult,
      toolName: "corporate_tax_calculator",
      context: followUpContext(question),
      needsFollowUp: true,
      followUpQuestion: question,
      missingFields: [{ field: "chargeableIncome", question }],
    };
  }

  const wantsStandard =
    /non[-\s]?sme|not\s+(?:an?\s+)?sme|standard|not\s+small\s+and\s+medium/.test(
      lower
    );
  const wantsSme =
    !wantsStandard &&
    /sme|small\s+and\s+medium|small\s+medium|中小|pkb/.test(lower);

  const paidUpCapital = extractPaidUpCapital(message);
  const annualRevenue = extractAnnualRevenue(message);

  if (wantsSme && (paidUpCapital === null || annualRevenue === null)) {
    const question =
      "What are the company's paid-up capital and annual revenue in RM for the SME corporate tax check?";
    return {
      ...emptyResult,
      toolName: "corporate_tax_calculator",
      context: followUpContext(question),
      needsFollowUp: true,
      followUpQuestion: question,
      missingFields: [
        ...(paidUpCapital === null
          ? [{ field: "paidUpCapital", question }]
          : []),
        ...(annualRevenue === null
          ? [{ field: "annualRevenue", question }]
          : []),
      ],
    };
  }

  const isSubsidiaryOfLargeCompany =
    /subsidiary|related\s+company|large\s+company\s+group/.test(lower);
  const foreignOwnershipOver20Pct =
    /foreign\s+ownership.*(?:over|above|>|more\s+than)\s*20|foreign-owned|foreign\s+owned/.test(
      lower
    );

  if (wantsSme) {
    const result = calculateCorporateTax({
      yearOfAssessment: 2025,
      chargeableIncome,
      isSme: true,
      paidUpCapital: paidUpCapital ?? 0,
      annualRevenue: annualRevenue ?? 0,
      isSubsidiaryOfLargeCompany,
      foreignOwnershipOver20Pct,
    });

    return {
      ...emptyResult,
      toolName: "corporate_tax_calculator",
      context: exactContext("SME corporate tax (YA2025)", [
        `Chargeable income: ${formatRM(result.chargeableIncome)}.`,
        `Paid-up capital: ${formatRM(paidUpCapital ?? 0)}.`,
        `Annual revenue: ${formatRM(annualRevenue ?? 0)}.`,
        `SME qualified: ${result.isSmeQualified ? "yes" : "no"}.`,
        `Total tax: ${formatRM(result.totalTax)}.`,
        `Effective tax rate: ${result.effectiveRate}%.`,
        ...formatCorporateBandBreakdown(result),
      ]),
      usedDeterministic: true,
    };
  }

  const standardResult = calculateCorporateTax({
    yearOfAssessment: 2025,
    chargeableIncome,
    isSme: false,
    paidUpCapital: paidUpCapital ?? 9_999_999_999,
    annualRevenue: annualRevenue ?? 9_999_999_999,
  });

  const lines = [
    `Chargeable income: ${formatRM(standardResult.chargeableIncome)}.`,
    "SME qualified: no.",
    `Total tax: ${formatRM(standardResult.totalTax)}.`,
    `Effective tax rate: ${standardResult.effectiveRate}%.`,
    ...formatCorporateBandBreakdown(standardResult),
  ];

  if (!wantsStandard) {
    const smeResult = calculateCorporateTax({
      yearOfAssessment: 2025,
      chargeableIncome,
      isSme: true,
      paidUpCapital: paidUpCapital ?? 2_500_000,
      annualRevenue: annualRevenue ?? 49_999_999,
    });
    lines.push(
      "",
      "If the company qualifies for SME rates:",
      `SME total tax: ${formatRM(smeResult.totalTax)}.`,
      `SME effective tax rate: ${smeResult.effectiveRate}%.`
    );
  }

  return {
    ...emptyResult,
    toolName: "corporate_tax_calculator",
    context: exactContext("Standard corporate tax (YA2025)", lines),
    usedDeterministic: true,
  };
}

function buildEInvoiceContext(message: string): AgentContextResult {
  const annualRevenue = extractMoneyAmount(message);
  if (annualRevenue === null) {
    const question =
      "What is the business annual turnover or revenue in RM for the e-Invoice check?";
    return {
      ...emptyResult,
      toolName: "e_invoice_phase_checker",
      context: followUpContext(question),
      needsFollowUp: true,
      followUpQuestion: question,
      missingFields: [{ field: "annualRevenue", question }],
    };
  }

  const result = checkEInvoicePhase({ annualRevenue });
  const lines = result.isExempt
    ? [
        `Annual turnover/revenue: ${formatRM(result.annualRevenue)}.`,
        `Conclusion: This is at or below ${formatRM(result.exemptionThreshold)}, so e-Invoice is exempt/voluntary under MYTax's current rules.`,
      ]
    : [
        `Annual turnover/revenue: ${formatRM(result.annualRevenue)}.`,
        `Conclusion: Phase ${result.phase}, mandatory from ${result.mandatoryDate}.`,
        result.relaxationEnd
          ? `Relaxation period ends on ${result.relaxationEnd}.`
          : "",
      ].filter(Boolean);

  return {
    ...emptyResult,
    toolName: "e_invoice_phase_checker",
    context: exactContext("e-Invoice", lines),
    usedDeterministic: true,
  };
}

function buildSstContext(message: string): AgentContextResult {
  const taxableRevenue = extractMoneyAmount(message);
  if (taxableRevenue === null) {
    const question =
      "What is the annual taxable revenue in RM for the SST check?";
    return {
      ...emptyResult,
      toolName: "sst_checker",
      context: followUpContext(question),
      needsFollowUp: true,
      followUpQuestion: question,
      missingFields: [{ field: "taxableRevenue", question }],
    };
  }

  const taxType = inferSstTaxType(message);
  if (taxType === null) {
    const question =
      "Is this for sales tax or service tax? If service tax, what service category is it?";
    return {
      ...emptyResult,
      toolName: "sst_checker",
      context: followUpContext(question),
      needsFollowUp: true,
      followUpQuestion: question,
      missingFields: [{ field: "taxType", question }],
    };
  }

  const result = calculateSst({
    taxableRevenue,
    taxType,
    serviceCategory:
      taxType === "service" ? inferServiceTaxCategory(message) : undefined,
  });
  const conclusion = result.isRegistrationRequired
    ? "registration is required"
    : "registration is not required";

  return {
    ...emptyResult,
    toolName: "sst_checker",
    context: exactContext("SST", [
      `Taxable revenue: ${formatRM(result.taxableRevenue)}.`,
      `Tax type: ${result.taxType}.`,
      result.serviceCategory
        ? `Service category: ${result.serviceCategory}.`
        : "",
      `Registration threshold used: ${formatRM(result.registrationThreshold)}.`,
      `Conclusion: ${conclusion}.`,
      `Estimated tax: ${formatRM(result.estimatedTax)} at ${result.taxRate}%.`,
    ].filter(Boolean)),
    usedDeterministic: true,
  };
}

function buildPersonalTaxContext(message: string): AgentContextResult {
  const income = extractIncomeAmount(message);
  if (income === null) {
    const question =
      "What is your employment income amount, and is it monthly or annual?";
    return {
      ...emptyResult,
      toolName: "personal_tax_calculator",
      context: followUpContext(question),
      needsFollowUp: true,
      followUpQuestion: question,
      missingFields: [{ field: "income", question }],
    };
  }

  const annualIncome = income.annualIncome;
  const reliefs: ReliefClaim[] = [
    { reliefId: "individual", amount: 9_000 },
  ];
  if (income.isMonthly) {
    reliefs.push(
      { reliefId: "epf_employee", amount: Math.min(annualIncome * 0.11, 4_000) },
      { reliefId: "socso_eis", amount: 350 }
    );
  }

  const result = calculatePersonalTax({
    yearOfAssessment: 2025,
    income: {
      employment: annualIncome,
      commission: 0,
      rental: 0,
      interest: 0,
      dividend: 0,
      other: 0,
    },
    reliefs,
    maritalStatus: /married|spouse|wife|husband|berkahwin/.test(
      message.toLowerCase()
    )
      ? "married"
      : "single",
    spouseHasIncome: true,
    zakatAmount: 0,
    monthlyPcbPaid: 0,
  });

  const incomeLabel = income.isMonthly
    ? `${formatRM(income.monthlyAmount ?? annualIncome / 12)} per month (= ${formatRM(annualIncome)} per year)`
    : `${formatRM(annualIncome)} per year`;

  const lines = [
    "--- PRE-CALCULATED TAX RESULT (use these EXACT numbers) ---",
    `Assumptions: YA2025, Malaysian tax resident individual, ${income.isMonthly ? "monthly employment income" : "annual employment income"}, basic reliefs only.`,
    `User's income: ${incomeLabel}`,
    `Gross income: ${formatRM(result.grossIncome)}`,
    income.isMonthly
      ? `Estimated EPF employee relief: ${formatRM(Math.min(annualIncome * 0.11, 4_000))}`
      : "",
    income.isMonthly ? "Estimated SOCSO/EIS relief: RM350" : "",
    `Total reliefs used: ${formatRM(result.totalReliefs)}`,
    `Chargeable income: ${formatRM(result.chargeableIncome)}`,
    `Tax before rebate: ${formatRM(result.taxBeforeRebate)}`,
    `Rebate: ${formatRM(result.rebateAmount)}`,
    `FINAL TAX PAYABLE: ${formatRM(result.taxAfterRebateAndZakat + result.dividendTax)}`,
    "--- END PRE-CALCULATED RESULT ---",
    "IMPORTANT: Present these EXACT numbers to the user. Do NOT recalculate.",
  ];

  return {
    ...emptyResult,
    toolName: "personal_tax_calculator",
    context: `\n\n${lines.join("\n")}`,
    usedDeterministic: true,
  };
}

export function buildDeterministicAgentContext(
  message: string
): AgentContextResult {
  const toolName = detectAgentTool(message);

  if (toolName === "e_invoice_phase_checker") {
    return buildEInvoiceContext(message);
  }
  if (toolName === "sst_checker") {
    return buildSstContext(message);
  }
  if (toolName === "corporate_tax_calculator") {
    return buildCorporateTaxContext(message);
  }
  if (toolName === "rpgt_calculator") {
    return buildRpgtContext(message);
  }
  if (toolName === "stamp_duty_calculator") {
    return buildStampDutyContext(message);
  }
  if (toolName === "withholding_tax_calculator") {
    return buildWithholdingTaxContext(message);
  }
  if (toolName === "cp204_calculator") {
    return buildCp204Context(message);
  }
  if (toolName === "capital_allowance_calculator") {
    return buildCapitalAllowanceContext(message);
  }
  if (toolName === "sole_proprietor_tax_calculator") {
    return buildSoleProprietorContext(message);
  }
  if (toolName === "tax_computation_calculator") {
    return buildTaxComputationContext(message);
  }
  if (toolName === "joint_assessment_calculator") {
    return buildJointAssessmentContext(message);
  }
  if (toolName === "batch_pcb_calculator") {
    return buildBatchPcbContext(message);
  }
  if (toolName === "pcb_calculator") {
    return buildPcbContext(message);
  }
  if (toolName === "employer_contribution_calculator") {
    return buildEmployerContributionContext(message);
  }
  if (toolName === "personal_tax_calculator") {
    return buildPersonalTaxContext(message);
  }

  return emptyResult;
}
