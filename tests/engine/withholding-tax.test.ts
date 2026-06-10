import { describe, it, expect } from "vitest";
import { calculateWithholdingTax } from "../../src/engine/withholding-tax";

describe("calculateWithholdingTax", () => {
  it("withholds 15% on interest (CP37)", () => {
    const r = calculateWithholdingTax({ paymentType: "interest", grossAmount: 100000 });
    expect(r.totalRate).toBe(15);
    expect(r.totalWht).toBe(15000);
    expect(r.netPayment).toBe(85000);
    expect(r.form).toBe("CP37");
  });

  it("withholds 10% on royalty", () => {
    const r = calculateWithholdingTax({ paymentType: "royalty", grossAmount: 50000 });
    expect(r.totalWht).toBe(5000);
    expect(r.form).toBe("CP37");
  });

  it("withholds 10% on special classes of income (CP37D)", () => {
    const r = calculateWithholdingTax({ paymentType: "special_4a", grossAmount: 80000 });
    expect(r.totalRate).toBe(10);
    expect(r.totalWht).toBe(8000);
    expect(r.form).toBe("CP37D");
  });

  it("withholds 10% + 3% on contract payments (CP37A)", () => {
    const r = calculateWithholdingTax({ paymentType: "contract", grossAmount: 200000 });
    expect(r.components).toHaveLength(2);
    expect(r.components[0].amount).toBe(20000);
    expect(r.components[1].amount).toBe(6000);
    expect(r.totalRate).toBe(13);
    expect(r.totalWht).toBe(26000);
    expect(r.netPayment).toBe(174000);
    expect(r.form).toBe("CP37A");
  });

  it("withholds 15% on public entertainer income (CP37E)", () => {
    const r = calculateWithholdingTax({ paymentType: "public_entertainer", grossAmount: 100000 });
    expect(r.totalRate).toBe(15);
    expect(r.form).toBe("CP37E");
  });

  it("applies a lower DTA treaty rate when provided", () => {
    const r = calculateWithholdingTax({ paymentType: "royalty", grossAmount: 100000, dtaRate: 8 });
    expect(r.dtaApplied).toBe(true);
    expect(r.totalRate).toBe(8);
    expect(r.totalWht).toBe(8000);
  });

  it("ignores a DTA rate that is not lower than the statutory rate", () => {
    const r = calculateWithholdingTax({ paymentType: "royalty", grossAmount: 100000, dtaRate: 12 });
    expect(r.dtaApplied).toBe(false);
    expect(r.totalRate).toBe(10);
  });

  it("does not apply DTA override to multi-component contract payments", () => {
    const r = calculateWithholdingTax({ paymentType: "contract", grossAmount: 100000, dtaRate: 5 });
    expect(r.dtaApplied).toBe(false);
    expect(r.totalRate).toBe(13);
  });

  it("handles zero gross amount", () => {
    const r = calculateWithholdingTax({ paymentType: "interest", grossAmount: 0 });
    expect(r.totalWht).toBe(0);
    expect(r.netPayment).toBe(0);
  });
});
