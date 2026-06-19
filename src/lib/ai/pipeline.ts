/**
 * Shared MYTax AI chat pipeline.
 *
 * Extracted from /api/chat so the streaming chat route and the admin
 * self-test endpoint build the SAME system prompt (RAG + deterministic facts
 * + pre-calculation). Keep this logic provider-agnostic and side-effect free
 * apart from the read-only Supabase RAG lookup.
 */
import { createClient } from "@supabase/supabase-js";
import { TAX_RATES_YA2025 } from "@/engine/tax-rates";
import { checkEInvoicePhase } from "@/engine/e-invoice";
import { calculateSst } from "@/engine/sst";
import { calculateCorporateTax } from "@/engine/corporate";
import { embed } from "@/lib/llm";

// Supabase client for RAG (anon; match_tax_chunks is SECURITY DEFINER).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

/** Retrieve relevant tax knowledge chunks via vector similarity. */
export async function retrieveContext(query: string): Promise<string> {
  if (!supabase) return "";

  try {
    const embedding = await embed(query, "query");

    const { data, error } = await supabase.rpc("match_tax_chunks", {
      query_embedding: embedding,
      match_threshold: 0.4,
      match_count: 3,
    });

    if (error || !data || data.length === 0) return "";

    const chunks = data.map(
      (chunk: { content: string; similarity: number }, i: number) =>
        `[Source ${i + 1} (relevance: ${(chunk.similarity * 100).toFixed(0)}%)]\n${chunk.content}`
    );

    return `\n\n--- Retrieved Tax Knowledge ---\n${chunks.join("\n\n")}\n--- End of Retrieved Knowledge ---\n`;
  } catch {
    // RAG failure is non-fatal — proceed without context
    return "";
  }
}

// ─── Pre-calculation: deterministic tax math ───

/** Extract annual income amount from user message. */
export function extractIncomeAmount(message: string): number | null {
  const normalized = message.replace(/,/g, "").replace(/\s+/g, " ");

  const annualPatterns = [
    /(?:annual|yearly|year|tahunan|tahun|年收入|年薪|年入|收入)[^0-9]*(?:RM|rm)?\s*(\d+(?:\.\d+)?)\s*(?:k|K)?/i,
    /(?:RM|rm)\s*(\d+(?:\.\d+)?)\s*(?:k|K)?\s*(?:per year|a year|setahun|一年|每年|\/year)/i,
    /(?:RM|rm)\s*(\d+(?:\.\d+)?)\s*(?:k|K)?/i,
  ];

  const monthlyPatterns = [
    /(?:monthly|month|sebulan|bulan|bulanan|月薪|月收入|月入|每月)[^0-9]*(?:RM|rm)?\s*(\d+(?:\.\d+)?)\s*(?:k|K)?/i,
    /(?:RM|rm)\s*(\d+(?:\.\d+)?)\s*(?:k|K)?\s*(?:per month|a month|sebulan|\/month|一个月|每个月|每月|\/bulan)/i,
    /(?:gaji|salary|薪水|工资)[^0-9]*(?:RM|rm)?\s*(\d+(?:\.\d+)?)\s*(?:k|K)?/i,
  ];

  for (const pattern of monthlyPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      let amount = parseFloat(match[1]);
      if (normalized.match(new RegExp(match[1] + "\\s*[kK]"))) {
        amount *= 1000;
      }
      if (amount > 0 && amount < 200000) {
        return amount * 12;
      }
    }
  }

  for (const pattern of annualPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      let amount = parseFloat(match[1]);
      if (normalized.match(new RegExp(match[1] + "\\s*[kK]"))) {
        amount *= 1000;
      }
      if (amount >= 1000) {
        return amount;
      }
    }
  }

  return null;
}

export function extractMoneyAmount(message: string): number | null {
  const normalized = message.replace(/,/g, "").replace(/\s+/g, " ");
  const match = normalized.match(
    /(?:RM|rm)?\s*(\d+(?:\.\d+)?)\s*(million|m|juta|k|K|ribu)?/i
  );
  if (!match) return null;

  let amount = parseFloat(match[1]);
  const suffix = match[2]?.toLowerCase();
  if (suffix === "million" || suffix === "m" || suffix === "juta") {
    amount *= 1000000;
  } else if (suffix === "k" || suffix === "ribu") {
    amount *= 1000;
  }

  return amount > 0 ? amount : null;
}

export function isPersonalTaxQuestion(message: string): boolean {
  const lower = message.toLowerCase();
  const hasPersonalSignal =
    /personal|individual|income tax|salary|monthly|month|gaji|月薪|个人所得税|个人税|所得税/.test(
      lower
    );
  const hasOtherToolSignal =
    /company|corporate|sme|sdn|sst|sales tax|service tax|e-?invoice|myinvois|rpgt|property|employer|epf|socso|eis|cp204|sole proprietor|self[- ]?employed|kerja sendiri/.test(
      lower
    );

  return hasPersonalSignal && !hasOtherToolSignal;
}

function formatExactContext(title: string, lines: string[]): string {
  return `\n\n--- EXACT MYTAX FACTS (${title}) ---\n${lines.join("\n")}\n--- END EXACT MYTAX FACTS ---\nIMPORTANT: Use these exact facts. Do not contradict them.\n`;
}

export function getDeterministicContext(message: string): string {
  const lower = message.toLowerCase();
  const amount = extractMoneyAmount(message);

  if (amount !== null && /e-?invoice|myinvois/.test(lower)) {
    const result = checkEInvoicePhase({ annualRevenue: amount });
    if (result.isExempt) {
      return formatExactContext("e-Invoice", [
        `Annual turnover/revenue: RM${amount.toLocaleString("en-MY")}.`,
        `Conclusion: This is at or below RM${result.exemptionThreshold.toLocaleString("en-MY")}, so e-Invoice is exempt/voluntary under MYTax's current rules.`,
      ]);
    }

    return formatExactContext(
      "e-Invoice",
      [
        `Annual turnover/revenue: RM${amount.toLocaleString("en-MY")}.`,
        `Conclusion: Phase ${result.phase}, mandatory from ${result.mandatoryDate}.`,
        result.relaxationEnd
          ? `Relaxation period ends on ${result.relaxationEnd}.`
          : "",
      ].filter(Boolean)
    );
  }

  if (
    amount !== null &&
    /sst|service tax|sales tax|cukai perkhidmatan|cukai jualan/.test(lower)
  ) {
    const result = calculateSst({
      taxableRevenue: amount,
      taxType: /sales tax|cukai jualan/.test(lower) ? "sales" : "service",
    });
    const conclusion = result.isRegistrationRequired
      ? "registration is required"
      : "registration is not required";

    return formatExactContext("SST", [
      `Taxable revenue: RM${amount.toLocaleString("en-MY")}.`,
      `Registration threshold used: RM${result.registrationThreshold.toLocaleString("en-MY")}.`,
      `Conclusion: ${conclusion}.`,
      `Estimated tax: RM${result.estimatedTax.toLocaleString("en-MY")} at ${result.taxRate}%.`,
    ]);
  }

  const isCorporate =
    /company|corporate|corporate tax|syarikat|sdn\.?\s?bhd|cukai korporat|公司税|企业税|公司所得税/.test(
      lower
    );
  const isSolePropOrPersonal =
    /sole proprietor|self[- ]?employed|kerja sendiri|enterprise|个人|individual|personal/.test(
      lower
    );
  if (amount !== null && isCorporate && !isSolePropOrPersonal) {
    const eligible = {
      yearOfAssessment: 2025,
      chargeableIncome: amount,
      isSubsidiaryOfLargeCompany: false,
      foreignOwnershipOver20Pct: false,
    };
    const sme = calculateCorporateTax({
      ...eligible,
      isSme: true,
      paidUpCapital: 1,
      annualRevenue: 1,
    });
    const std = calculateCorporateTax({
      ...eligible,
      isSme: false,
      paidUpCapital: 9_999_999_999,
      annualRevenue: 9_999_999_999,
    });
    return formatExactContext("Corporate income tax (YA2025)", [
      `Treating RM${amount.toLocaleString("en-MY")} as the company's chargeable income.`,
      `If it qualifies as an SME (paid-up capital ≤ RM2.5M AND annual revenue < RM50M, not >20% foreign-owned, not a subsidiary of a large company): tax = RM${sme.totalTax.toLocaleString("en-MY")} (effective ${sme.effectiveRate}%). SME bands: first RM150,000 @ 15%, RM150,001–600,000 @ 17%, balance @ 24%.`,
      `If it does NOT qualify as an SME (standard rate): flat 24% = RM${std.totalTax.toLocaleString("en-MY")}.`,
      `Ask the user about paid-up capital / revenue / ownership if SME status is unclear before concluding which figure applies.`,
    ]);
  }

  return "";
}

export function getLocaleInstruction(locale: unknown): string {
  if (locale === "zh") {
    return "\nReply language: Chinese. Use clear Simplified Chinese unless the user asks otherwise.\n";
  }
  if (locale === "ms") {
    return "\nReply language: Bahasa Malaysia unless the user asks otherwise.\n";
  }
  if (locale === "en") {
    return "\nReply language: English unless the user asks otherwise.\n";
  }

  return "";
}

interface PreCalculatedTax {
  grossIncome: number;
  personalRelief: number;
  epfRelief: number;
  socsoEisRelief: number;
  totalReliefs: number;
  chargeableIncome: number;
  bands: { min: number; max: number; rate: number; taxable: number; tax: number }[];
  totalTax: number;
  rebate: number;
  finalTax: number;
  isMonthly: boolean;
  monthlyAmount?: number;
}

function preCalculateTax(
  annualIncome: number,
  originalMessage: string
): PreCalculatedTax {
  const isMonthly = /月薪|monthly|month|bulan|gaji|salary/i.test(originalMessage);
  const personalRelief = 9000;
  const epfRelief = isMonthly ? Math.min(annualIncome * 0.11, 4000) : 0;
  const socsoEisRelief = isMonthly ? 350 : 0;
  const totalReliefs = personalRelief + epfRelief + socsoEisRelief;
  const chargeableIncome = Math.max(0, annualIncome - totalReliefs);

  const bands: PreCalculatedTax["bands"] = [];
  let remaining = chargeableIncome;

  for (const band of TAX_RATES_YA2025) {
    if (remaining <= 0) break;
    const bandWidth = band.max === Infinity ? remaining : band.max - band.min;
    const taxable = Math.min(remaining, bandWidth);
    const tax = Math.round(taxable * band.rate * 100) / 100;
    bands.push({
      min: band.min,
      max: band.max === Infinity ? chargeableIncome : band.max,
      rate: band.rate,
      taxable,
      tax,
    });
    remaining -= taxable;
  }

  const totalTax = bands.reduce((sum, b) => sum + b.tax, 0);
  const rebate = chargeableIncome <= 35000 ? 400 : 0;
  const finalTax = Math.max(0, totalTax - rebate);

  return {
    grossIncome: annualIncome,
    personalRelief,
    epfRelief,
    socsoEisRelief,
    totalReliefs,
    chargeableIncome,
    bands,
    totalTax,
    rebate,
    finalTax,
    isMonthly,
    monthlyAmount: isMonthly ? annualIncome / 12 : undefined,
  };
}

function formatPreCalculation(calc: PreCalculatedTax): string {
  const incomeLabel = calc.isMonthly
    ? `RM${calc.monthlyAmount!.toLocaleString()} per month (= RM${calc.grossIncome.toLocaleString()} per year)`
    : `RM${calc.grossIncome.toLocaleString()} per year`;

  let text = `\n\n--- PRE-CALCULATED TAX RESULT (use these EXACT numbers) ---\n`;
  text += `User's income: ${incomeLabel}\n`;
  text += `Personal relief: RM${calc.personalRelief.toLocaleString()}\n`;
  if (calc.epfRelief > 0) {
    text += `Estimated EPF employee relief: RM${calc.epfRelief.toLocaleString()}\n`;
  }
  if (calc.socsoEisRelief > 0) {
    text += `Estimated SOCSO/EIS relief: RM${calc.socsoEisRelief.toLocaleString()}\n`;
  }
  text += `Total reliefs used: RM${calc.totalReliefs.toLocaleString()}\n`;
  text += `Chargeable income: RM${calc.grossIncome.toLocaleString()} - RM${calc.totalReliefs.toLocaleString()} = RM${calc.chargeableIncome.toLocaleString()}\n\n`;
  text += `Tax bands applied to chargeable income RM${calc.chargeableIncome.toLocaleString()}:\n`;

  let cumulative = 0;
  for (const band of calc.bands) {
    cumulative += band.tax;
    const ratePercent = (band.rate * 100).toFixed(0);
    const maxLabel =
      band.max >= 2000000
        ? "above"
        : `${band.min.toLocaleString()}-${band.max.toLocaleString()}`;
    text += `  ${maxLabel}: ${ratePercent}% on RM${band.taxable.toLocaleString()} = RM${band.tax.toLocaleString()} (cumulative: RM${cumulative.toLocaleString()})\n`;
  }

  text += `\nTotal tax before rebate: RM${calc.totalTax.toLocaleString()}\n`;
  if (calc.rebate > 0) {
    text += `Rebate: -RM${calc.rebate.toLocaleString()} (chargeable income ≤ RM35,000)\n`;
  }
  text += `FINAL TAX PAYABLE: RM${calc.finalTax.toLocaleString()}\n`;
  text += `--- END PRE-CALCULATED RESULT ---\n`;
  text += `IMPORTANT: Present these EXACT numbers to the user. Do NOT recalculate. Just format and explain them clearly in the user's language.\n`;

  return text;
}

export const SYSTEM_PROMPT = `You are MYTax AI — a Malaysia tax expert assistant. You answer questions about Malaysian taxation accurately and concisely.

Your knowledge covers:
- Personal income tax (YA2025): Progressive rates 0%–30%, 29 relief categories
- Corporate tax: SME preferential rates (15%/17%/24%), standard 24%
- EPF (KWSP): Employer 13% (≤RM5k) or 12% (>RM5k), employee 11%, ceiling RM20k
- SOCSO (PERKESO): Employer 1.75%, employee 0.5%, ceiling RM6k, below 60 only
- EIS (SIP): 0.2% each, ceiling RM6k, below 60 only
- SST: Service tax 8%, Sales tax 5%/10%, threshold RM500k
- PCB (monthly tax deduction): Advance tax deducted by employer monthly

Important fixed facts to use before general model knowledge:
- SME corporate tax (YA2025): first RM150,000 at 15%, next RM450,000 at 17%, balance at 24%.
- e-Invoice rollout: >RM100M from 1 Aug 2024; RM25M-RM100M from 1 Jan 2025; RM5M-RM25M from 1 Jul 2025; RM1M-RM5M from 1 Jan 2026; <=RM1M exempt/voluntary.
- Most taxable services use the RM500,000 annual SST registration threshold unless a specific service category has a different rule.
- Employer EPF is 13% for monthly wages up to RM5,000 and 12% above RM5,000; employee EPF is generally 11%.
- SOCSO wage ceiling is RM6,000; EIS is 0.2% employee and 0.2% employer up to the applicable ceiling.
- CP204 is the company's estimate of tax payable; underestimation can trigger penalties when the final tax exceeds the estimate beyond the allowed margin.
- RPGT (Real Property Gains Tax) for individual citizens/PR: disposal within 3 years 30%, in the 4th year 20%, in the 5th year 15%, in the 6th year onwards 0%. For companies: ≤3 years 30%, 4th 20%, 5th 15%, 6th onwards 10%. Foreigners/non-citizens: ≤5 years 30%, 6th onwards 10%. A Malaysian citizen has a once-in-a-lifetime exemption on a private residence.
- Stamp duty on Memorandum of Transfer (property): 1% on first RM100,000; 2% on RM100,001–500,000; 3% on RM500,001–1,000,000; 4% above RM1,000,000. Loan agreement stamp duty is a flat 0.5% of the loan amount.
- Withholding tax (non-resident, common rates): special classes of income / technical fees 10%, royalties 10%, interest 15%, contract payments 10%+3%, rental of movable property 10%. A Double Taxation Agreement (DTA) may reduce these rates.

Rules:
1. Always cite specific rates, ceilings, and thresholds with numbers
2. Mention Year of Assessment (YA2025) when relevant
3. If uncertain, say so and recommend consulting LHDN or a tax professional
4. Keep answers concise but complete
5. IMPORTANT: Match the user's language — if user writes in Chinese (中文), reply in Chinese; if English, reply in English; if Malay, reply in Malay
6. Add a disclaimer that your answers are for reference only
7. When appropriate, suggest the user try the calculator tools on MYTax website

Key reliefs (YA2025):
- Individual: RM9,000 (auto)
- Spouse: RM4,000
- Child under 18: RM2,000
- Child 18+ studying: RM8,000
- EPF employee: max RM4,000
- Life insurance: max RM3,000
- Education (self): max RM7,000
- Lifestyle: max RM2,500
- Parents medical: max RM8,000`;

const CALC_GUIDE = `

When calculating personal tax yourself, you MUST apply EVERY tax band separately. Do NOT skip or merge the 0%, 1%, 3% bands.

Tax bands (YA2025, resident individual) — APPLY EACH BAND to chargeable income:
- 0 – 5,000: 0% (cumulative: RM0)
- 5,001 – 20,000: 1% on RM15,000 = RM150 (cumulative: RM150)
- 20,001 – 35,000: 3% on RM15,000 = RM450 (cumulative: RM600)
- 35,001 – 50,000: 6% on RM15,000 = RM900 (cumulative: RM1,500)
- 50,001 – 70,000: 11% on RM20,000 = RM2,200 (cumulative: RM3,700)
- 70,001 – 100,000: 19% on RM30,000 = RM5,700 (cumulative: RM9,400)
- 100,001 – 400,000: 25%
- 400,001 – 600,000: 26%
- 600,001 – 2,000,000: 28%
- Above 2,000,000: 30%
Remember: a monthly salary must be multiplied by 12 to get annual income before applying bands.`;

export interface ChatContext {
  system: string;
  usedRag: boolean;
  usedPrecalc: boolean;
  usedDeterministic: boolean;
}

/**
 * Build the full system prompt for a user message: base prompt + locale +
 * deterministic facts + pre-calculation (or the manual band guide) + RAG.
 */
export async function buildChatContext(
  userMessage: string,
  locale: unknown
): Promise<ChatContext> {
  const ragContext = userMessage ? await retrieveContext(userMessage) : "";
  const deterministicContext = userMessage
    ? getDeterministicContext(userMessage)
    : "";

  let preCalcContext = "";
  const detectedIncome = extractIncomeAmount(userMessage);
  if (detectedIncome !== null && isPersonalTaxQuestion(userMessage)) {
    preCalcContext = formatPreCalculation(
      preCalculateTax(detectedIncome, userMessage)
    );
  }

  let system = SYSTEM_PROMPT;
  system += getLocaleInstruction(locale);
  if (deterministicContext) system += deterministicContext;
  if (preCalcContext) system += preCalcContext;
  else system += CALC_GUIDE;
  if (ragContext) {
    system += `\n\nUse the following retrieved knowledge to enhance your answer. Prioritize this information over your general knowledge when answering:${ragContext}`;
  }

  return {
    system,
    usedRag: ragContext !== "",
    usedPrecalc: preCalcContext !== "",
    usedDeterministic: deterministicContext !== "",
  };
}
