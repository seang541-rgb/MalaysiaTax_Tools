import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SourceNote } from "@/components/source-note";

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string, values?: Record<string, string>) => {
    if (key === "verified") return `Reviewed ${values?.date}`;
    if (key === "sourceLabel") return "Sources";
    return key;
  },
}));

describe("SourceNote", () => {
  it("renders official source links for a canonical topic", () => {
    render(<SourceNote topic="e-invoice" />);

    expect(screen.getByText(/Reviewed/)).toBeInTheDocument();
    expect(screen.getByText(/Sources/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /e-Invoice/i })).toBeInTheDocument();
  });

  it("renders optional reviewed labels and rule periods when provided", () => {
    render(<SourceNote topic="joint-assessment" />);

    expect(screen.getByText(/Comparison rules reviewed/i)).toBeInTheDocument();
    expect(screen.getByText(/Applies to YA 2025/i)).toBeInTheDocument();
  });
});
