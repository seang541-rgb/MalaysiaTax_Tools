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

    expect(screen.getByText("建议第一步")).toBeInTheDocument();
    expect(screen.getByText("告诉 MYTax 你想处理什么")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "常用流程" })).toBeInTheDocument();
    expect(screen.getByText("你的工作区")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /询问 AI 税务助手/i })).toHaveAttribute("href", "/ai-tax");
    expect(screen.queryByRole("heading", { name: "Common workflows" })).not.toBeInTheDocument();
  });
});
