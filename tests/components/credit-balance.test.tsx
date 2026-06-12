import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreditBalance } from "@/components/credit-balance";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

let authStateHandler:
  | ((event: string, session: { user?: { email: string } } | null) => void)
  | null = null;

const getUserMock = vi.fn();
const unsubscribeMock = vi.fn();

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/supabase/browser", () => ({
  createSupabaseBrowserClient: vi.fn(),
}));

describe("CreditBalance", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

    authStateHandler = null;
    getUserMock.mockReset();
    unsubscribeMock.mockReset();
    getUserMock.mockResolvedValue({ data: { user: null } });

    vi.mocked(createSupabaseBrowserClient).mockReturnValue({
      auth: {
        getUser: getUserMock,
        onAuthStateChange: vi.fn((callback) => {
          authStateHandler = callback;
          return { data: { subscription: { unsubscribe: unsubscribeMock } } };
        }),
      },
    } as never);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stays hidden for anonymous users", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 401 }))
    );

    render(<CreditBalance />);

    await waitFor(() => {
      expect(getUserMock).toHaveBeenCalled();
    });
    expect(screen.queryByLabelText(/credits/i)).not.toBeInTheDocument();
  });

  it("shows credits after the user signs in on the same page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        json: async () => ({ balance: 5 }),
        ok: true,
        status: 200,
      }))
    );

    render(<CreditBalance />);

    await waitFor(() => {
      expect(authStateHandler).toBeTypeOf("function");
    });

    authStateHandler?.("SIGNED_IN", { user: { email: "user@example.com" } });

    expect(await screen.findByLabelText("Credits: 5")).toBeInTheDocument();
    expect(screen.getByText("Credits")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("updates when credits are charged without a page reload", async () => {
    getUserMock.mockResolvedValue({ data: { user: { email: "user@example.com" } } });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        json: async () => ({ balance: 5 }),
        ok: true,
        status: 200,
      }))
    );

    render(<CreditBalance />);

    expect(await screen.findByLabelText("Credits: 5")).toBeInTheDocument();

    window.dispatchEvent(
      new CustomEvent("mytax:credits-updated", { detail: { balance: 4 } })
    );

    expect(await screen.findByLabelText("Credits: 4")).toBeInTheDocument();
  });
});
