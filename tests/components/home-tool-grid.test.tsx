import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomeToolGrid } from "@/components/home-tool-grid";

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

describe("HomeToolGrid", () => {
  it("renders professional tool links with real accessible destinations", () => {
    render(<HomeToolGrid />);

    expect(screen.getByRole("link", { name: /Personal Tax/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /Corporate Tax/i })).toHaveAttribute("href", "/corporate");
    expect(
      screen
        .getAllByRole("link", { name: /AI Tax/i })
        .some((link) => link.getAttribute("href") === "/ai-tax")
    ).toBe(true);
    expect(screen.getByRole("link", { name: /Pricing/i })).toHaveAttribute("href", "/pricing");
  });

  it("uses the v2 task-first workspace structure across the home page", () => {
    render(<HomeToolGrid locale="zh" />);

    expect(screen.getByText("Best first step")).toBeInTheDocument();
    expect(screen.getByText("Tell MYTax what you are trying to do")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Common workflows" })).toBeInTheDocument();
    expect(screen.getByText("Your workspace")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ask AI Tax/i })).toHaveAttribute("href", "/ai-tax");
  });
});
