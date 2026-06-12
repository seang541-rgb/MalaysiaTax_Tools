"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/en/account";
  }

  return value;
}

export default function AuthConfirmPage() {
  const [message, setMessage] = useState("Confirming your account...");

  useEffect(() => {
    async function confirmAuth() {
      const url = new URL(window.location.href);
      const next = safeNextPath(url.searchParams.get("next"));
      const code = url.searchParams.get("code");
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const supabase = createSupabaseBrowserClient();

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!error) {
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

  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </main>
  );
}
