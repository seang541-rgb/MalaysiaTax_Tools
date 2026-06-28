import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TaxChat } from "@/components/tax-chat";

let mockedLocale = "en";

const aiMessages: Record<string, string> = {
  authRequired: "Please sign in to use MYTax AI.",
  disclaimer:
    "Answers are for reference only. Consult LHDN or a tax professional for official advice.",
  insufficientCredits: "Not enough credits. Please buy credits from Pricing.",
  pageSubtitle: "Ask me anything about Malaysia taxes.",
  pageTitle: "AI Tax Assistant",
  placeholder: "Ask a tax question...",
  send: "Send",
  serviceUnavailable: "MYTax AI is temporarily unavailable. Please try again.",
  subtitle: "Powered by Gemma 4 12B local LLM",
  title: "MYTax AI Assistant",
};

vi.mock("next-intl", () => ({
  useLocale: () => mockedLocale,
  useTranslations: () => (key: string) => aiMessages[key] ?? key,
}));

describe("TaxChat billing gate", () => {
  beforeEach(() => {
    mockedLocale = "en";
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

  it("shows agent tool status and calculator link from stream metadata", async () => {
    vi.mocked(fetch).mockReset();
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        json: vi.fn(async () => ({ status: "ok", available: true })),
      } as never)
      .mockResolvedValueOnce(
        new Response(
          'data: {"agent":{"toolName":"sst_checker","needsFollowUp":false,"calculatorLabel":"SST Calculator","calculatorPath":"/sst","missingFields":[]}}\n\ndata: {"token":"SST result"}\n\ndata: [DONE]\n\n',
          { status: 200 }
        ) as never
      );

    render(<TaxChat />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/chat",
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    fireEvent.change(screen.getByPlaceholderText("Ask a tax question..."), {
      target: { value: "Service tax taxable revenue RM700k" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("Tool: SST Calculator")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Open calculator" });
    expect(link).toHaveAttribute("href", "/en/sst");
    expect(await screen.findByText("SST result")).toBeInTheDocument();
  });

  it("shows missing fields when the agent asks a follow-up question", async () => {
    vi.mocked(fetch).mockReset();
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        json: vi.fn(async () => ({ status: "ok", available: true })),
      } as never)
      .mockResolvedValueOnce(
        new Response(
          'data: {"agent":{"toolName":"sst_checker","needsFollowUp":true,"calculatorLabel":"SST Calculator","calculatorPath":"/sst","missingFields":["taxType","taxableRevenue"]}}\n\ndata: {"token":"Is this sales tax or service tax?"}\n\ndata: [DONE]\n\n',
          { status: 200 }
        ) as never
      );

    render(<TaxChat />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/chat",
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    fireEvent.change(screen.getByPlaceholderText("Ask a tax question..."), {
      target: { value: "Need SST?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("Needs details")).toBeInTheDocument();
    expect(
      await screen.findByText("Missing: taxType, taxableRevenue")
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Is this sales tax or service tax?")
    ).toBeInTheDocument();
  });

  it("shows agent assumptions from stream metadata", async () => {
    vi.mocked(fetch).mockReset();
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        json: vi.fn(async () => ({ status: "ok", available: true })),
      } as never)
      .mockResolvedValueOnce(
        new Response(
          'data: {"agent":{"toolName":"personal_tax_calculator","needsFollowUp":false,"calculatorLabel":"Personal Tax Calculator","calculatorPath":"/","missingFields":[],"assumptions":["YA2025","resident individual","single"]}}\n\ndata: {"token":"Tax result"}\n\ndata: [DONE]\n\n',
          { status: 200 }
        ) as never
      );

    render(<TaxChat />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/chat",
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    fireEvent.change(screen.getByPlaceholderText("Ask a tax question..."), {
      target: { value: "monthly salary RM5000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(
      await screen.findByText("Assumptions: YA2025, resident individual, single")
    ).toBeInTheDocument();
  });

  it("does not use the local tax assistant as an answer fallback after API failure", async () => {
    vi.mocked(fetch).mockReset();
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        json: vi.fn(async () => ({ status: "ok", available: true })),
      } as never)
      .mockRejectedValueOnce(new Error("network down"));

    render(<TaxChat />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/chat",
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    fireEvent.change(screen.getByPlaceholderText("Ask a tax question..."), {
      target: { value: "How much tax for RM5000 salary?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(
      await screen.findByText("MYTax AI is temporarily unavailable. Please try again.")
    ).toBeInTheDocument();
    expect(screen.queryByText(/Estimated Tax/i)).toBeNull();
  });

  it("fills the input when an outer AI prompt is selected", async () => {
    vi.mocked(fetch).mockReset();
    vi.mocked(fetch).mockResolvedValue({
      json: vi.fn(async () => ({ status: "ok", available: true })),
    } as never);

    render(<TaxChat />);

    window.dispatchEvent(
      new CustomEvent("mytax:ai-prompt", {
        detail: "What is the corporate tax rate?",
      })
    );

    expect(
      await screen.findByDisplayValue("What is the corporate tax rate?")
    ).toBeInTheDocument();
  });

  it("renders Chinese quick questions without mojibake", async () => {
    mockedLocale = "zh";
    vi.mocked(fetch).mockReset();
    vi.mocked(fetch).mockResolvedValue({
      json: vi.fn(async () => ({ status: "ok", available: true })),
    } as never);

    render(<TaxChat />);

    expect(
      await screen.findByRole("button", { name: "月薪 RM5000 要交多少税？" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "企业税率是多少？" })).toBeInTheDocument();
  });
});
