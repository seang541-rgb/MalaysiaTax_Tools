import { describe, expect, it } from "vitest";
import {
  getTaxRateRuleSet,
  getTaxRates,
  TAX_RATES_YA2025,
} from "@/engine/tax-rates";
import {
  getReliefDefinitions,
  getReliefRuleSet,
  TAX_RELIEFS_YA2025,
} from "@/engine/tax-reliefs";

describe("tax rule data governance", () => {
  it("returns exact YA2025 tax rates with metadata", () => {
    const rules = getTaxRateRuleSet(2025);

    expect(rules).toMatchObject({
      yearOfAssessment: 2025,
      requestedYearOfAssessment: 2025,
      reviewed: expect.stringMatching(/^\d{4}-\d{2}$/),
    });
    expect(rules.sources.length).toBeGreaterThan(0);
    expect(rules.rates).toEqual(TAX_RATES_YA2025);
    expect(getTaxRates(2025)).toEqual(TAX_RATES_YA2025);
  });

  it("falls back to YA2025 explicitly for unverified future tax rates", () => {
    const rules = getTaxRateRuleSet(2026);

    expect(rules.yearOfAssessment).toBe(2025);
    expect(rules.requestedYearOfAssessment).toBe(2026);
    expect(rules.rates).toEqual(TAX_RATES_YA2025);
  });

  it("returns exact YA2025 reliefs with metadata", () => {
    const rules = getReliefRuleSet(2025);

    expect(rules).toMatchObject({
      yearOfAssessment: 2025,
      requestedYearOfAssessment: 2025,
      reviewed: expect.stringMatching(/^\d{4}-\d{2}$/),
    });
    expect(rules.sources.length).toBeGreaterThan(0);
    expect(rules.reliefs).toEqual(TAX_RELIEFS_YA2025);
    expect(getReliefDefinitions(2025)).toEqual(TAX_RELIEFS_YA2025);
  });

  it("falls back to YA2025 explicitly for unverified future reliefs", () => {
    const rules = getReliefRuleSet(2026);

    expect(rules.yearOfAssessment).toBe(2025);
    expect(rules.requestedYearOfAssessment).toBe(2026);
    expect(rules.reliefs).toEqual(TAX_RELIEFS_YA2025);
  });
});
