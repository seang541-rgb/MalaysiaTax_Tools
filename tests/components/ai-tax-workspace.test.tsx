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
    expect(screen.getByRole("complementary", { name: "Tax Context" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tax Context" })).toBeInTheDocument();
    expect(screen.getByText("Taxpayer type")).toBeInTheDocument();
    expect(screen.getByText("Year of assessment")).toBeInTheDocument();
    expect(screen.getByText("Income / revenue")).toBeInTheDocument();
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

  it("allows localized tax context copy", () => {
    render(
      <AiTaxWorkspace
        title="AI 税务助手"
        subtitle="直接提问。"
        creditHint="每次回答扣 1 credit"
        contextHint="税务背景"
        toolHint="可转去计算器"
        prompts={["公司买电脑怎样扣税？"]}
        contextPanelTitle="税务背景"
        contextPanelNote="保留旧版填表感。"
        contextApplyLabel="套用背景"
        contextFields={[
          ["纳税人类型", "Sdn Bhd"],
          ["估税年", "YA 2025"],
        ]}
      >
        <div>聊天区</div>
      </AiTaxWorkspace>
    );

    expect(screen.getByRole("complementary", { name: "税务背景" })).toBeInTheDocument();
    expect(screen.getByText("保留旧版填表感。")).toBeInTheDocument();
    expect(screen.getByText("纳税人类型")).toBeInTheDocument();
    expect(screen.getByText("Sdn Bhd")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "套用背景" })).toBeInTheDocument();
  });
});
