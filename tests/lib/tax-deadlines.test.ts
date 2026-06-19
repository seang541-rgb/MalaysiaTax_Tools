import { describe, it, expect } from "vitest";
import { nextOccurrences } from "../../src/lib/tax-deadlines";

describe("nextOccurrences", () => {
  it("returns all four deadlines sorted soonest first", () => {
    const r = nextOccurrences(new Date(2026, 5, 13)); // 13 Jun 2026
    expect(r).toHaveLength(4);
    for (let i = 1; i < r.length; i++) {
      expect(r[i].daysRemaining).toBeGreaterThanOrEqual(r[i - 1].daysRemaining);
    }
  });

  it("rolls passed deadlines to next year", () => {
    const r = nextOccurrences(new Date(2026, 5, 13)); // mid-June: Apr/May passed
    const be = r.find((d) => d.id === "bePaper")!;
    expect(be.nextYear).toBe(true);
    expect(be.date.getFullYear()).toBe(2027);
  });

  it("keeps upcoming deadlines in the current year", () => {
    const r = nextOccurrences(new Date(2026, 5, 13)); // 30 Jun still ahead
    const bPaper = r.find((d) => d.id === "bPaper")!;
    expect(bPaper.nextYear).toBe(false);
    expect(bPaper.date.getFullYear()).toBe(2026);
    expect(bPaper.daysRemaining).toBe(17);
  });

  it("treats a deadline that is today as 0 days remaining, not next year", () => {
    const r = nextOccurrences(new Date(2026, 3, 30)); // 30 Apr 2026
    const be = r.find((d) => d.id === "bePaper")!;
    expect(be.daysRemaining).toBe(0);
    expect(be.nextYear).toBe(false);
  });
});
