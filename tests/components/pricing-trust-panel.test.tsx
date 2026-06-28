import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PricingTrustPanel } from "@/components/pricing-trust-panel";

describe("PricingTrustPanel", () => {
  it("makes live one-time Stripe billing expectations visible", () => {
    render(<PricingTrustPanel />);

    expect(screen.getByText("Stripe Checkout")).toBeInTheDocument();
    expect(screen.getByText("Live payments")).toBeInTheDocument();
    expect(screen.getByText("One-time credits")).toBeInTheDocument();
    expect(screen.getByText("Supabase account")).toBeInTheDocument();
  });
});
