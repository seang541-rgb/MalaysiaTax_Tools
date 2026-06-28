import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("chat route cleanup", () => {
  it("keeps deterministic tax tool logic out of the route handler", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/api/chat/route.ts"),
      "utf8"
    );

    expect(source).not.toContain("_extractIncomeAmount");
    expect(source).not.toContain("_getDeterministicContext");
    expect(source).not.toContain("_preCalculateTax");
    expect(source).not.toContain("_formatPreCalculation");
    expect(source).not.toContain("calculateCorporateTax");
    expect(source).not.toContain("buildDeterministicAgentContext");
    expect(source).not.toContain("buildChatSystemPrompt");
    expect(source).toContain("buildAgentTurn");
  });
});
