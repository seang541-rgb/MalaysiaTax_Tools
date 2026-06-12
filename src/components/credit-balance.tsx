"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Coins } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function CreditBalance() {
  const [balance, setBalance] = useState<number | null>(null);
  const supabase = useMemo(() => {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, []);

  const refreshBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/balance");
      if (!res.ok) {
        setBalance(null);
        return;
      }

      const data = (await res.json().catch(() => null)) as {
        balance?: unknown;
      } | null;
      setBalance(typeof data?.balance === "number" ? data.balance : null);
    } catch {
      setBalance(null);
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        void refreshBalance();
      } else {
        setBalance(null);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          void refreshBalance();
        } else {
          setBalance(null);
        }
      }
    );

    function handleCreditsUpdated(event: Event) {
      const balance = (event as CustomEvent<{ balance?: unknown }>).detail
        ?.balance;
      if (typeof balance === "number") setBalance(balance);
    }

    window.addEventListener("mytax:credits-updated", handleCreditsUpdated);
    return () => {
      window.removeEventListener("mytax:credits-updated", handleCreditsUpdated);
      listener.subscription.unsubscribe();
    };
  }, [refreshBalance, supabase]);

  if (balance === null) return null;

  return (
    <Link
      href="/account"
      className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-muted/40 px-2.5 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
      title={`Credits: ${balance}`}
      aria-label={`Credits: ${balance}`}
    >
      <Coins className="h-4 w-4" />
      <span className="hidden 2xl:inline">Credits</span>
      <span>{balance}</span>
    </Link>
  );
}
