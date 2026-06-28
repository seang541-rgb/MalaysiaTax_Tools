import { describe, expect, it } from "vitest";
import { detectAgentTool } from "@/lib/agent/intents";

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
});
