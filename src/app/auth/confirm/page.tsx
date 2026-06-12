"use client";

import { FormEvent, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { PasswordInput } from "@/components/password-input";

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/en/account";
  }

  return value;
}

export default function AuthConfirmPage() {
  const [message, setMessage] = useState("Confirming your account...");
  const [resetReady, setResetReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function confirmAuth() {
      const url = new URL(window.location.href);
      const next = safeNextPath(url.searchParams.get("next"));
      const code = url.searchParams.get("code");
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const type = hashParams.get("type");
      const supabase = createSupabaseBrowserClient();

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!error) {
          if (type === "recovery" || next.includes("reset_password=1")) {
            setResetReady(true);
            setMessage("Enter a new password to finish resetting your account.");
            return;
          }

          window.location.replace(next);
          return;
        }
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
          window.location.replace(next);
          return;
        }
      }

      setMessage("This confirmation link is invalid or has expired.");
      window.location.replace("/en?auth=error");
    }

    confirmAuth();
  }, []);

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    const supabase = createSupabaseBrowserClient();
    const result = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (result.error) {
      setError("Unable to update password. Please request a new reset link.");
      return;
    }

    setPassword("");
    setConfirmPassword("");
    setMessage("Password updated. You can now sign in with your new password.");
  }

  if (resetReady) {
    return (
      <main className="mx-auto grid min-h-screen max-w-md place-items-center px-6">
        <section className="w-full rounded-lg border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Reset password</h1>
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          <form className="mt-5 space-y-4" onSubmit={submitPassword}>
            <div className="space-y-2">
              <label
                htmlFor="confirm-new-password"
                className="text-sm font-medium"
              >
                New password
              </label>
              <PasswordInput
                id="confirm-new-password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="confirm-repeat-password"
                className="text-sm font-medium"
              >
                Confirm password
              </label>
              <PasswordInput
                id="confirm-repeat-password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={6}
                required
              />
            </div>

            {error ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Updating..." : "Update password"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </main>
  );
}
