import { describe, it, expect } from "vitest";
import { calculateSst } from "@/engine/sst";

describe("calculateSst", () => {
  it("returns zero tax if below registration threshold", () => {
    const result = calculateSst({
      taxableRevenue: 400000,
      taxType: "service",
    });
    expect(result.isRegistrationRequired).toBe(false);
    expect(result.estimatedTax).toBe(0);
    expect(result.monthlyTax).toBe(0);
  });

  it("requires registration at RM500k threshold", () => {
    const result = calculateSst({
      taxableRevenue: 500000,
      taxType: "service",
    });
    expect(result.isRegistrationRequired).toBe(true);
    expect(result.registrationThreshold).toBe(500000);
  });

  it("calculates service tax at 8%", () => {
    const result = calculateSst({
      taxableRevenue: 1000000,
      taxType: "service",
    });
    expect(result.taxRate).toBe(8);
    expect(result.estimatedTax).toBe(80000);
    expect(result.monthlyTax).toBeCloseTo(6666.67, 1);
  });

  it("calculates sales tax at 10% (default)", () => {
    const result = calculateSst({
      taxableRevenue: 1000000,
      taxType: "sales",
    });
    expect(result.taxRate).toBe(10);
    expect(result.estimatedTax).toBe(100000);
  });

  it("calculates sales tax at 5%", () => {
    const result = calculateSst({
      taxableRevenue: 1000000,
      taxType: "sales",
      salesTaxRate: 5,
    });
    expect(result.taxRate).toBe(5);
    expect(result.estimatedTax).toBe(50000);
  });

  it("returns zero for zero revenue", () => {
    const result = calculateSst({
      taxableRevenue: 0,
      taxType: "service",
    });
    expect(result.isRegistrationRequired).toBe(false);
    expect(result.estimatedTax).toBe(0);
  });

  it("borderline: exactly at threshold", () => {
    const result = calculateSst({
      taxableRevenue: 500000,
      taxType: "sales",
      salesTaxRate: 10,
    });
    expect(result.isRegistrationRequired).toBe(true);
    expect(result.estimatedTax).toBe(50000);
  });
});
