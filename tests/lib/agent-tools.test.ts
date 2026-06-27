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
