import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("AI logs agent observability", () => {
  it("selects and renders agent tool metadata on the admin log page", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/[locale]/admin/ai-logs/page.tsx"),
      "utf8"
    );

    expect(source).toContain("agent_tool_name");
    expect(source).toContain("agent_needs_follow_up");
    expect(source).toContain("agent_missing_fields");
    expect(source).toContain("Agent 工具");
    expect(source).toContain("需追问");
  });
});
