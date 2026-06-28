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

  it("detects PCB monthly deduction questions before personal tax", () => {
    expect(
      detectAgentTool("Single employee monthly salary RM5000, estimate PCB.")
    ).toBe("pcb_calculator");
  });

  it("asks for monthly salary before PCB calculation", () => {
    const result = buildDeterministicAgentContext(
      "How much PCB should my employer deduct every month?"
    );

    expect(result.toolName).toBe("pcb_calculator");
    expect(result.needsFollowUp).toBe(true);
    expect(result.followUpQuestion).toContain("monthly gross salary");
  });

  it("builds exact PCB context from the deterministic engine", () => {
    const result = buildDeterministicAgentContext(
      "Single employee monthly gross salary RM5000, estimate PCB monthly tax deduction."
    );

    expect(result.toolName).toBe("pcb_calculator");
    expect(result.usedDeterministic).toBe(true);
    expect(result.context).toContain("EXACT MYTAX FACTS");
    expect(result.context).toContain("PCB monthly tax deduction (YA2025)");
    expect(result.context).toContain("Monthly gross salary: RM5,000");
    expect(result.context).toContain("Marital status: single");
    expect(result.context).toContain("Monthly PCB: RM108.25");
    expect(result.context).toContain("Annual PCB: RM1,299");
    expect(result.context).toContain("Annual tax: RM1,299");
  });

  it("builds exact PCB context with spouse and child relief assumptions", () => {
    const result = buildDeterministicAgentContext(
      "Married employee monthly gross salary RM8000, spouse no income, 2 children. Estimate PCB."
    );

    expect(result.toolName).toBe("pcb_calculator");
    expect(result.context).toContain("Marital status: married");
    expect(result.context).toContain("Spouse has income: no");
    expect(result.context).toContain("Children under 18: 2");
    expect(result.context).toContain("Monthly PCB: RM381.96");
  });

  it("detects employer contribution questions", () => {
    expect(
      detectAgentTool("Monthly salary RM5000, calculate employer EPF SOCSO EIS.")
    ).toBe("employer_contribution_calculator");
  });

  it("asks for monthly salary before employer contribution calculation", () => {
    const result = buildDeterministicAgentContext(
      "How much EPF SOCSO EIS must the employer pay?"
    );

    expect(result.toolName).toBe("employer_contribution_calculator");
    expect(result.needsFollowUp).toBe(true);
    expect(result.followUpQuestion).toContain("monthly gross salary");
  });

  it("builds exact employer contribution context for a Malaysian employee below 60", () => {
    const result = buildDeterministicAgentContext(
      "Employee monthly gross salary RM5000, age below 60, Malaysian. Calculate employer EPF SOCSO EIS."
    );

    expect(result.toolName).toBe("employer_contribution_calculator");
    expect(result.usedDeterministic).toBe(true);
    expect(result.context).toContain("EXACT MYTAX FACTS");
    expect(result.context).toContain("Employer statutory contributions (monthly)");
    expect(result.context).toContain("Monthly gross salary: RM5,000");
    expect(result.context).toContain("EPF employer: RM650");
    expect(result.context).toContain("SOCSO employer: RM87.5");
    expect(result.context).toContain("EIS employer: RM10");
    expect(result.context).toContain("Total employer portion: RM747.5");
    expect(result.context).toContain("Total employer cost: RM5,747.5");
  });

  it("builds exact employer contribution context for a non-Malaysian employee", () => {
    const result = buildDeterministicAgentContext(
      "Foreign employee monthly salary RM5000, below 60. Calculate employer EPF SOCSO EIS."
    );

    expect(result.toolName).toBe("employer_contribution_calculator");
    expect(result.context).toContain("Malaysian/PR: no");
    expect(result.context).toContain("SOCSO employer: RM0");
    expect(result.context).toContain("EIS employer: RM0");
    expect(result.context).toContain("Total employer portion: RM650");
  });

  it("detects corporate tax questions", () => {
    expect(
      detectAgentTool("My Sdn Bhd chargeable income is RM800k. Calculate corporate tax.")
    ).toBe("corporate_tax_calculator");
  });

  it("asks SME qualification follow-up when user asks for SME tax without details", () => {
    const result = buildDeterministicAgentContext(
      "My SME company chargeable income is RM800k. How much corporate tax?"
    );

    expect(result.toolName).toBe("corporate_tax_calculator");
    expect(result.needsFollowUp).toBe(true);
    expect(result.followUpQuestion).toContain("paid-up capital");
    expect(result.followUpQuestion).toContain("annual revenue");
  });

  it("builds exact SME corporate tax context when qualification details are present", () => {
    const result = buildDeterministicAgentContext(
      "My SME company chargeable income RM800k, paid-up capital RM1m, annual revenue RM20m. Calculate corporate tax."
    );

    expect(result.toolName).toBe("corporate_tax_calculator");
    expect(result.usedDeterministic).toBe(true);
    expect(result.context).toContain("EXACT MYTAX FACTS");
    expect(result.context).toContain("SME corporate tax (YA2025)");
    expect(result.context).toContain("SME qualified: yes");
    expect(result.context).toContain("Total tax: RM147,000");
  });

  it("builds exact standard corporate tax context for non-SME companies", () => {
    const result = buildDeterministicAgentContext(
      "Non-SME company chargeable income is RM800k. Calculate corporate tax."
    );

    expect(result.toolName).toBe("corporate_tax_calculator");
    expect(result.usedDeterministic).toBe(true);
    expect(result.context).toContain("Standard corporate tax (YA2025)");
    expect(result.context).toContain("Total tax: RM192,000");
  });

  it("detects RPGT property disposal questions", () => {
    expect(
      detectAgentTool("I sold a property for RM800k, bought for RM500k. Calculate RPGT.")
    ).toBe("rpgt_calculator");
  });

  it("asks for missing RPGT disposal details", () => {
    const result = buildDeterministicAgentContext(
      "How much RPGT do I pay when selling my property?"
    );

    expect(result.toolName).toBe("rpgt_calculator");
    expect(result.needsFollowUp).toBe(true);
    expect(result.followUpQuestion).toContain("disposal price");
    expect(result.followUpQuestion).toContain("acquisition price");
    expect(result.followUpQuestion).toContain("holding period");
  });

  it("builds exact RPGT context for a citizen or PR disposal within 3 years", () => {
    const result = buildDeterministicAgentContext(
      "Malaysian citizen sold property disposal price RM800k, acquisition price RM500k, held for 2 years. Calculate RPGT."
    );

    expect(result.toolName).toBe("rpgt_calculator");
    expect(result.usedDeterministic).toBe(true);
    expect(result.context).toContain("EXACT MYTAX FACTS");
    expect(result.context).toContain("RPGT property disposal (YA2025)");
    expect(result.context).toContain("Disposer type: citizen_pr");
    expect(result.context).toContain("Chargeable gain: RM300,000");
    expect(result.context).toContain("Schedule 4 exemption: RM30,000");
    expect(result.context).toContain("RPGT rate: 30%");
    expect(result.context).toContain("RPGT payable: RM81,000");
  });

  it("builds exact RPGT context for a company disposal after 6 years", () => {
    const result = buildDeterministicAgentContext(
      "Company sold property disposal price RM800k, acquisition price RM500k, held for 7 years. Calculate RPGT."
    );

    expect(result.toolName).toBe("rpgt_calculator");
    expect(result.context).toContain("Disposer type: company");
    expect(result.context).toContain("Schedule 4 exemption: RM0");
    expect(result.context).toContain("RPGT rate: 10%");
    expect(result.context).toContain("RPGT payable: RM30,000");
  });

  it("detects property stamp duty questions", () => {
    expect(
      detectAgentTool("Property price RM500k, loan amount RM450k. Calculate stamp duty.")
    ).toBe("stamp_duty_calculator");
  });

  it("asks for property price before stamp duty calculation", () => {
    const result = buildDeterministicAgentContext(
      "How much stamp duty do I pay when buying a house?"
    );

    expect(result.toolName).toBe("stamp_duty_calculator");
    expect(result.needsFollowUp).toBe(true);
    expect(result.followUpQuestion).toContain("property price");
  });

  it("builds exact stamp duty context for a citizen or PR buyer with a loan", () => {
    const result = buildDeterministicAgentContext(
      "Citizen buyer property price RM500k, loan amount RM450k. Calculate stamp duty."
    );

    expect(result.toolName).toBe("stamp_duty_calculator");
    expect(result.usedDeterministic).toBe(true);
    expect(result.context).toContain("EXACT MYTAX FACTS");
    expect(result.context).toContain("Property stamp duty (YA2025)");
    expect(result.context).toContain("Buyer type: citizen_pr");
    expect(result.context).toContain("Property price: RM500,000");
    expect(result.context).toContain("MOT duty before exemption: RM9,000");
    expect(result.context).toContain("Loan agreement duty before exemption: RM2,250");
    expect(result.context).toContain("Total stamp duty: RM11,250");
  });

  it("builds exact stamp duty context for an eligible first-time buyer", () => {
    const result = buildDeterministicAgentContext(
      "First-time home buyer property price RM450k, loan amount RM400k. Calculate stamp duty."
    );

    expect(result.toolName).toBe("stamp_duty_calculator");
    expect(result.context).toContain("First-time exemption applied: yes");
    expect(result.context).toContain("MOT duty before exemption: RM8,000");
    expect(result.context).toContain("Total stamp duty: RM0");
  });

  it("detects withholding tax questions", () => {
    expect(
      detectAgentTool("Royalty payment to non-resident RM50k, calculate withholding tax.")
    ).toBe("withholding_tax_calculator");
  });

  it("asks for gross amount before withholding tax calculation", () => {
    const result = buildDeterministicAgentContext(
      "How much withholding tax for royalty paid to a non-resident?"
    );

    expect(result.toolName).toBe("withholding_tax_calculator");
    expect(result.needsFollowUp).toBe(true);
    expect(result.followUpQuestion).toContain("gross payment amount");
  });

  it("builds exact withholding tax context for royalty payments", () => {
    const result = buildDeterministicAgentContext(
      "Royalty payment to non-resident gross amount RM50k. Calculate withholding tax."
    );

    expect(result.toolName).toBe("withholding_tax_calculator");
    expect(result.usedDeterministic).toBe(true);
    expect(result.context).toContain("EXACT MYTAX FACTS");
    expect(result.context).toContain("Withholding tax on non-resident payment (YA2025)");
    expect(result.context).toContain("Payment type: royalty");
    expect(result.context).toContain("Gross amount: RM50,000");
    expect(result.context).toContain("Total withholding tax rate: 10%");
    expect(result.context).toContain("Total withholding tax: RM5,000");
    expect(result.context).toContain("Net payment: RM45,000");
    expect(result.context).toContain("Form: CP37");
  });

  it("builds exact withholding tax context for contract payments", () => {
    const result = buildDeterministicAgentContext(
      "Contract payment to non-resident contractor gross amount RM200k. Calculate WHT."
    );

    expect(result.toolName).toBe("withholding_tax_calculator");
    expect(result.context).toContain("Payment type: contract");
    expect(result.context).toContain("Component contractor: 10% = RM20,000");
    expect(result.context).toContain("Component employees: 3% = RM6,000");
    expect(result.context).toContain("Total withholding tax rate: 13%");
    expect(result.context).toContain("Total withholding tax: RM26,000");
    expect(result.context).toContain("Form: CP37A");
  });

  it("applies lower DTA rate in withholding tax context", () => {
    const result = buildDeterministicAgentContext(
      "Royalty payment to non-resident gross amount RM100k, DTA rate 8%. Calculate withholding tax."
    );

    expect(result.toolName).toBe("withholding_tax_calculator");
    expect(result.context).toContain("DTA applied: yes");
    expect(result.context).toContain("Total withholding tax rate: 8%");
    expect(result.context).toContain("Total withholding tax: RM8,000");
  });
});
