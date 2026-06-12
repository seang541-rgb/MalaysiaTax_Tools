"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { LogIn, LogOut, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type AuthMode = "signIn" | "signUp";

export function AuthButton() {
  const t = useTranslations("auth");
  const supabase = useMemo(() => {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, []);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [formEmail, setFormEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function authErrorMessage(message?: string): string {
    const lowerMessage = message?.toLowerCase() ?? "";

    if (lowerMessage.includes("invalid login credentials")) {
      return t("invalidCredentials");
    }

    if (lowerMessage.includes("email") && lowerMessage.includes("invalid")) {
      return t("invalidEmail");
    }

    if (lowerMessage.includes("rate limit")) {
      return t("rateLimited");
    }

    return message || t("authError");
  }

  useEffect(() => {
    if (!supabase) {
      queueMicrotask(() => setLoading(false));
      return;
    }

    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setEmail(session?.user.email ?? null);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  function openAuthModal(nextMode: AuthMode = "signIn") {
    setMode(nextMode);
    setError(null);
    setMessage(null);
    setPassword("");
    setModalOpen(true);
  }

  function closeAuthModal() {
    setModalOpen(false);
    setError(null);
    setMessage(null);
    setPassword("");
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    const nextEmail = formEmail.trim();
    if (!nextEmail) {
      setError(t("emailRequired"));
      return;
    }

    if (!password) {
      setError(t("passwordRequired"));
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    const result =
      mode === "signIn"
        ? await supabase.auth.signInWithPassword({
            email: nextEmail,
            password,
          })
        : await supabase.auth.signUp({
            email: nextEmail,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname)}`,
            },
          });

    setSubmitting(false);

    if (result.error) {
      setError(authErrorMessage(result.error.message));
      return;
    }

    if (mode === "signUp" && !result.data.session) {
      setMessage(t("accountCreated"));
      setPassword("");
      return;
    }

    setEmail(result.data.user?.email ?? nextEmail);
    closeAuthModal();
  }

  async function signOut() {
    if (!supabase) return;

    await supabase.auth.signOut();
    window.location.reload();
  }

  if (loading) return null;

  return email ? (
    <button
      type="button"
      onClick={signOut}
      className="inline-flex items-center gap-1 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
      title={email}
      aria-label={t("signOut")}
    >
      <LogOut className="h-4 w-4" />
      <span className="hidden sm:inline">{t("signOut")}</span>
    </button>
  ) : (
    <>
      <button
        type="button"
        onClick={() => openAuthModal("signIn")}
        className="inline-flex items-center gap-1 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        title={t("signIn")}
        aria-label={t("signIn")}
      >
        <LogIn className="h-4 w-4" />
        <span className="hidden sm:inline">{t("signIn")}</span>
      </button>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-dialog-title"
        >
          <div className="w-full max-w-sm rounded-lg border bg-card p-5 text-card-foreground shadow-lg">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 id="auth-dialog-title" className="text-base font-semibold">
                {mode === "signIn"
                  ? t("dialogTitleSignIn")
                  : t("dialogTitleSignUp")}
              </h2>
              <button
                type="button"
                onClick={closeAuthModal}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={t("close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form className="space-y-4" onSubmit={submitAuth}>
              <div className="space-y-2">
                <label htmlFor="auth-email" className="text-sm font-medium">
                  {t("email")}
                </label>
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  value={formEmail}
                  onChange={(event) => setFormEmail(event.target.value)}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="auth-password" className="text-sm font-medium">
                  {t("password")}
                </label>
                <input
                  id="auth-password"
                  type="password"
                  autoComplete={
                    mode === "signIn" ? "current-password" : "new-password"
                  }
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  minLength={6}
                  required
                />
                {mode === "signUp" ? (
                  <p className="text-xs text-muted-foreground">
                    {t("passwordHint")}
                  </p>
                ) : null}
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
                className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {mode === "signIn" ? t("submitSignIn") : t("submitSignUp")}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setMode(mode === "signIn" ? "signUp" : "signIn");
                setError(null);
                setMessage(null);
                setPassword("");
              }}
              className="mt-4 w-full rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {mode === "signIn" ? t("switchToSignUp") : t("switchToSignIn")}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
