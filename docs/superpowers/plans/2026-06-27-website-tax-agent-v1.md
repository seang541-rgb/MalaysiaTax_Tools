# Website Tax Agent v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first website-embedded MYTax AI Agent layer with deterministic tool calls for personal tax, e-Invoice, and SST.

**Architecture:** Add a focused `src/lib/agent/` service layer that detects the tax scenario, extracts slots, checks missing inputs, runs existing `src/engine/*` functions, and formats exact deterministic facts for `/api/chat`. The existing route keeps auth, credit billing, streaming, RAG, and provider handling while delegating tool-specific pre-calculation logic to the agent layer.

**Tech Stack:** Next.js App Router route handlers, TypeScript, Vitest, existing MYTax tax engines, Supabase-backed chat route, OpenAI-compatible LLM provider.

## Global Constraints

- The language model must not calculate tax amounts by itself.
- All numeric tax calculations must come from deterministic `src/engine/*` modules.
- v1 starts with `personal_tax_calculator`, `e_invoice_phase_checker`, and `sst_checker`.
- `/api/chat` remains the public route.
- `POST /api/chat` continues to require login and consume the existing AI question credit.
- RAG supports explanations but must not override deterministic tool output.
- Answers must label assumptions and remain for reference only.
- Follow TDD: write a failing test, watch it fail, then implement the minimum code.

---

### Task 1: Agent Tool Layer

**Files:**
- Create: `src/lib/agent/types.ts`
- Create: `src/lib/agent/slots.ts`
- Create: `src/lib/agent/tools.ts`
- Create: `tests/lib/agent-tools.test.ts`

**Interfaces:**
- Produces: `buildDeterministicAgentContext(message: string): AgentContextResult`
- Produces: `detectAgentTool(message: string): AgentToolName | null`
- Produces: `extractMoneyAmount(message: string): number | null`
- Consumes: `calculatePersonalTax`, `checkEInvoicePhase`, `calculateSst`

- [ ] **Step 1: Write failing tests**

Add `tests/lib/agent-tools.test.ts` with tests for:

```ts
import { describe, expect, it } from "vitest";
import {
  buildDeterministicAgentContext,
  detectAgentTool,
  extractMoneyAmount,
} from "@/lib/agent/tools";

describe("agent tools", () => {
  it("extracts RM amounts with k, million, and juta suffixes", () => {
    expect(extractMoneyAmount("RM700k revenue")).toBe(700000);
    expect(extractMoneyAmount("RM3 million turnover")).toBe(3000000);
    expect(extractMoneyAmount("hasil RM2 juta")).toBe(2000000);
  });

  it("detects e-Invoice questions before generic revenue tools", () => {
    expect(detectAgentTool("Revenue RM3m, when is e-Invoice mandatory?")).toBe(
      "e_invoice_phase_checker"
    );
  });

  it("builds exact e-Invoice context from the deterministic engine", () => {
    const result = buildDeterministicAgentContext(
      "My company revenue is RM3m, do I need e-Invoice?"
    );
    expect(result.toolName).toBe("e_invoice_phase_checker");
    expect(result.context).toContain("EXACT MYTAX FACTS");
    expect(result.context).toContain("Phase 4");
    expect(result.context).toContain("2026-01-01");
  });

  it("asks a concise SST follow-up when tax type is unclear", () => {
    const result = buildDeterministicAgentContext(
      "My revenue is RM700k, do I need SST?"
    );
    expect(result.toolName).toBe("sst_checker");
    expect(result.needsFollowUp).toBe(true);
    expect(result.followUpQuestion).toContain("sales tax or service tax");
  });

  it("builds exact SST context when service tax is clear", () => {
    const result = buildDeterministicAgentContext(
      "Service tax revenue RM700k, do I need SST?"
    );
    expect(result.toolName).toBe("sst_checker");
    expect(result.context).toContain("registration is required");
    expect(result.context).toContain("RM700,000");
  });

  it("builds personal tax context for monthly salary questions", () => {
    const result = buildDeterministicAgentContext(
      "I am single and my monthly salary is RM8000. How much personal income tax?"
    );
    expect(result.toolName).toBe("personal_tax_calculator");
    expect(result.context).toContain("PRE-CALCULATED TAX RESULT");
    expect(result.context).toContain("RM8,000 per month");
    expect(result.context).toContain("FINAL TAX PAYABLE");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/agent-tools.test.ts`

Expected: FAIL because `@/lib/agent/tools` does not exist.

- [ ] **Step 3: Implement minimal agent tool layer**

Create the three agent files and implement only the first three tools. Reuse existing engine functions. Keep the output as deterministic prompt context so `/api/chat` can use it without changing the streaming contract.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/agent-tools.test.ts`

Expected: PASS.

### Task 2: Route Integration

**Files:**
- Modify: `src/app/api/chat/route.ts`
- Test: `tests/lib/agent-tools.test.ts`

**Interfaces:**
- Consumes: `buildDeterministicAgentContext(message: string): AgentContextResult`
- Preserves: existing `/api/chat` auth, credit, RAG, LLM streaming, and refund behavior.

- [ ] **Step 1: Write failing integration-oriented test**

Extend `tests/lib/agent-tools.test.ts` with:

```ts
it("returns follow-up context without deterministic calculation when SST type is missing", () => {
  const result = buildDeterministicAgentContext("RM700k SST need register?");
  expect(result.needsFollowUp).toBe(true);
  expect(result.context).toContain("FOLLOW-UP REQUIRED");
  expect(result.usedDeterministic).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/agent-tools.test.ts`

Expected: FAIL until the result includes a follow-up context and `usedDeterministic: false`.

- [ ] **Step 3: Update `/api/chat` to call the agent**

Replace local deterministic/e-Invoice/SST/personal pre-calculation branching with `buildDeterministicAgentContext(userMessage)`. Append the returned `context` to the system prompt. Continue using existing RAG retrieval and LLM streaming behavior.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- tests/lib/agent-tools.test.ts tests/billing/chat-billing-route.test.ts`

Expected: PASS.

### Task 3: Logging Metadata

**Files:**
- Modify: `src/lib/ai-chat-log.ts`
- Modify: `src/app/api/chat/route.ts`
- Modify: `supabase/ai-chat-logs.sql`
- Test: `tests/lib/agent-tools.test.ts`

**Interfaces:**
- Consumes: `AgentContextResult.toolName`, `needsFollowUp`, `missingFields`
- Produces: best-effort log fields for agent intent/tool usage.

- [ ] **Step 1: Write a failing TypeScript-level expectation**

Add a compile-covered call site in `/api/chat` that passes `agentToolName`, `agentNeedsFollowUp`, and `agentMissingFields` to `logChatInteraction`.

- [ ] **Step 2: Run type/lint verification to see the mismatch**

Run: `npm run lint`

Expected: FAIL because `logChatInteraction` does not yet accept the new fields.

- [ ] **Step 3: Extend logging helper and SQL schema**

Add optional fields to `logChatInteraction` input and insert payload. Add nullable columns to `supabase/ai-chat-logs.sql`.

- [ ] **Step 4: Run lint**

Run: `npm run lint`

Expected: PASS.

### Task 4: Final Verification

**Files:**
- All files touched above.

- [ ] **Step 1: Run focused tests**

Run: `npm test -- tests/lib/agent-tools.test.ts tests/billing/chat-billing-route.test.ts`

Expected: PASS.

- [ ] **Step 2: Run full test suite**

Run: `npm test`

Expected: PASS.

- [ ] **Step 3: Run lint**

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 4: Review diff**

Run: `git diff --stat` and `git diff --check`

Expected: only agent, chat route, logging, SQL, tests, and plan files changed; no whitespace errors.
