"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { LogIn, LogOut } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AuthButton() {
  const t = useTranslations("auth");
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  async function signIn() {
    const nextEmail = window.prompt(t("emailPrompt"));
    if (!nextEmail) return;

    await supabase.auth.signInWithOtp({
      email: nextEmail,
      options: { emailRedirectTo: window.location.href },
    });
    window.alert(t("checkEmail"));
  }

  async function signOut() {
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
    >
      <LogOut className="h-4 w-4" />
      <span className="hidden xl:inline">{t("signOut")}</span>
    </button>
  ) : (
    <button
      type="button"
      onClick={signIn}
      className="inline-flex items-center gap-1 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <LogIn className="h-4 w-4" />
      <span className="hidden xl:inline">{t("signIn")}</span>
    </button>
  );
}
