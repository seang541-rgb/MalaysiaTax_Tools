import { CreditCard, Database, ShieldCheck, Zap } from "lucide-react";

const ITEMS = [
  {
    label: "Stripe Checkout",
    description: "Card payment is handled on Stripe-hosted checkout.",
    icon: CreditCard,
  },
  {
    label: "Live payments",
    description: "Production uses live Stripe keys and live one-time prices.",
    icon: ShieldCheck,
  },
  {
    label: "One-time credits",
    description: "Credits are added after checkout.session.completed.",
    icon: Zap,
  },
  {
    label: "Supabase account",
    description: "Balances and transaction history stay tied to signed-in users.",
    icon: Database,
  },
];

function getDescription(label: string, locale: string) {
  if (locale === "zh") {
    const zh: Record<string, string> = {
      "Stripe Checkout":
        "\u4ed8\u6b3e\u7531 Stripe-hosted checkout \u5904\u7406\u3002",
      "Live payments":
        "\u751f\u4ea7\u73af\u5883\u4f7f\u7528 live Stripe keys \u548c live one-time prices\u3002",
      "One-time credits":
        "checkout.session.completed \u540e\u81ea\u52a8\u52a0\u5165 credits\u3002",
      "Supabase account":
        "\u4f59\u989d\u548c\u4ea4\u6613\u8bb0\u5f55\u4f1a\u7ed1\u5b9a\u5230\u767b\u5165\u7528\u6237\u3002",
    };
    return zh[label];
  }

  if (locale === "ms") {
    const ms: Record<string, string> = {
      "Stripe Checkout": "Bayaran kad dikendalikan oleh Stripe-hosted checkout.",
      "Live payments":
        "Production menggunakan live Stripe keys dan live one-time prices.",
      "One-time credits":
        "Credits ditambah selepas checkout.session.completed.",
      "Supabase account":
        "Baki dan sejarah transaksi terikat kepada pengguna yang log masuk.",
    };
    return ms[label];
  }

  return null;
}

export function PricingTrustPanel({ locale = "en" }: { locale?: string }) {
  return (
    <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const description = getDescription(item.label, locale) ?? item.description;
        return (
          <div key={item.label} className="rounded-lg border bg-card p-4 shadow-sm">
            <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="mt-3 text-sm font-semibold">{item.label}</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
        );
      })}
    </section>
  );
}
