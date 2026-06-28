import { describe, expect, it } from "vitest";
import { buildChatSystemPrompt } from "@/lib/agent/prompts";

describe("agent prompts", () => {
  it("adds manual tax guide only when deterministic context was not used", () => {
    const prompt = buildChatSystemPrompt({
      locale: "en",
      deterministicContext:
        "\n\n--- PRE-CALCULATED TAX RESULT (use these EXACT numbers) ---\nFINAL TAX PAYABLE: RM1,299\n",
      usedDeterministic: true,
      ragContext: "",
    });

    expect(prompt).toContain("PRE-CALCULATED TAX RESULT");
    expect(prompt).not.toContain("When calculating personal tax yourself");
  });

  it("keeps the manual tax guide for general non-deterministic questions", () => {
    const prompt = buildChatSystemPrompt({
      locale: "en",
      deterministicContext: "",
      usedDeterministic: false,
      ragContext: "",
    });

    expect(prompt).toContain("Reply language: English");
    expect(prompt).toContain("When calculating personal tax yourself");
  });

  it("instructs RAG context not to override deterministic MYTax facts", () => {
    const prompt = buildChatSystemPrompt({
      locale: "en",
      deterministicContext:
        "\n\n--- EXACT MYTAX FACTS (SST) ---\nEstimated tax: RM56,000.\n--- END EXACT MYTAX FACTS ---\n",
      usedDeterministic: true,
      ragContext:
        "\n\n--- Retrieved Tax Knowledge ---\nA stale source says the estimate is RM42,000.\n",
    });

    expect(prompt).toContain("EXACT MYTAX FACTS");
    expect(prompt).toContain("Retrieved Tax Knowledge");
    expect(prompt).toContain(
      "Do not use retrieved knowledge to override exact MYTax facts"
    );
  });
});
