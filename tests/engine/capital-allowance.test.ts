import { describe, it, expect } from "vitest";
import { calculateCapitalAllowance } from "@/engine/capital-allowance";

describe("calculateCapitalAllowance", () => {
  it("general plant & machinery: RM50,000 over ~6 years (20% IA + 14% AA)", () => {
    const result = calculateCapitalAllowance({
      assetType: "general_pm",
      cost: 50000,
    });
    expect(result.qualifyingExpenditure).toBe(50000);
    // Year 1: IA 10,000 + AA 7,000 = 17,000
    expect(result.schedule[0].initialAllowance).toBe(10000);
    expect(result.schedule[0].annualAllowance).toBe(7000);
    expect(result.schedule[0].residualExpenditure).toBe(33000);
    // Total claimed = QE
    const total = result.schedule.reduce((s, r) => s + r.totalAllowance, 0);
    expect(Math.round(total * 100) / 100).toBe(50000);
    expect(result.yearsToFullClaim).toBe(6);
  });

  it("ICT equipment: 20% + 20% fully claimed in 4 years", () => {
    const result = calculateCapitalAllowance({ assetType: "ict", cost: 10000 });
    // Y1: 2000 + 2000 = 4000; Y2: 2000; Y3: 2000; Y4: 2000
    expect(result.yearsToFullClaim).toBe(4);
    expect(result.schedule[0].totalAllowance).toBe(4000);
    expect(result.schedule[3].residualExpenditure).toBe(0);
  });

  it("small value asset: 100% write-off in year 1", () => {
    const result = calculateCapitalAllowance({
      assetType: "small_value",
      cost: 1800,
    });
    expect(result.yearsToFullClaim).toBe(1);
    expect(result.schedule[0].annualAllowance).toBe(1800);
    expect(result.schedule[0].residualExpenditure).toBe(0);
  });

  it("motor vehicle: QE capped at RM100k for new vehicle <= RM150k", () => {
    const result = calculateCapitalAllowance({
      assetType: "motor_vehicle",
      cost: 140000,
      isNewVehicleUnder150k: true,
    });
    expect(result.qualifyingExpenditure).toBe(100000);
    // Y1: IA 20k + AA 20k = 40k
    expect(result.schedule[0].totalAllowance).toBe(40000);
  });

  it("motor vehicle: QE capped at RM50k otherwise", () => {
    const result = calculateCapitalAllowance({
      assetType: "motor_vehicle",
      cost: 200000,
      isNewVehicleUnder150k: false,
    });
    expect(result.qualifyingExpenditure).toBe(50000);
  });

  it("industrial building: 10% IA + 3% AA takes 31 years", () => {
    const result = calculateCapitalAllowance({
      assetType: "industrial_building",
      cost: 1000000,
    });
    // Y1: 100k + 30k = 130k; residual 870k; 870/30 = 29 more years
    expect(result.schedule[0].totalAllowance).toBe(130000);
    expect(result.yearsToFullClaim).toBe(30);
    const total = result.schedule.reduce((s, r) => s + r.totalAllowance, 0);
    expect(Math.round(total)).toBe(1000000);
  });

  it("final year never over-claims", () => {
    const result = calculateCapitalAllowance({
      assetType: "heavy_machinery",
      cost: 33333,
    });
    const last = result.schedule[result.schedule.length - 1];
    expect(last.residualExpenditure).toBe(0);
    const total = result.schedule.reduce((s, r) => s + r.totalAllowance, 0);
    expect(Math.round(total * 100) / 100).toBe(33333);
  });

  it("zero cost produces empty schedule", () => {
    const result = calculateCapitalAllowance({ assetType: "ict", cost: 0 });
    expect(result.schedule).toHaveLength(0);
    expect(result.yearsToFullClaim).toBe(0);
  });
});
