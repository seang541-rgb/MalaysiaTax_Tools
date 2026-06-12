"use client";

import { FormEvent, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { PasswordInput } from "./password-input";

export function ChangePasswordForm({ resetMode = false }: { resetMode?: boolean }) {
  const t = useTranslations("account");
  const supabase = useMemo(() => {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, []);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    setError(null);
    setMessage(null);

    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    setSubmitting(true);
    const result = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (result.error) {
      setError(t("passwordUpdateFailed"));
      return;
    }

    setPassword("");
    setConfirmPassword("");
    setMessage(t("passwordUpdated"));
  }

  return (
    <section className="mt-6 rounded-lg border bg-card p-5">
      <h2 className="font-semibold">{t("changePassword")}</h2>
      {resetMode ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {t("resetPasswordPrompt")}
        </p>
      ) : null}
      <form className="mt-4 space-y-4" onSubmit={submitPassword}>
        <div className="space-y-2">
          <label htmlFor="account-new-password" className="text-sm font-medium">
            {t("newPassword")}
          </label>
          <PasswordInput
            id="account-new-password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="account-confirm-password"
            className="text-sm font-medium"
          >
            {t("confirmPassword")}
          </label>
          <PasswordInput
            id="account-confirm-password"
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

        {message ? (
          <p className="rounded-md border bg-muted px-3 py-2 text-sm">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("updatePassword")}
        </button>
      </form>
    </section>
  );
}
