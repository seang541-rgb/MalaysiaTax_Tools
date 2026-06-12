"use client";

import { useState } from "react";
import { ShoppingCart } from "lucide-react";

export function CheckoutButton({
  packId,
  locale,
  label,
}: {
  packId: string;
  locale: string;
  label: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packId, locale }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data?.error?.message ?? "Unable to start checkout.");
      setLoading(false);
      return;
    }

    window.location.href = data.url;
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={startCheckout}
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        <ShoppingCart className="h-4 w-4" />
        {loading ? "..." : label}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
