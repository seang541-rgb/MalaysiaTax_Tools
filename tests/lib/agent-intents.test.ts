import { describe, expect, it } from "vitest";
import { detectAgentIntent, detectAgentTool } from "@/lib/agent/intents";

describe("agent intents", () => {
  it("detects tool intent before deterministic tool execution", () => {
    expect(
      detectAgentTool("Service tax taxable revenue RM700k, need SST?")
    ).toBe("sst_checker");
    expect(
      detectAgentTool("Single employee monthly salary RM5000, estimate PCB.")
    ).toBe("pcb_calculator");
    expect(
      detectAgentTool(
        "My Sdn Bhd chargeable income RM800k, calculate corporate tax."
      )
    ).toBe("corporate_tax_calculator");
  });

  it("keeps priority rules out of the tool execution layer", () => {
    expect(
      detectAgentTool("Revenue RM3m, when is e-Invoice mandatory?")
    ).toBe("e_invoice_phase_checker");
    expect(
      detectAgentTool(
        "Batch PCB payroll: Ali monthly salary RM5000, Siti monthly salary RM8000."
      )
    ).toBe("batch_pcb_calculator");
  });

  it("returns confidence metadata for detected tool intents", () => {
    const intent = detectAgentIntent(
      "Service tax taxable revenue RM700k, need SST?"
    );

    expect(intent.toolName).toBe("sst_checker");
    expect(intent.confidence).toBeGreaterThanOrEqual(0.8);
    expect(intent.reason).toContain("sst");
  });

  it("returns low confidence metadata for general tax chat", () => {
    const intent = detectAgentIntent("What tax records should I keep?");

    expect(intent.toolName).toBeNull();
    expect(intent.confidence).toBeLessThan(0.5);
    expect(intent.reason).toContain("general");
  });

  it("detects Chinese payroll keywords for PCB and employer contributions", () => {
    expect(detectAgentTool("员工月薪 RM5000，每月扣税是多少？")).toBe(
      "pcb_calculator"
    );
    expect(detectAgentTool("月薪 RM5000，雇主要付多少公积金、社险和就业保险？")).toBe(
      "employer_contribution_calculator"
    );
  });
});
