import { describe, expect, it } from "vitest";
import {
  compareJointVsSeparate,
  poolReliefsForJoint,
  type SpouseTaxProfile,
} from "@/engine/joint-assessment";

function emptyIncome() {
  return {
    employment: 0,
    commission: 0,
    rental: 0,
    interest: 0,
    dividend: 0,
    other: 0,
  };
}

function profile(partial: Partial<SpouseTaxProfile> = {}): SpouseTaxProfile {
  return {
    income: emptyIncome(),
    reliefs: [{ reliefId: "individual", amount: 9000 }],
    zakatAmount: 0,
    monthlyPcbPaid: 0,
    ...partial,
  };
}

describe("poolReliefsForJoint", () => {
  it("caps a shared relief at its statutory max instead of summing", () => {
    const pooled = poolReliefsForJoint(
      [{ reliefId: "individual", amount: 9000 }],
      [{ reliefId: "individual", amount: 9000 }],
      2025
    );
    const individual = pooled.find((r) => r.reliefId === "individual");
    // 9000 + 9000 must not become 18000 — one personal relief only.
    expect(individual?.amount).toBe(9000);
  });

  it("pools contributions toward a single shared cap", () => {
    const pooled = poolReliefsForJoint(
      [{ reliefId: "lifestyle", amount: 1500 }],
      [{ reliefId: "lifestyle", amount: 2000 }],
      2025
    );
    const lifestyle = pooled.find((r) => r.reliefId === "lifestyle");
    // 1500 + 2000 = 3500, capped at the RM2,500 lifestyle max.
    expect(lifestyle?.amount).toBe(2500);
  });

  it("always grants the RM4,000 spouse relief under joint assessment", () => {
    const pooled = poolReliefsForJoint(
      [{ reliefId: "individual", amount: 9000 }],
      [{ reliefId: "individual", amount: 9000 }],
      2025
    );
    const spouse = pooled.find((r) => r.reliefId === "spouse");
    expect(spouse?.amount).toBe(4000);
  });
});

describe("compareJointVsSeparate", () => {
  it("recommends separate assessment when both spouses earn well", () => {
    const result = compareJointVsSeparate({
      yearOfAssessment: 2025,
      spouse1: profile({ income: { ...emptyIncome(), employment: 200000 } }),
      spouse2: profile({ income: { ...emptyIncome(), employment: 180000 } }),
    });

    expect(result.recommended).toBe("separate");
    expect(result.separateTax).toBeLessThan(result.jointTax);
    expect(result.saving).toBeGreaterThan(0);
  });

  it("recommends joint assessment when one spouse has no income", () => {
    const result = compareJointVsSeparate({
      yearOfAssessment: 2025,
      spouse1: profile({ income: { ...emptyIncome(), employment: 60000 } }),
      spouse2: profile({ income: emptyIncome() }),
    });

    expect(result.recommended).toBe("joint");
    expect(result.jointTax).toBeLessThan(result.separateTax);
    // The non-earning spouse contributes the RM4,000 spouse relief under joint.
    expect(result.saving).toBeGreaterThan(0);
  });

  it("reports separate total as the sum of each spouse's liability", () => {
    const result = compareJointVsSeparate({
      yearOfAssessment: 2025,
      spouse1: profile({ income: { ...emptyIncome(), employment: 80000 } }),
      spouse2: profile({ income: { ...emptyIncome(), employment: 70000 } }),
    });

    const sum =
      result.separate.spouse1.taxAfterRebateAndZakat +
      result.separate.spouse1.dividendTax +
      result.separate.spouse2.taxAfterRebateAndZakat +
      result.separate.spouse2.dividendTax;

    expect(result.separateTax).toBeCloseTo(sum, 2);
  });

  it("saving is the absolute gap between the two methods", () => {
    const result = compareJointVsSeparate({
      yearOfAssessment: 2025,
      spouse1: profile({ income: { ...emptyIncome(), employment: 120000 } }),
      spouse2: profile({ income: { ...emptyIncome(), employment: 5000 } }),
    });

    expect(result.saving).toBeCloseTo(
      Math.abs(result.separateTax - result.jointTax),
      2
    );
  });
});
