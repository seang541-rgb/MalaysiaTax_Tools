import { describe, expect, it } from "vitest";
import { buildAgentTurn } from "@/lib/agent/orchestrator";

describe("agent orchestrator", () => {
  it("builds LLM messages with deterministic tool context and metadata", () => {
    const result = buildAgentTurn({
      locale: "en",
      userMessage:
        "Service tax taxable revenue RM700k, do I need SST registration?",
      ragContext: "",
      messages: [
        {
          role: "user",
          content:
            "Service tax taxable revenue RM700k, do I need SST registration?",
        },
      ],
    });

    expect(result.agentContext?.toolName).toBe("sst_checker");
    expect(result.usedDeterministic).toBe(true);
    expect(result.usedRag).toBe(false);
    expect(result.usedPrecalc).toBe(false);
    expect(result.llmMessages[0]).toMatchObject({ role: "system" });
    expect(result.llmMessages[0].content).toContain("EXACT MYTAX FACTS (SST)");
    expect(result.llmMessages[1]).toEqual({
      role: "user",
      content:
        "Service tax taxable revenue RM700k, do I need SST registration?",
    });
  });

  it("preserves follow-up metadata when a tool needs more details", () => {
    const result = buildAgentTurn({
      locale: "en",
      userMessage: "Should my spouse and I choose joint assessment?",
      ragContext: "\n\n--- Retrieved Tax Knowledge ---\nsource\n",
      messages: [
        {
          role: "user",
          content: "Should my spouse and I choose joint assessment?",
        },
      ],
    });

    expect(result.agentContext?.toolName).toBe("joint_assessment_calculator");
    expect(result.agentContext?.needsFollowUp).toBe(true);
    expect(result.agentContext?.missingFields.map((field) => field.field)).toEqual([
      "spouse1AnnualIncome",
      "spouse2AnnualIncome",
    ]);
    expect(result.usedRag).toBe(true);
    expect(result.llmMessages[0].content).toContain("FOLLOW-UP REQUIRED");
    expect(result.llmMessages[0].content).toContain("Retrieved Tax Knowledge");
  });
});
