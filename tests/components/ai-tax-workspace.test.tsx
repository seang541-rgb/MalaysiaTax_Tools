import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AiTaxWorkspace } from "@/components/ai-tax-workspace";

describe("AiTaxWorkspace", () => {
  it("keeps AI Tax chat-first instead of forcing context form fields", () => {
    render(
      <AiTaxWorkspace
        title="AI Tax Assistant"
        subtitle="Ask me anything about Malaysia taxes."
        creditHint="1 credit per AI answer"
        contextHint="Malaysia tax context"
        toolHint="Can route to calculators"
        prompts={[
          "How much tax for RM5000 salary?",
          "What business expenses are not deductible?",
        ]}
      >
        <div>Chat component</div>
      </AiTaxWorkspace>
    );

    expect(screen.getByRole("heading", { name: "AI Tax Assistant" })).toBeInTheDocument();
    expect(screen.getByText("Chat component")).toBeInTheDocument();
    expect(screen.getByText("1 credit per AI answer")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "How much tax for RM5000 salary?" })).toBeInTheDocument();
    expect(screen.queryByLabelText(/tax area/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/assessment year/i)).not.toBeInTheDocument();
  });

  it("emits selected prompt text for the chat input", () => {
    const selectedPrompts: string[] = [];
    window.addEventListener("mytax:ai-prompt", ((event: CustomEvent<string>) => {
      selectedPrompts.push(event.detail);
    }) as EventListener);

    render(
      <AiTaxWorkspace
        title="AI Tax Assistant"
        subtitle="Ask me anything about Malaysia taxes."
        creditHint="1 credit per AI answer"
        contextHint="Malaysia tax context"
        toolHint="Can route to calculators"
        prompts={["How much tax for RM5000 salary?"]}
      >
        <div>Chat component</div>
      </AiTaxWorkspace>
    );

    fireEvent.click(
      screen.getByRole("button", { name: "How much tax for RM5000 salary?" })
    );

    expect(selectedPrompts).toEqual(["How much tax for RM5000 salary?"]);
  });
});
