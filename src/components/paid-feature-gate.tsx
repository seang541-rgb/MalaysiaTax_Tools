"use client";

import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Lock, ShoppingCart } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { AuthButton } from "./auth-button";

type GateStatus = "checking" | "auth" | "noCredits" | "ready";

export function PaidFeatureGate({ children }: { children: ReactNode }) {
  const t = useTranslations("paidGate");
  const [status, setStatus] = useState<GateStatus>("checking");

  const supabase = useMemo(() => {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, []);

  const readBalance = useCallback(async (): Promise<GateStatus> => {
    try {
      const res = await fetch("/api/billing/balance");
      if (res.status === 401) {
        return "auth";
      }

      if (!res.ok) {
        return "auth";
      }

      const data = await res.json();
      return data.balance > 0 ? "ready" : "noCredits";
    } catch {
      return "auth";
    }
  }, []);

  const checkBalance = useCallback(async () => {
    setStatus(await readBalance());
  }, [readBalance]);

  useEffect(() => {
    let active = true;

    readBalance().then((nextStatus) => {
      if (active) setStatus(nextStatus);
    });

    return () => {
      active = false;
    };
  }, [readBalance]);


  useEffect(() => {
    if (!supabase) return;

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      checkBalance();
    });

    return () => listener.subscription.unsubscribe();
  }, [checkBalance, supabase]);

  if (status === "ready") {
    return <>{children}</>;
  }

  return (
    <div className="mx-auto max-w-xl rounded-lg border bg-card p-6 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-muted">
        {status === "noCredits" ? (
          <ShoppingCart className="h-5 w-5 text-muted-foreground" />
        ) : (
          <Lock className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <h2 className="text-lg font-semibold">
        {status === "checking"
          ? t("checkingTitle")
          : status === "noCredits"
            ? t("noCreditsTitle")
            : t("authTitle")}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {status === "checking"
          ? t("checkingDesc")
          : status === "noCredits"
            ? t("noCreditsDesc")
            : t("authDesc")}
      </p>
      {status !== "checking" ? (
        <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
          {status === "auth" ? (
            <div className="inline-flex justify-center rounded-md border px-4 py-2">
              <AuthButton />
            </div>
          ) : (
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t("buyCredits")}
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              setStatus("checking");
              void checkBalance();
            }}
            className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            {t("retry")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
