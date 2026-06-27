import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getTaxRates } from "@/engine/tax-rates";
import { checkEInvoicePhase } from "@/engine/e-invoice";
import { calculateSst } from "@/engine/sst";
import { calculateCorporateTax } from "@/engine/corporate";
import { embed, chatStream, llmConfigured, llmInfo } from "@/lib/llm";
import { logChatInteraction } from "@/lib/ai-chat-log";
import { billingErrorResponse } from "@/lib/billing/errors";
import {
  consumeCredits,
  InsufficientCreditsError,
  refundCredits,
} from "@/lib/billing/credits";
import { BILLING_FEATURE_COSTS } from "@/lib/billing/plans";
import { buildDeterministicAgentContext } from "@/lib/agent/tools";
import { checkRateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Supabase client for RAG
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

/** Retrieve relevant tax knowledge chunks via vector similarity */
async function retrieveContext(query: string): Promise<string> {
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

/** Extract annual income amount from user message */
function _extractIncomeAmount(message: string): number | null {
  // Normalize: remove commas, spaces in numbers
  const normalized = message.replace(/,/g, "").replace(/\s+/g, " ");

  // Patterns for annual income (支持 EN/ZH/MS)
  const annualPatterns = [
    // English: "annual income is RM80000", "yearly salary of RM80000", "income of RM 80000"
    /(?:annual|yearly|year|tahunan|tahun|年收入|年薪|年入|收入)[^0-9]*(?:RM|rm)?\s*(\d+(?:\.\d+)?)\s*(?:k|K)?/i,
    // Direct: "RM80000 per year", "RM80000 setahun", "RM80000一年"
    /(?:RM|rm)\s*(\d+(?:\.\d+)?)\s*(?:k|K)?\s*(?:per year|a year|setahun|一年|每年|\/year)/i,
    // Generic: "annual income RM80000" or "pendapatan tahunan RM80000"
    /(?:RM|rm)\s*(\d+(?:\.\d+)?)\s*(?:k|K)?/i,
  ];

  // Monthly patterns (需要 ×12)
  const monthlyPatterns = [
    // English: "monthly salary RM8000", "monthly income RM8000"
    /(?:monthly|month|sebulan|bulan|bulanan|月薪|月收入|月入|每月)[^0-9]*(?:RM|rm)?\s*(\d+(?:\.\d+)?)\s*(?:k|K)?/i,
    // Direct: "RM8000 per month", "RM8000 sebulan", "RM8000一个月"
    /(?:RM|rm)\s*(\d+(?:\.\d+)?)\s*(?:k|K)?\s*(?:per month|a month|sebulan|\/month|一个月|每个月|每月|\/bulan)/i,
    // "gaji RM8000" (salary in Malay, often implies monthly)
    /(?:gaji|salary|薪水|工资)[^0-9]*(?:RM|rm)?\s*(\d+(?:\.\d+)?)\s*(?:k|K)?/i,
  ];

  // Check monthly patterns first (more specific)
  for (const pattern of monthlyPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      let amount = parseFloat(match[1]);
      if (normalized.match(new RegExp(match[1] + "\\s*[kK]"))) {
        amount *= 1000;
      }
      // Sanity: monthly should be < 200k (reasonable range)
      if (amount > 0 && amount < 200000) {
        return amount * 12; // Convert to annual
      }
    }
  }

  // Check annual patterns
  for (const pattern of annualPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      let amount = parseFloat(match[1]);
      if (normalized.match(new RegExp(match[1] + "\\s*[kK]"))) {
        amount *= 1000;
      }
      // Sanity: annual should be > 1000 (filter out band numbers like "19%")
      if (amount >= 1000) {
        return amount;
      }
    }
  }

  return null;
}

function extractMoneyAmount(message: string): number | null {
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

function _isPersonalTaxQuestion(message: string): boolean {
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

function _getDeterministicContext(message: string): string {
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

    return formatExactContext("e-Invoice", [
      `Annual turnover/revenue: RM${amount.toLocaleString("en-MY")}.`,
      `Conclusion: Phase ${result.phase}, mandatory from ${result.mandatoryDate}.`,
      result.relaxationEnd
        ? `Relaxation period ends on ${result.relaxationEnd}.`
        : "",
    ].filter(Boolean));
  }

  if (amount !== null && /sst|service tax|sales tax|cukai perkhidmatan|cukai jualan/.test(lower)) {
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

  // Corporate income tax: treat the amount as chargeable income. SME status is
  // hard to infer reliably from free text, so inject BOTH scenarios with their
  // exact figures and let the model pick based on what the user stated.
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

function getLocaleInstruction(locale: unknown): string {
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
  isMonthly: boolean; // whether user asked in monthly terms
  monthlyAmount?: number;
}

/** Deterministic tax calculation using the rule engine */
function _preCalculateTax(annualIncome: number, originalMessage: string): PreCalculatedTax {
  const isMonthly = /月薪|monthly|month|bulan|gaji|salary/i.test(originalMessage);
  const personalRelief = 9000; // automatic individual relief
  const epfRelief = isMonthly ? Math.min(annualIncome * 0.11, 4000) : 0;
  const socsoEisRelief = isMonthly ? 350 : 0;
  const totalReliefs = personalRelief + epfRelief + socsoEisRelief;
  const chargeableIncome = Math.max(0, annualIncome - totalReliefs);
  const taxRates = getTaxRates(2025);

  const bands: PreCalculatedTax["bands"] = [];
  let remaining = chargeableIncome;

  for (const band of taxRates) {
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

  // Rebate: RM400 if chargeable income <= RM35,000
  const rebate = chargeableIncome <= 35000 ? 400 : 0;
  const finalTax = Math.max(0, totalTax - rebate);

  // Detect if user asked in monthly terms
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

/** Format pre-calculated tax into injection text for system prompt */
function _formatPreCalculation(calc: PreCalculatedTax): string {
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
    const maxLabel = band.max >= 2000000 ? "above" : `${band.min.toLocaleString()}-${band.max.toLocaleString()}`;
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

const SYSTEM_PROMPT = `You are MYTax AI — a Malaysia tax expert assistant. You answer questions about Malaysian taxation accurately and concisely.

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

/**
 * Manual band-calculation guidance. Appended ONLY when there is no
 * deterministic pre-calculation — otherwise it conflicts with the injected
 * exact result and tempts the model to recalculate (often on the wrong,
 * un-annualised income). When pre-calc fires, the injected numbers win.
 */
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

const MAX_MESSAGE_LENGTH = 500;
const MAX_MESSAGES = 20;

function isChatMessage(value: unknown): value is {
  role?: unknown;
  content?: unknown;
} {
  return typeof value === "object" && value !== null;
}

export async function POST(request: NextRequest) {
  let chargedAiCredit = false;
  let chargedUserId: string | null = null;
  const aiCreditCost = BILLING_FEATURE_COSTS.ai_tax_question;

  try {
    const supabaseAuth = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return billingErrorResponse(
        "AUTH_REQUIRED",
        401,
        "Please sign in to use MYTax AI."
      );
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rateKey = user.id ? `user:${user.id}` : `ip:${ip}`;
    const rateLimit = await checkRateLimit({
      key: rateKey,
      route: "/api/chat",
      limit: 10,
      windowSeconds: 60,
    });
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: "Too many requests. Please wait a moment.",
          resetAt: rateLimit.resetAt,
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = (await request.json().catch(() => null)) as {
      messages?: unknown;
      locale?: unknown;
    } | null;
    const messages = body?.messages;
    const locale = body?.locale;

    // Input validation
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid messages format." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    if (messages.length > MAX_MESSAGES) {
      return new Response(
        JSON.stringify({ error: "Too many messages in conversation." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    // Sanitize: trim and cap each message length
    const sanitizedMessages = messages.map((m) => ({
      role: isChatMessage(m) && m.role === "assistant" ? "assistant" : "user",
      content:
        isChatMessage(m) && typeof m.content === "string"
          ? m.content.slice(0, MAX_MESSAGE_LENGTH)
          : "",
    }));

    // Get the latest user message for RAG retrieval + pre-calculation
    const lastUserMsg = [...sanitizedMessages].reverse().find(
      (m: { role: string }) => m.role === "user"
    );
    const userMessage = lastUserMsg?.content || "";

    try {
      await consumeCredits({
        userId: user.id,
        feature: "ai_tax_question",
        amount: aiCreditCost,
        requestSummary: {
          route: "/api/chat",
          messageCount: sanitizedMessages.length,
          messageLength: userMessage.length,
        },
      });
      chargedAiCredit = true;
      chargedUserId = user.id;
    } catch (error) {
      if (error instanceof InsufficientCreditsError) {
        return billingErrorResponse(
          "INSUFFICIENT_CREDITS",
          402,
          "Not enough credits for MYTax AI.",
          { balance: error.balance, requiredCredits: error.required }
        );
      }
      throw error;
    }

    const ragContext = userMessage ? await retrieveContext(userMessage) : "";

    const agentContext = userMessage
      ? buildDeterministicAgentContext(userMessage)
      : null;
    const deterministicContext = agentContext?.context ?? "";

    // Build system prompt. When we have a deterministic pre-calculation,
    // inject it and SKIP the manual band guide (which would invite the model
    // to recalculate on the wrong income). Otherwise include the band guide.
    let systemWithRag = SYSTEM_PROMPT;
    systemWithRag += getLocaleInstruction(locale);
    if (deterministicContext) {
      systemWithRag += deterministicContext;
    }
    if (!agentContext?.usedDeterministic) {
      systemWithRag += CALC_GUIDE;
    }
    if (ragContext) {
      systemWithRag += `\n\nUse the following retrieved knowledge to enhance your answer. Prioritize this information over your general knowledge when answering:${ragContext}`;
    }

    // Build the message array with system prompt
    const llmMessages = [
      { role: "system" as const, content: systemWithRag },
      ...sanitizedMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    // Stream from the configured OpenAI-compatible provider
    const llmRes = await chatStream(llmMessages);

    if (!llmRes.ok || !llmRes.body) {
      const errText = await llmRes.text().catch(() => "");
      await refundCredits({
        userId: user.id,
        feature: "ai_tax_question",
        amount: aiCreditCost,
        errorCode: "PROVIDER_FAILED_REFUNDED",
        metadata: {
          route: "/api/chat",
          status: llmRes.status,
          detail: errText,
        },
      });
      chargedAiCredit = false;

      return billingErrorResponse(
        "PROVIDER_FAILED_REFUNDED",
        502,
        `LLM error: ${llmRes.status}`,
        { detail: errText }
      );
    }

    // Transform the provider's OpenAI-style SSE → our client SSE (data: {token})
    const reader = llmRes.body.getReader();
    const decoder = new TextDecoder();
    const chargedFeature = "ai_tax_question" as const;
    const chargedAmount = aiCreditCost;

    const usedRag = ragContext !== "";
    const usedPrecalc = agentContext?.toolName === "personal_tax_calculator";
    const usedDeterministic = agentContext?.usedDeterministic ?? false;
    const logUserId = user.id;

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let buffer = "";
        let fullAnswer = "";
        let sawDone = false;
        let streamFailed = false;
        let streamFailure: unknown;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const rawLine of lines) {
              const line = rawLine.trim();
              if (!line || !line.startsWith("data:")) continue;
              const payload = line.slice(5).trim();
              if (payload === "[DONE]") {
                sawDone = true;
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                continue;
              }
              try {
                const json = JSON.parse(payload);
                const token = json.choices?.[0]?.delta?.content;
                if (token) {
                  fullAnswer += token;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ token })}\n\n`)
                  );
                }
              } catch {
                // skip malformed lines
              }
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (err) {
          streamFailed = true;
          streamFailure = err;
        } finally {
          if (streamFailed && !sawDone) {
            await Promise.resolve(
              refundCredits({
                userId: logUserId,
                feature: chargedFeature,
                amount: chargedAmount,
                errorCode: "STREAM_FAILED_REFUNDED",
                metadata: {
                  route: "/api/chat",
                  partialAnswerLength: fullAnswer.length,
                },
              })
            ).catch(() => {});
          }

          // Best-effort quality log. Await BEFORE closing the stream so the
          // serverless function stays alive until the write completes — a
          // fire-and-forget after close() gets frozen/killed on Vercel.
          // logChatInteraction swallows its own errors, so this never throws.
          if (fullAnswer) {
            await logChatInteraction({
              userId: logUserId,
              locale: typeof locale === "string" ? locale : null,
              question: userMessage,
              answer: fullAnswer,
              usedRag,
              usedPrecalc,
              usedDeterministic,
              agentToolName: agentContext?.toolName ?? null,
              agentNeedsFollowUp: agentContext?.needsFollowUp ?? false,
              agentMissingFields:
                agentContext?.missingFields.map((field) => field.field) ?? [],
            });
          }
          if (!streamFailed) {
            controller.close();
          } else {
            queueMicrotask(() => {
              controller.error(streamFailure);
            });
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    if (chargedAiCredit && chargedUserId) {
      await Promise.resolve(
        refundCredits({
          userId: chargedUserId,
          feature: "ai_tax_question",
          amount: aiCreditCost,
          errorCode: "PROVIDER_FAILED_REFUNDED",
          metadata: { route: "/api/chat" },
        })
      ).catch(() => {});
    }

    return new Response(
      JSON.stringify({ error: "Failed to reach the LLM provider." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/** GET /api/chat — lightweight health check (no LLM/credit usage) */
export async function GET() {
  const ok = llmConfigured();
  return new Response(
    JSON.stringify({
      status: ok ? "ok" : "error",
      model: llmInfo.CHAT_MODEL,
      configured: ok,
      available: ok,
    }),
    {
      status: ok ? 200 : 503,
      headers: { "Content-Type": "application/json" },
    }
  );
}
