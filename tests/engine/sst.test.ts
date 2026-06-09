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

  // ─── 1 July 2025 service tax expansion ───

  it("rental/leasing: 8% with RM1M threshold", () => {
    const below = calculateSst({
      taxableRevenue: 900000,
      taxType: "service",
      serviceCategory: "rental",
    });
    expect(below.isRegistrationRequired).toBe(false);

    const above = calculateSst({
      taxableRevenue: 1200000,
      taxType: "service",
      serviceCategory: "rental",
    });
    expect(above.isRegistrationRequired).toBe(true);
    expect(above.taxRate).toBe(8);
    expect(above.estimatedTax).toBe(96000);
    expect(above.registrationThreshold).toBe(1000000);
  });

  it("construction: 6% with RM1.5M threshold", () => {
    const result = calculateSst({
      taxableRevenue: 2000000,
      taxType: "service",
      serviceCategory: "construction",
    });
    expect(result.isRegistrationRequired).toBe(true);
    expect(result.taxRate).toBe(6);
    expect(result.estimatedTax).toBe(120000);
    expect(result.registrationThreshold).toBe(1500000);
  });

  it("financial services: 8% with RM1M threshold", () => {
    const result = calculateSst({
      taxableRevenue: 1000000,
      taxType: "service",
      serviceCategory: "financial",
    });
    expect(result.isRegistrationRequired).toBe(true);
    expect(result.taxRate).toBe(8);
  });

  it("private healthcare: 6% with RM1.5M threshold", () => {
    const result = calculateSst({
      taxableRevenue: 1400000,
      taxType: "service",
      serviceCategory: "healthcare",
    });
    expect(result.isRegistrationRequired).toBe(false);
    expect(result.registrationThreshold).toBe(1500000);
  });

  it("education: 6% with no threshold (registrable from any revenue)", () => {
    const result = calculateSst({
      taxableRevenue: 100000,
      taxType: "service",
      serviceCategory: "education",
    });
    expect(result.isRegistrationRequired).toBe(true);
    expect(result.taxRate).toBe(6);
    expect(result.estimatedTax).toBe(6000);

    const zero = calculateSst({
      taxableRevenue: 0,
      taxType: "service",
      serviceCategory: "education",
    });
    expect(zero.isRegistrationRequired).toBe(false);
  });

  it("F&B: 6% with RM1.5M threshold", () => {
    const result = calculateSst({
      taxableRevenue: 1500000,
      taxType: "service",
      serviceCategory: "fnb",
    });
    expect(result.isRegistrationRequired).toBe(true);
    expect(result.taxRate).toBe(6);
    expect(result.estimatedTax).toBe(90000);
  });
});
