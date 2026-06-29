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

  it("uses the redesigned workspace structure across the home page", () => {
    render(<HomeToolGrid locale="zh" />);

    expect(screen.getByRole("heading", { name: "常用工具" })).toBeInTheDocument();
    expect(screen.getByText("先问 AI，再进入计算器")).toBeInTheDocument();
    expect(screen.getByText("Credits & access")).toBeInTheDocument();
    expect(screen.getByText("Recent work")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ask AI Tax/i })).toHaveAttribute("href", "/ai-tax");
  });
});
