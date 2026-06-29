import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Header } from "@/components/header";

const navLabels: Record<string, string> = {
  personalTax: "Personal Tax",
  corporateTax: "Corporate Tax",
  batchPcb: "Employer / PCB",
  employer: "Employer",
  sst: "SST & WHT",
  property: "Property",
  einvoice: "e-Invoice",
  corpTools: "Corporate Tools",
  aiTax: "AI Assistant",
  blog: "Guides",
  pricing: "Credits",
};

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => navLabels[key] ?? key,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    className,
    onClick,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
  }) => (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  ),
  usePathname: () => "/",
}));

vi.mock("@/components/credit-balance", () => ({
  CreditBalance: () => <span>Credits 9,979</span>,
}));

vi.mock("@/components/auth-button", () => ({
  AuthButton: () => <button type="button">Sign in</button>,
}));

vi.mock("@/components/theme-toggle", () => ({
  ThemeToggle: () => <button type="button">Theme</button>,
}));

vi.mock("@/components/locale-switcher", () => ({
  LocaleSwitcher: () => <div>EN 中文 BM</div>,
}));

describe("Header", () => {
  it("renders the approved v2 grouped desktop sidebar", () => {
    render(<Header />);

    expect(screen.getByText("START")).toBeInTheDocument();
    expect(screen.getByText("CALCULATE")).toBeInTheDocument();
    expect(screen.getByText("MANAGE")).toBeInTheDocument();
    expect(screen.getByText("Malaysia tax workspace")).toBeInTheDocument();
    expect(screen.getByText("EN 中文 BM")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Sign in" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /Workspace/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /Corporate Tax/i })).toHaveAttribute("href", "/corporate");
    expect(
      screen
        .getAllByRole("link", { name: /Credits/i })
        .some((link) => link.getAttribute("href") === "/pricing"),
    ).toBe(true);
  });

  it("keeps mobile workflow navigation available", () => {
    render(<Header />);

    expect(screen.getByRole("navigation", { name: "Mobile workflow" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "AI" })).toHaveAttribute("href", "/ai-tax");
    expect(screen.getByRole("link", { name: "Tools" })).toHaveAttribute("href", "/corporate");
    expect(
      screen
        .getAllByRole("link", { name: "Credits" })
        .some((link) => link.getAttribute("href") === "/pricing"),
    ).toBe(true);
  });
});
