import { checkEInvoicePhase } from "@/engine/e-invoice";
import { calculateCorporateTax } from "@/engine/corporate";
import { calculateEmployerContributions } from "@/engine/employer-contributions";
import { calculatePersonalTax } from "@/engine/personal";
import { estimateMonthlyPcb } from "@/engine/pcb";
import { calculateSst } from "@/engine/sst";
import type {
  EmployerContributionInput,
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
      `(?:${labelPattern})[^0-9]*(?:RM|rm)?\\s*(\\d+(?:\\.\\d+)?)\\s*(million|juta|m|k|K|ribu)?`,
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
