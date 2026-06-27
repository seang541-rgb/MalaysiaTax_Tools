import { checkEInvoicePhase } from "@/engine/e-invoice";
import { calculatePersonalTax } from "@/engine/personal";
import { calculateSst } from "@/engine/sst";
import type { ReliefClaim } from "@/engine/types";
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
  if (toolName === "personal_tax_calculator") {
    return buildPersonalTaxContext(message);
  }

  return emptyResult;
}
