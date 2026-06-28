import { describe, expect, it, vi } from "vitest";
import {
  buildAgentTurn,
  buildAgentTurnWithRetrieval,
  buildDeterministicFallbackAnswer,
} from "@/lib/agent/orchestrator";

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
    expect(result.llmMessages[0].content).toContain(
      "Calculator link: [SST Calculator](/sst)"
    );
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

  it("builds a plain deterministic fallback answer when provider text is unavailable", () => {
    const turn = buildAgentTurn({
      locale: "en",
      userMessage: "Single employee monthly gross salary RM5000, estimate PCB.",
      ragContext: "",
      messages: [
        {
          role: "user",
          content: "Single employee monthly gross salary RM5000, estimate PCB.",
        },
      ],
    });

    const fallback = buildDeterministicFallbackAnswer(turn.agentContext);

    expect(fallback).toContain("deterministic MYTax result");
    expect(fallback).toContain("Monthly PCB: RM108.25");
    expect(fallback).toContain("[PCB Calculator](/batch-pcb)");
    expect(fallback).not.toContain("IMPORTANT:");
    expect(fallback).not.toContain("END EXACT MYTAX FACTS");
  });

  it("localizes deterministic fallback framing for Chinese users", () => {
    const turn = buildAgentTurn({
      locale: "zh",
      userMessage: "Single employee monthly gross salary RM5000, estimate PCB.",
      ragContext: "",
      messages: [
        {
          role: "user",
          content: "Single employee monthly gross salary RM5000, estimate PCB.",
        },
      ],
    });

    const fallback = buildDeterministicFallbackAnswer(
      turn.agentContext,
      "zh"
    );

    expect(fallback).toContain("AI 说明服务暂时无法连接");
    expect(fallback).toContain("Monthly PCB: RM108.25");
  });

  it("builds a soft failure answer when a deterministic tool throws", () => {
    const result = buildAgentTurn({
      locale: "en",
      userMessage: "Service tax taxable revenue RM700k, do I need SST?",
      ragContext: "",
      messages: [
        {
          role: "user",
          content: "Service tax taxable revenue RM700k, do I need SST?",
        },
      ],
      buildContext: () => {
        throw new Error("engine unavailable");
      },
    });

    expect(result.agentFailureAnswer).toContain(
      "I could not complete the MYTax tool calculation"
    );
    expect(result.agentFailureAnswer).toContain("[MYTax calculators](/)");
    expect(result.usedDeterministic).toBe(false);
  });

  it("retrieves tax knowledge inside the agent orchestrator", async () => {
    const result = await buildAgentTurnWithRetrieval({
      locale: "en",
      userMessage:
        "Service tax taxable revenue RM700k, do I need SST registration?",
      messages: [
        {
          role: "user",
          content:
            "Service tax taxable revenue RM700k, do I need SST registration?",
        },
      ],
      retrieveContext: async (query) => {
        expect(query).toBe(
          "Service tax taxable revenue RM700k, do I need SST registration?"
        );
        return "\n\n--- Retrieved Tax Knowledge ---\nSST guide\n";
      },
    });

    expect(result.usedRag).toBe(true);
    expect(result.agentContext?.toolName).toBe("sst_checker");
    expect(result.llmMessages[0].content).toContain("Retrieved Tax Knowledge");
    expect(result.llmMessages[0].content).toContain("SST guide");
  });

  it("keeps deterministic agent context when retrieval fails", async () => {
    const result = await buildAgentTurnWithRetrieval({
      locale: "en",
      userMessage:
        "Service tax taxable revenue RM700k, do I need SST registration?",
      messages: [
        {
          role: "user",
          content:
            "Service tax taxable revenue RM700k, do I need SST registration?",
        },
      ],
      retrieveContext: async () => {
        throw new Error("embedding unavailable");
      },
    });

    expect(result.usedRag).toBe(false);
    expect(result.agentContext?.toolName).toBe("sst_checker");
    expect(result.llmMessages[0].content).toContain("EXACT MYTAX FACTS (SST)");
  });

  it("skips retrieval when the deterministic tool layer fails", async () => {
    const retrieveContext = vi.fn(async () => "retrieved");
    const result = await buildAgentTurnWithRetrieval({
      locale: "en",
      userMessage: "Service tax taxable revenue RM700k, do I need SST?",
      messages: [
        {
          role: "user",
          content: "Service tax taxable revenue RM700k, do I need SST?",
        },
      ],
      retrieveContext,
      buildContext: () => {
        throw new Error("tool unavailable");
      },
    });

    expect(result.agentFailureAnswer).toContain(
      "I could not complete the MYTax tool calculation"
    );
    expect(retrieveContext).not.toHaveBeenCalled();
  });
});
