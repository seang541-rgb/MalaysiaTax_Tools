import { describe, it, expect } from "vitest";
import { checkEInvoicePhase } from "@/engine/e-invoice";

describe("checkEInvoicePhase", () => {
  it("exempts businesses with turnover <= RM1M", () => {
    const result = checkEInvoicePhase({ annualRevenue: 1000000 });
    expect(result.isExempt).toBe(true);
    expect(result.phase).toBeNull();
    expect(result.mandatoryDate).toBeNull();
  });

  it("exempts micro businesses (RM300k)", () => {
    const result = checkEInvoicePhase({ annualRevenue: 300000 });
    expect(result.isExempt).toBe(true);
  });

  it("Phase 4: RM1M < turnover <= RM5M, mandatory 1 Jan 2026", () => {
    const result = checkEInvoicePhase({ annualRevenue: 3000000 });
    expect(result.isExempt).toBe(false);
    expect(result.phase).toBe(4);
    expect(result.mandatoryDate).toBe("2026-01-01");
    expect(result.relaxationEnd).toBe("2027-12-31");
  });

  it("Phase 4 lower boundary: RM1,000,001 is in Phase 4", () => {
    const result = checkEInvoicePhase({ annualRevenue: 1000001 });
    expect(result.phase).toBe(4);
  });

  it("Phase 3: RM5M < turnover <= RM25M, mandatory 1 Jul 2025", () => {
    const result = checkEInvoicePhase({ annualRevenue: 10000000 });
    expect(result.phase).toBe(3);
    expect(result.mandatoryDate).toBe("2025-07-01");
  });

  it("Phase 3 boundary: exactly RM5M stays in Phase 4", () => {
    const result = checkEInvoicePhase({ annualRevenue: 5000000 });
    expect(result.phase).toBe(4);
  });

  it("Phase 2: RM25M < turnover <= RM100M, mandatory 1 Jan 2025", () => {
    const result = checkEInvoicePhase({ annualRevenue: 50000000 });
    expect(result.phase).toBe(2);
    expect(result.mandatoryDate).toBe("2025-01-01");
  });

  it("Phase 1: turnover > RM100M, mandatory 1 Aug 2024", () => {
    const result = checkEInvoicePhase({ annualRevenue: 150000000 });
    expect(result.phase).toBe(1);
    expect(result.mandatoryDate).toBe("2024-08-01");
  });

  it("Phase 1 boundary: exactly RM100M stays in Phase 2", () => {
    const result = checkEInvoicePhase({ annualRevenue: 100000000 });
    expect(result.phase).toBe(2);
  });

  it("handles zero and negative revenue as exempt", () => {
    expect(checkEInvoicePhase({ annualRevenue: 0 }).isExempt).toBe(true);
    expect(checkEInvoicePhase({ annualRevenue: -5 }).isExempt).toBe(true);
  });
});
