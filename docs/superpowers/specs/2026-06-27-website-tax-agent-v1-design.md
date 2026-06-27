# Website Tax Agent v1 - Design Spec

## Overview

MYTax will upgrade the existing AI Tax chat into a website-embedded tax agent. The v1 agent stays inside the current Next.js application and uses the existing deterministic TypeScript tax engines for calculations. The language model will not be trusted to calculate tax amounts by itself; it will understand the user's question, collect missing details, select the right tool, and explain the tool result in the user's language.

This is intentionally not a standalone API platform, WhatsApp bot, accounting dashboard, or fine-tuned model project. Those can come later after the website agent proves that users understand and value guided tax help.

## Goals

- Turn `/ai-tax` from general RAG chat into a guided tax assistant.
- Reuse existing `src/engine/*` calculation modules as agent tools.
- Support English, Chinese, and Bahasa Malaysia conversations.
- Ask concise follow-up questions when required inputs are missing.
- Keep all numeric tax calculations deterministic and testable.
- Use RAG only for legal context, explanations, and source-backed clarification.
- Preserve existing auth, credit billing, streaming, and chat logging behavior.

## Non-Goals

- No model fine-tuning in v1.
- No public external Tax Agent API in v1.
- No WhatsApp, Telegram, or voice interface in v1.
- No automatic filing, form submission, or final professional tax advice.
- No autonomous updates to tax rules without owner review.
- No replacement of the existing calculator pages.

## User Experience

The user asks a natural question in the existing MYTax AI chat.

Example:

```text
I earn RM8,000 monthly and I am single. How much tax do I pay?
```

The agent should:

1. Detect the scenario as personal income tax.
2. Extract monthly income and marital status.
3. Identify any missing required assumptions.
4. Use defaults only when safe and explicitly stated.
5. Call the personal tax tool.
6. Return a concise calculation summary with assumptions, result, and disclaimer.
7. Link to the full calculator page for detailed adjustment.

If the user asks:

```text
My company revenue is RM700k. Do I need SST?
```

The agent should detect SST registration, ask whether this is sales tax or service tax if unclear, and then call the SST checker after it has enough information.

## V1 Scope

The first website agent release covers five high-value scenarios:

| Scenario | Existing Engine | Agent Tool |
| --- | --- | --- |
| Personal income tax estimate | `src/engine/personal.ts` | `personal_tax_calculator` |
| e-Invoice phase and exemption check | `src/engine/e-invoice.ts` | `e_invoice_phase_checker` |
| SST registration and estimate | `src/engine/sst.ts` | `sst_checker` |
| Corporate tax estimate | `src/engine/corporate.ts` | `corporate_tax_calculator` |
| Property disposal or purchase tax | `src/engine/rpgt.ts`, `src/engine/stamp-duty.ts` | `rpgt_calculator`, `stamp_duty_calculator` |

The v1 implementation can start with the first three tools and add corporate/property once the agent loop is stable.

## Architecture

```text
Browser TaxChat component
  -> POST /api/chat
    -> auth and credit checks
    -> agent orchestrator
      -> intent detection
      -> slot extraction
      -> missing input policy
      -> tool registry
        -> deterministic tax engines
      -> RAG retrieval
      -> response composer
    -> streamed answer
    -> AI chat log
```

New code should live under `src/lib/agent/`:

- `types.ts`: common tool, slot, and agent result types.
- `tools.ts`: registry of available tax tools.
- `intents.ts`: intent names, keyword hints, and confidence helpers.
- `slots.ts`: lightweight extraction and missing-input checks.
- `orchestrator.ts`: main agent flow used by `/api/chat`.
- `prompts.ts`: compact response instructions for LLM formatting.

The first release can keep `/api/chat` as the public route to avoid frontend churn. Internally, `/api/chat` should delegate to the agent orchestrator rather than continuing to grow ad hoc pre-calculation logic.

## Agent Tool Contract

Each tool exposes a small structured contract:

```ts
interface AgentTool<Input, Output> {
  name: string;
  description: string;
  requiredFields: string[];
  optionalFields: string[];
  detect(message: string): ToolDetection;
  extract(message: string): Partial<Input>;
  missing(input: Partial<Input>): MissingField[];
  run(input: Input): Output;
  summarize(output: Output, context: ToolSummaryContext): ToolSummary;
}
```

The tool contract should keep extraction simple in v1. Regex and small helper functions are acceptable because the supported scenarios are narrow. If extraction becomes brittle, move to model-assisted JSON extraction with schema validation.

## Missing Input Policy

The agent should ask one concise follow-up question when required information is missing. It should not ask a long questionnaire.

Required v1 examples:

- Personal tax: income amount, income period if ambiguous, residency if needed, marital status if not inferable.
- SST: annual taxable revenue, tax type or service category if the user's question depends on it.
- e-Invoice: annual turnover or revenue.
- Corporate tax: chargeable income, SME qualification details when the user asks for a specific SME conclusion.
- RPGT: acquisition date, disposal date, disposal price, acquisition price, disposer type.
- Stamp duty: property price, buyer type, loan amount if loan duty is requested.

Safe defaults are allowed only when clearly disclosed. For example, personal tax can default to YA2025 and single if the user asks for a quick estimate, but the answer must label those assumptions.

## Response Requirements

Every agent answer that uses a tool should include:

- The scenario detected.
- The assumptions used.
- The calculated result.
- A short explanation of how the result was derived.
- A link to the relevant full calculator page.
- A disclaimer that the answer is for reference only.

The answer should match the user's language. If the user writes in Chinese, reply in Chinese. If the user writes in Bahasa Malaysia, reply in Bahasa Malaysia. Otherwise use English.

The model may format and explain, but it must not override tool output numbers.

## RAG Usage

RAG remains useful, but it should support the tool result rather than replace it.

Use RAG for:

- Explaining tax concepts.
- Finding source-backed context.
- Answering non-calculation questions.
- Adding caveats around changing policy.

Do not use RAG for:

- Recalculating deterministic tool output.
- Picking a different rate when the engine has already returned a result.
- Overriding source-controlled MYTax rules without an owner-reviewed update.

## Billing

Keep the existing AI Tax credit model for v1:

- `GET /api/chat` remains a free health check.
- `POST /api/chat` requires login and consumes the existing AI question credit.
- If a provider failure happens after credit deduction, keep the current refund behavior.

Do not add separate per-tool pricing in the first agent release. Once the tool loop is stable, higher-cost flows such as batch PCB, report generation, or deep comparison can have separate credit costs.

## Logging and Analytics

Extend AI chat logging to capture:

- detected intent
- selected tool name
- whether a follow-up question was asked
- missing fields
- whether RAG was used
- whether deterministic tool output was used
- provider/model metadata where available

This will help identify which tax scenarios users ask about and where the agent fails to collect enough information.

## Error Handling

The agent should fail softly:

- If no intent is confident, answer as general tax chat with RAG and suggest a calculator.
- If a tool cannot run due to missing input, ask a follow-up question.
- If a deterministic tool throws, apologize and suggest the full calculator page.
- If RAG fails, continue with deterministic tool output.
- If the LLM provider fails after a tool result exists, return a simple deterministic summary rather than losing the calculation.

## Testing Strategy

Unit tests:

- Intent detection for each v1 scenario.
- Slot extraction for common EN/ZH/MS phrasing.
- Missing-field behavior for incomplete questions.
- Tool wrapper output matches existing engine tests.

Integration tests:

- `/api/chat` calls the agent orchestrator after auth and credit checks.
- Insufficient credits block before agent/provider work.
- Provider failure refunds credits.
- Tool answers do not contradict deterministic output.

Evaluation set:

- At least 50 multilingual sample questions for v1.
- Include ambiguous prompts that should trigger follow-up questions.
- Include boundary cases for SST thresholds, e-Invoice exemption, RPGT dates, and personal tax income period ambiguity.

## Rollout Plan

1. Add `src/lib/agent` types and registry with `personal_tax_calculator`, `e_invoice_phase_checker`, and `sst_checker`.
2. Move existing ad hoc deterministic context logic from `/api/chat` into the agent layer.
3. Add orchestrator tests for the first three scenarios.
4. Update `/api/chat` to call the orchestrator while preserving streaming, billing, and logging.
5. Add structured log fields for intent, tool, and missing inputs.
6. Add corporate and property tools after the first three pass evaluation.
7. Improve the chat UI with assumptions, calculator links, and clearer follow-up states.

## Open Decisions

- Whether v1 should expose visible "used tool" labels in the UI or only include assumptions in text. Recommendation: show assumptions in text first, avoid extra UI until behavior stabilizes.
- Whether extraction should stay regex-based or use model-generated JSON. Recommendation: start regex/schema-first for the first three tools, then add model extraction only where needed.
- Whether Chinese output should use Simplified Chinese only. Recommendation: use Simplified Chinese by default unless the user writes Traditional Chinese.

## Approval

Approved direction: build the first release as a website-embedded MYTax AI Agent, starting with personal tax, e-Invoice, and SST tool calls inside the existing Next.js application.
