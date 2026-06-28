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
}

export function buildAgentTurn(input: AgentTurnInput): AgentTurnResult {
  const agentContext = input.userMessage
    ? buildDeterministicAgentContext(input.userMessage)
    : null;
  const usedDeterministic = agentContext?.usedDeterministic ?? false;
  const systemPrompt = buildChatSystemPrompt({
    locale: input.locale,
    deterministicContext: agentContext?.context ?? "",
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
  };
}
