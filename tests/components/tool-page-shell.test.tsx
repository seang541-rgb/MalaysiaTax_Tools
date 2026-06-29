import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ToolPageShell } from "@/components/tool-page-shell";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe("ToolPageShell", () => {
  it("renders the v2 calculator template around tool content", () => {
    render(
      <ToolPageShell
        eyebrow="Corporate Tax"
        title="Company tax calculator"
        subtitle="Calculate company tax payable."
        creditLabel="1 credit"
        resultTitle="Tax estimate"
      >
        <form aria-label="Company details" />
      </ToolPageShell>,
    );

    expect(screen.getByText("Corporate Tax")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Company tax calculator" })).toBeInTheDocument();
    expect(screen.getByText("Need help while filling this?")).toBeInTheDocument();
    expect(screen.getByText("Before using credits")).toBeInTheDocument();
    expect(screen.getAllByText("1 credit")).toHaveLength(2);
    expect(screen.getByRole("form", { name: "Company details" })).toBeInTheDocument();
  });
});
