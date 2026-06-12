import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TaxChat } from "@/components/tax-chat";

const aiMessages: Record<string, string> = {
  authRequired: "Please sign in to use MYTax AI.",
  disclaimer:
    "Answers are for reference only. Consult LHDN or a tax professional for official advice.",
  insufficientCredits: "Not enough credits. Please buy credits from Pricing.",
  pageSubtitle: "Ask me anything about Malaysia taxes.",
  pageTitle: "AI Tax Assistant",
  placeholder: "Ask a tax question...",
  send: "Send",
  subtitle: "Powered by Gemma 4 12B local LLM",
  title: "MYTax AI Assistant",
};

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string) => aiMessages[key] ?? key,
}));

describe("TaxChat billing gate", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          json: vi.fn(async () => ({ status: "ok", available: false })),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: vi.fn(async () => ({
            error: {
              code: "AUTH_REQUIRED",
              message: "Please sign in to use MYTax AI.",
            },
          })),
        })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("still calls the billing API before fallback answers when LLM is unavailable", async () => {
    render(<TaxChat />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/chat",
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "How much tax for RM5000 salary?",
      })
    );
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/chat",
        expect.objectContaining({
          body: expect.stringContaining("How much tax for RM5000 salary?"),
          method: "POST",
        })
      );
    });
    expect(
      await screen.findByText("Please sign in to use MYTax AI.")
    ).toBeInTheDocument();
  });
});
