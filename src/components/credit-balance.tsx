"use client";

import { useEffect, useState } from "react";
import { Coins } from "lucide-react";
import { Link } from "@/i18n/navigation";

export function CreditBalance() {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      return;
    }

    fetch("/api/billing/balance")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (typeof data?.balance === "number") setBalance(data.balance);
      })
      .catch(() => {});
  }, []);

  if (balance === null) return null;

  return (
    <Link
      href="/account"
      className="inline-flex items-center gap-1 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
      title="Credits"
    >
      <Coins className="h-4 w-4" />
      <span>{balance}</span>
    </Link>
  );
}
