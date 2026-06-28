import { describe, expect, it } from "vitest";
import { buildDeterministicAgentContext, detectAgentTool } from "@/lib/agent/tools";
import { AGENT_EVAL_CORPUS } from "@/lib/agent/eval-corpus";

describe("agent eval corpus", () => {
  it("contains at least 50 multilingual v1 sample questions", () => {
    expect(AGENT_EVAL_CORPUS.length).toBeGreaterThanOrEqual(50);
    expect(new Set(AGENT_EVAL_CORPUS.map((item) => item.locale))).toEqual(
      new Set(["en", "zh", "ms"])
    );
  });

  it("routes corpus questions to the expected deterministic tool behavior", () => {
    for (const item of AGENT_EVAL_CORPUS) {
      expect(detectAgentTool(item.message), item.id).toBe(item.expectedTool);

      const result = buildDeterministicAgentContext(item.message);
      expect(result.toolName, item.id).toBe(item.expectedTool);
      expect(result.needsFollowUp, item.id).toBe(item.needsFollowUp);
      expect(result.calculatorPath, item.id).toBeTruthy();
    }
  });

  it("keeps explicit missing-input examples in the corpus", () => {
    expect(
      AGENT_EVAL_CORPUS.filter((item) => item.needsFollowUp).length
    ).toBeGreaterThanOrEqual(8);
  });
});
