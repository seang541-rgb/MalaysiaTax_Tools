import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PaidFeatureGate } from "@/components/paid-feature-gate";

const paidGateMessages: Record<string, string> = {
  authError: "Authentication failed.",
  authDesc: "This tool uses credits.",
  authTitle: "Sign in required",
  buyCredits: "Buy credits",
  checkingDesc: "Please wait a moment.",
  checkingTitle: "Checking credits",
  close: "Close",
  dialogTitleSignIn: "Sign in",
  dialogTitleSignUp: "Create account",
  email: "Email",
  emailRequired: "Enter your email.",
  invalidCredentials: "The email or password is incorrect.",
  invalidEmail: "Use a real email address.",
  noCreditsDesc: "This tool is available after you buy credits.",
  noCreditsTitle: "Credits required",
  password: "Password",
  passwordHint: "Use at least 6 characters.",
  passwordRequired: "Enter your password.",
  retry: "Check again",
  signIn: "Sign in",
  signOut: "Sign out",
  submitSignIn: "Sign in",
  submitSignUp: "Create account",
  switchToSignIn: "I already have an account",
  switchToSignUp: "Create an account",
};

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => paidGateMessages[key] ?? key,
}));

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
  createSupabaseBrowserClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: null } })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
    },
  })),
}));

describe("PaidFeatureGate", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("blocks anonymous users", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 401 }))
    );

    render(
      <PaidFeatureGate>
        <div>Paid tool</div>
      </PaidFeatureGate>
    );

    expect(await screen.findByText("Sign in required")).toBeInTheDocument();
    expect(screen.queryByText("Paid tool")).not.toBeInTheDocument();
  });

  it("blocks signed-in users without credits", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        json: async () => ({ balance: 0 }),
        ok: true,
        status: 200,
      }))
    );

    render(
      <PaidFeatureGate>
        <div>Paid tool</div>
      </PaidFeatureGate>
    );

    expect(await screen.findByText("Credits required")).toBeInTheDocument();
    expect(screen.queryByText("Paid tool")).not.toBeInTheDocument();
  });

  it("renders paid content for users with credits", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        json: async () => ({ balance: 3 }),
        ok: true,
        status: 200,
      }))
    );

    render(
      <PaidFeatureGate>
        <div>Paid tool</div>
      </PaidFeatureGate>
    );

    await waitFor(() => {
      expect(screen.getByText("Paid tool")).toBeInTheDocument();
    });
  });
});
