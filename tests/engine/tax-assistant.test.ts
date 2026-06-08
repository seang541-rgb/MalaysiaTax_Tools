import { describe, it, expect } from "vitest";
import { getTaxAssistantResponse } from "../../src/engine/tax-assistant";

describe("getTaxAssistantResponse", () => {
  it("responds to greetings", () => {
    const reply = getTaxAssistantResponse("hi", "en");
    expect(reply).toContain("MYTax");
    expect(reply).toContain("tax assistant");
  });

  it("responds to Chinese greetings", () => {
    const reply = getTaxAssistantResponse("你好", "zh");
    expect(reply).toContain("税务助手");
  });

  it("responds to thanks", () => {
    const reply = getTaxAssistantResponse("thank you", "en");
    expect(reply).toContain("welcome");
  });

  it("calculates personal tax for salary query", () => {
    const reply = getTaxAssistantResponse("How much tax for RM5000 salary?", "en");
    expect(reply).toContain("Annual income");
    expect(reply).toContain("Annual tax payable");
    expect(reply).toContain("Personal Tax Calculator");
  });

  it("calculates personal tax in Chinese", () => {
    const reply = getTaxAssistantResponse("月薪 RM8000 要交多少税？", "zh");
    expect(reply).toContain("年收入");
    expect(reply).toContain("年度应缴税额");
  });

  it("explains corporate tax rates", () => {
    const reply = getTaxAssistantResponse("What is the corporate tax rate?", "en");
    expect(reply).toContain("15%");
    expect(reply).toContain("17%");
    expect(reply).toContain("24%");
    expect(reply).toContain("SME");
  });

  it("explains EPF rates", () => {
    const reply = getTaxAssistantResponse("How much EPF?", "en");
    expect(reply).toContain("13%");
    expect(reply).toContain("12%");
    expect(reply).toContain("RM20,000");
  });

  it("calculates EPF for specific salary", () => {
    const reply = getTaxAssistantResponse("EPF for RM3000 salary", "en");
    expect(reply).toContain("Employer");
    expect(reply).toContain("Employee");
    expect(reply).toContain("13%"); // <= 5000 so 13%
  });

  it("explains SOCSO", () => {
    const reply = getTaxAssistantResponse("What is SOCSO?", "en");
    expect(reply).toContain("1.75%");
    expect(reply).toContain("0.5%");
  });

  it("explains EIS", () => {
    const reply = getTaxAssistantResponse("Tell me about EIS", "en");
    expect(reply).toContain("0.2%");
  });

  it("explains SST", () => {
    const reply = getTaxAssistantResponse("What is SST?", "en");
    expect(reply).toContain("8%");
    expect(reply).toContain("RM500,000");
  });

  it("explains PCB", () => {
    const reply = getTaxAssistantResponse("What is PCB?", "en");
    expect(reply).toContain("Monthly Tax Deduction");
  });

  it("explains tax reliefs", () => {
    const reply = getTaxAssistantResponse("What tax reliefs are available?", "en");
    expect(reply).toContain("RM9,000");
    expect(reply).toContain("EPF");
  });

  it("returns fallback for unknown questions", () => {
    const reply = getTaxAssistantResponse("what is the meaning of life?", "en");
    expect(reply).toContain("not sure");
  });

  it("returns Chinese fallback for unknown questions", () => {
    const reply = getTaxAssistantResponse("今天天气怎么样？", "zh");
    expect(reply).toContain("不太理解");
  });
});
