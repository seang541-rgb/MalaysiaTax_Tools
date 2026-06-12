import "@testing-library/jest-dom/vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthButton } from "@/components/auth-button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const authMessages: Record<string, string> = {
  accountCreated:
    "Check your email. If no email arrives, try signing in with this address.",
  close: "Close",
  createAccount: "Create account",
  dialogTitleSignIn: "Sign in",
  dialogTitleSignUp: "Create account",
  email: "Email",
  emailRegistered: "This email is already registered. Please sign in.",
  invalidCredentials: "The email or password is incorrect.",
  invalidEmail: "Use a real email address.",
  rateLimited: "Too many attempts. Please wait a few minutes and try again.",
  forgotPassword: "Forgot password?",
  resetPasswordTitle: "Reset password",
  resetPasswordDesc: "Enter your email and we will send a reset link.",
  resetPasswordSubmit: "Send reset link",
  resetPasswordSent:
    "If this email has an account, a password reset link has been sent.",
  password: "Password",
  passwordHint: "Use at least 6 characters.",
  signIn: "Sign in",
  signOut: "Sign out",
  submitSignIn: "Sign in",
  submitSignUp: "Create account",
  switchToSignIn: "I already have an account",
  switchToSignUp: "Create an account",
};

const getUserMock = vi.fn();
const onAuthStateChangeMock = vi.fn();
const signInWithPasswordMock = vi.fn();
const signUpMock = vi.fn();
const resetPasswordForEmailMock = vi.fn();
const signOutMock = vi.fn();

function getAuthPasswordInput() {
  return document.querySelector<HTMLInputElement>("#auth-password")!;
}

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => authMessages[key] ?? key,
}));

vi.mock("@/lib/supabase/browser", () => ({
  createSupabaseBrowserClient: vi.fn(),
}));

describe("AuthButton", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

    getUserMock.mockReset();
    onAuthStateChangeMock.mockReset();
    signInWithPasswordMock.mockReset();
    signUpMock.mockReset();
    resetPasswordForEmailMock.mockReset();
    signOutMock.mockReset();

    getUserMock.mockResolvedValue({ data: { user: null } });
    onAuthStateChangeMock.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    signInWithPasswordMock.mockResolvedValue({
      data: { user: { email: "customer@example.com" }, session: {} },
      error: null,
    });
    signUpMock.mockResolvedValue({
      data: { user: { email: "new@example.com" }, session: null },
      error: null,
    });
    resetPasswordForEmailMock.mockResolvedValue({ data: {}, error: null });
    signOutMock.mockResolvedValue({ error: null });

    vi.mocked(createSupabaseBrowserClient).mockReturnValue({
      auth: {
        getUser: getUserMock,
        onAuthStateChange: onAuthStateChangeMock,
        signInWithPassword: signInWithPasswordMock,
        signUp: signUpMock,
        resetPasswordForEmail: resetPasswordForEmailMock,
        signOut: signOutMock,
      },
    } as never);

    window.history.replaceState({}, "", "/en/pricing");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("signs in with email and password", async () => {
    render(<AuthButton />);

    fireEvent.click(await screen.findByRole("button", { name: /sign in/i }));
    const dialog = screen.getByRole("dialog", { name: /sign in/i });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "customer@example.com" },
    });
    fireEvent.change(getAuthPasswordInput(), {
      target: { value: "secret123" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => {
      expect(signInWithPasswordMock).toHaveBeenCalledWith({
        email: "customer@example.com",
        password: "secret123",
      });
    });
  });

  it("exposes a visible accessible sign-in control", async () => {
    render(<AuthButton />);

    expect(
      await screen.findByRole("button", { name: /^sign in$/i })
    ).toBeInTheDocument();
  });

  it("shows friendly invalid credential errors", async () => {
    signInWithPasswordMock.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: "Invalid login credentials" },
    });
    render(<AuthButton />);

    fireEvent.click(await screen.findByRole("button", { name: /^sign in$/i }));
    const dialog = screen.getByRole("dialog", { name: /sign in/i });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "customer@example.com" },
    });
    fireEvent.change(getAuthPasswordInput(), {
      target: { value: "badpassword" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /^sign in$/i }));

    expect(
      await screen.findByText("The email or password is incorrect.")
    ).toBeInTheDocument();
  });

  it("creates an account with email and password", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        json: async () => ({ registered: false }),
        ok: true,
      }))
    );
    render(<AuthButton />);

    fireEvent.click(await screen.findByRole("button", { name: /sign in/i }));
    fireEvent.click(screen.getByRole("button", { name: /create an account/i }));
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(getAuthPasswordInput(), {
      target: { value: "secret123" },
    });
    fireEvent.click(
      within(screen.getByRole("dialog", { name: /create account/i })).getByRole(
        "button",
        { name: /^create account$/i }
      )
    );

    await waitFor(() => {
      expect(signUpMock).toHaveBeenCalled();
    });
    expect(signUpMock.mock.calls[0][0]).toEqual({
      email: "new@example.com",
      password: "secret123",
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=%2Fen%2Fpricing`,
      },
    });
    expect(
      await screen.findByText(
        "Check your email. If no email arrives, try signing in with this address."
      )
    ).toBeInTheDocument();
  });

  it("shows a direct sign-in prompt for already registered emails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        json: async () => ({ registered: true }),
        ok: true,
      }))
    );
    render(<AuthButton />);

    fireEvent.click(await screen.findByRole("button", { name: /sign in/i }));
    fireEvent.click(screen.getByRole("button", { name: /create an account/i }));
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "registered@example.com" },
    });
    fireEvent.change(getAuthPasswordInput(), {
      target: { value: "secret123" },
    });
    fireEvent.click(
      within(screen.getByRole("dialog", { name: /create account/i })).getByRole(
        "button",
        { name: /^create account$/i }
      )
    );

    expect(
      await screen.findByText("This email is already registered. Please sign in.")
    ).toBeInTheDocument();
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it("sends a password reset email from the sign-in dialog", async () => {
    render(<AuthButton />);

    fireEvent.click(await screen.findByRole("button", { name: /sign in/i }));
    fireEvent.click(screen.getByRole("button", { name: /forgot password/i }));
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "customer@example.com" },
    });
    fireEvent.click(
      within(screen.getByRole("dialog", { name: /reset password/i })).getByRole(
        "button",
        { name: /send reset link/i }
      )
    );

    await waitFor(() => {
      expect(resetPasswordForEmailMock).toHaveBeenCalledWith(
        "customer@example.com",
        {
          redirectTo: `${window.location.origin}/auth/callback?next=%2Fen%2Faccount%3Freset_password%3D1`,
        }
      );
    });
    expect(
      await screen.findByText(
        "If this email has an account, a password reset link has been sent."
      )
    ).toBeInTheDocument();
  });

  it("can show and hide the password in the auth dialog", async () => {
    render(<AuthButton />);

    fireEvent.click(await screen.findByRole("button", { name: /sign in/i }));
    const passwordInput = getAuthPasswordInput();

    expect(passwordInput).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: /show password/i }));
    expect(passwordInput).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByRole("button", { name: /hide password/i }));
    expect(passwordInput).toHaveAttribute("type", "password");
  });
});
