import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChangePasswordForm } from "@/components/change-password-form";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const updateUserMock = vi.fn();

const accountMessages: Record<string, string> = {
  changePassword: "Change password",
  resetPasswordPrompt: "Enter a new password to finish resetting your account.",
  newPassword: "New password",
  confirmPassword: "Confirm password",
  updatePassword: "Update password",
  passwordMismatch: "Passwords do not match.",
  passwordUpdated: "Password updated.",
  passwordUpdateFailed: "Unable to update password. Please try again.",
};

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => accountMessages[key] ?? key,
}));

vi.mock("@/lib/supabase/browser", () => ({
  createSupabaseBrowserClient: vi.fn(),
}));

describe("ChangePasswordForm", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

    updateUserMock.mockReset();
    updateUserMock.mockResolvedValue({ data: { user: {} }, error: null });

    vi.mocked(createSupabaseBrowserClient).mockReturnValue({
      auth: {
        updateUser: updateUserMock,
      },
    } as never);
  });

  it("updates the authenticated user's password", async () => {
    render(<ChangePasswordForm resetMode={false} />);

    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "secret123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "secret123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));

    await waitFor(() => {
      expect(updateUserMock).toHaveBeenCalledWith({ password: "secret123" });
    });
    expect(await screen.findByText("Password updated.")).toBeInTheDocument();
  });

  it("blocks mismatched password confirmation", async () => {
    render(<ChangePasswordForm resetMode />);

    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "secret123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "different123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));

    expect(await screen.findByText("Passwords do not match.")).toBeInTheDocument();
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("can show and hide password fields", () => {
    render(<ChangePasswordForm resetMode />);

    const newPasswordInput = screen.getByLabelText("New password");
    const confirmPasswordInput = screen.getByLabelText("Confirm password");

    expect(newPasswordInput).toHaveAttribute("type", "password");
    expect(confirmPasswordInput).toHaveAttribute("type", "password");

    const showButtons = screen.getAllByRole("button", {
      name: /show password/i,
    });
    fireEvent.click(showButtons[0]);
    fireEvent.click(showButtons[1]);

    expect(newPasswordInput).toHaveAttribute("type", "text");
    expect(confirmPasswordInput).toHaveAttribute("type", "text");

    fireEvent.click(
      screen.getAllByRole("button", { name: /hide password/i })[0]
    );
    expect(newPasswordInput).toHaveAttribute("type", "password");
  });
});
