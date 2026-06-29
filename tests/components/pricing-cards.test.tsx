import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PricingCards } from "@/components/pricing-cards";

vi.mock("@/components/checkout-button", () => ({
  CheckoutButton: ({
    packId,
    label,
  }: {
    packId: string;
    locale: string;
    label: string;
  }) => <button type="button">{`${label} ${packId}`}</button>,
}));

describe("PricingCards", () => {
  it("presents credits as a clean billing workspace", () => {
    render(
      <PricingCards
        locale="en"
        ctaLabel="Buy credits"
        checkoutNotice="You will be redirected to Stripe."
        disclaimerHref="/en/disclaimer"
        disclaimerLabel="Disclaimer"
      />,
    );

    expect(screen.getByText("Best value")).toBeInTheDocument();
    expect(screen.getByText("No subscription lock-in")).toBeInTheDocument();
    expect(screen.getByText("Credits stay visible before each paid tool.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Buy credits pro" })).toBeInTheDocument();
  });
});
