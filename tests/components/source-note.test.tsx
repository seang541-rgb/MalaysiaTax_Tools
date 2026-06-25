import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SourceNote } from "@/components/source-note";

type Locale = "en" | "ms" | "zh";

let mockLocale: Locale = "en";

vi.mock("next-intl", () => ({
  useLocale: () => mockLocale,
  useTranslations: () => (
    key: string,
    values?: Record<string, string | number | undefined>
  ) => {
    const messages = {
      en: {
        verified: "Reviewed as of {date}",
        sourceLabel: "Sources",
        appliesTo: "Applies to {period}",
        reviewedLabel: {
          comparisonRules: "Comparison rules reviewed",
        },
      },
      ms: {
        verified: "Disemak setakat {date}",
        sourceLabel: "Sumber",
        appliesTo: "Berlaku untuk {period}",
        reviewedLabel: {
          comparisonRules: "Peraturan perbandingan disemak",
        },
      },
      zh: {
        verified: "税率核实于 {date}",
        sourceLabel: "来源",
        appliesTo: "适用于 {period}",
        reviewedLabel: {
          comparisonRules: "并行评税规则已核实",
        },
      },
    } as const;

    const activeMessages = messages[mockLocale];

    if (key.startsWith("reviewedLabel.")) {
      const reviewedKey = key.split(".")[1];
      return activeMessages.reviewedLabel[
        reviewedKey as keyof typeof activeMessages.reviewedLabel
      ];
    }

    if (key === "verified") {
      return activeMessages.verified.replace(
        "{date}",
        values?.date ? String(values.date) : ""
      );
    }

    if (key === "sourceLabel") return activeMessages.sourceLabel;

    if (key === "appliesTo") {
      return activeMessages.appliesTo.replace(
        "{period}",
        values?.period ? String(values.period) : ""
      );
    }

    return key;
  },
}));

describe("SourceNote", () => {
  it("renders official source links for a canonical topic", () => {
    mockLocale = "en";
    render(<SourceNote topic="e-invoice" />);

    expect(screen.getByText(/Reviewed/)).toBeInTheDocument();
    expect(screen.getByText(/Sources/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /e-Invoice/i })).toBeInTheDocument();
  });

  it("renders optional reviewed labels and rule periods when provided", () => {
    mockLocale = "en";
    render(<SourceNote topic="joint-assessment" />);

    expect(screen.getByText(/Comparison rules reviewed/i)).toBeInTheDocument();
    expect(screen.getByText(/Applies to YA 2025/i)).toBeInTheDocument();
  });

  it("localizes reviewed labels and rule periods for non-English locale", () => {
    mockLocale = "ms";
    render(<SourceNote topic="joint-assessment" />);

    expect(
      screen.getByText(/Peraturan perbandingan disemak/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Berlaku untuk YA 2025/i)).toBeInTheDocument();
    expect(screen.getByText(/Sumber/)).toBeInTheDocument();
    expect(screen.queryByText(/Comparison rules reviewed/)).toBeNull();
    expect(screen.queryByText(/Applies to YA 2025/)).toBeNull();
  });
});
