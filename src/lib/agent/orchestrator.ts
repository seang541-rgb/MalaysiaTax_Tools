import { buildChatSystemPrompt } from "./prompts";
import { buildDeterministicAgentContext } from "./tools";
import type { AgentContextResult } from "./types";

export interface AgentChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AgentTurnInput {
  locale: unknown;
  userMessage: string;
  ragContext: string;
  messages: AgentChatMessage[];
  buildContext?: typeof buildDeterministicAgentContext;
}

export interface AgentTurnResult {
  agentContext: AgentContextResult | null;
  systemPrompt: string;
  llmMessages: Array<
    | { role: "system"; content: string }
    | { role: "user" | "assistant"; content: string }
  >;
  usedRag: boolean;
  usedPrecalc: boolean;
  usedDeterministic: boolean;
  agentFailureAnswer: string | null;
}

function calculatorContext(agentContext: AgentContextResult | null): string {
  if (!agentContext?.calculatorLabel || !agentContext.calculatorPath) {
    return "";
  }

  return `\nCalculator link: [${agentContext.calculatorLabel}](${agentContext.calculatorPath}). Include this link when giving the user next steps.\n`;
}

export function buildAgentTurn(input: AgentTurnInput): AgentTurnResult {
  let agentContext: AgentContextResult | null = null;
  let agentFailureAnswer: string | null = null;

  try {
    const buildContext = input.buildContext ?? buildDeterministicAgentContext;
    agentContext = input.userMessage ? buildContext(input.userMessage) : null;
  } catch {
    agentFailureAnswer = buildAgentFailureAnswer(input.locale);
  }

  const usedDeterministic = agentContext?.usedDeterministic ?? false;
  const systemPrompt = buildChatSystemPrompt({
    locale: input.locale,
    deterministicContext: `${agentContext?.context ?? ""}${calculatorContext(agentContext)}`,
    usedDeterministic,
    ragContext: input.ragContext,
  });

  return {
    agentContext,
    systemPrompt,
    llmMessages: [
      { role: "system", content: systemPrompt },
      ...input.messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ],
    usedRag: input.ragContext !== "",
    usedPrecalc: agentContext?.toolName === "personal_tax_calculator",
    usedDeterministic,
    agentFailureAnswer,
  };
}

function buildAgentFailureAnswer(locale: unknown): string {
  if (locale === "zh") {
    return "我暂时无法完成 MYTax 工具计算。请先使用完整的 [MYTax calculators](/) 页面核对资料，或稍后再试。";
  }

  if (locale === "ms") {
    return "Saya tidak dapat melengkapkan pengiraan alat MYTax buat sementara waktu. Sila semak semula di halaman [MYTax calculators](/) atau cuba lagi sebentar nanti.";
  }

  return "I could not complete the MYTax tool calculation. Please try the full [MYTax calculators](/) page or try again shortly.";
}

export function buildDeterministicFallbackAnswer(
  agentContext: AgentContextResult | null,
  locale?: unknown
): string | null {
  if (!agentContext?.usedDeterministic || !agentContext.context.trim()) {
    return null;
  }

  const facts = agentContext.context
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        !line.startsWith("---") &&
        !line.startsWith("IMPORTANT:")
    )
    .join("\n");
  const link =
    agentContext.calculatorLabel && agentContext.calculatorPath
      ? `\n\nCalculator: [${agentContext.calculatorLabel}](${agentContext.calculatorPath})`
      : "";

  if (locale === "zh") {
    return [
      "AI 说明服务暂时无法连接，但 MYTax 已经完成确定性计算：",
      `${facts}${link}`,
      "请把以上内容视为计算器参考结果；正式申报前建议再向 LHDN 或税务专业人士确认。",
    ].join("\n\n");
  }

  if (locale === "ms") {
    return [
      "Perkhidmatan penjelasan AI tidak dapat dicapai buat sementara waktu, tetapi MYTax telah mengira keputusan deterministik:",
      `${facts}${link}`,
      "Sila anggap keputusan ini sebagai rujukan kalkulator sahaja dan semak dengan LHDN atau profesional cukai untuk nasihat rasmi.",
    ].join("\n\n");
  }

  return [
    "I could not reach the AI explanation provider, but MYTax already calculated a deterministic MYTax result:",
    `${facts}${link}`,
    "Please treat this as a calculator result for reference only and consult LHDN or a tax professional for official advice.",
  ].join("\n\n");
}
