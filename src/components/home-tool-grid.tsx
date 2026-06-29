import {
  ArrowUpRight,
  BadgePercent,
  BotMessageSquare,
  Building2,
  CreditCard,
  FileSpreadsheet,
  Landmark,
  ReceiptText,
} from "lucide-react";
import { Link } from "@/i18n/navigation";

const TOOLS = [
  {
    href: "/",
    label: "Personal Tax",
    description: "Personal income tax, reliefs, rebates, PCB and YA tax rates.",
    meta: "Free",
    icon: ReceiptText,
  },
  {
    href: "/corporate",
    label: "Corporate Tax",
    description: "Company tax, SME rates, capital allowance and tax payable.",
    meta: "1 credit",
    icon: Building2,
  },
  {
    href: "/ai-tax",
    label: "AI Tax",
    description: "Ask Malaysia tax questions and route into calculator workflows.",
    meta: "1 credit",
    icon: BotMessageSquare,
  },
  {
    href: "/sst",
    label: "SST & WHT",
    description: "SST registration checks, service tax, sales tax and WHT topics.",
    meta: "1 credit",
    icon: Landmark,
  },
  {
    href: "/batch-pcb",
    label: "PCB",
    description: "Monthly PCB estimates and batch payroll checks.",
    meta: "Free",
    icon: BadgePercent,
  },
  {
    href: "/corporate-tools",
    label: "CP204",
    description: "Tax estimate installments, revisions and cash-flow planning.",
    meta: "1 credit",
    icon: FileSpreadsheet,
  },
  {
    href: "/pricing",
    label: "Pricing",
    description: "Buy one-time credits through live Stripe Checkout.",
    meta: "Live",
    icon: CreditCard,
  },
];

function getCopy(locale: string) {
  if (locale === "zh") {
    return {
      title: "Common workflows",
      subtitle: "Grouped by user intent, not by internal feature names.",
      promptPill: "Best first step",
      promptTitle: "Tell MYTax what you are trying to do",
      promptBody:
        "Example: I run a Sdn Bhd and need CP204 revision, or I want to check which reliefs apply for YA2025.",
      cta: "Ask AI Tax",
      inputPlaceholder: "Ask a Malaysia tax question...",
      inputCta: "Start",
      creditsTitle: "Your workspace",
      creditsBody:
        "Paid tools show the credit cost before a run. Free calculators stay open.",
      recentTitle: "Recent: Personal tax draft",
      recentBody: "Recent: CP204 revision",
      trustTitle: "Live Stripe checkout",
      trustBody: "Balance, checkout and tool access use the same product language.",
      free: "\u514d\u8d39",
      credit: "1 credit",
      live: "Live",
    };
  }

  if (locale === "ms") {
    return {
      title: "Common workflows",
      subtitle: "Grouped by user intent, not by internal feature names.",
      promptPill: "Best first step",
      promptTitle: "Tell MYTax what you are trying to do",
      promptBody:
        "Example: I run a Sdn Bhd and need CP204 revision, or I want to check which reliefs apply for YA2025.",
      cta: "Tanya AI Tax",
      inputPlaceholder: "Ask a Malaysia tax question...",
      inputCta: "Start",
      creditsTitle: "Your workspace",
      creditsBody:
        "Paid tools show the credit cost before a run. Free calculators stay open.",
      recentTitle: "Recent: Personal tax draft",
      recentBody: "Recent: CP204 revision",
      trustTitle: "Live Stripe checkout",
      trustBody: "Balance, checkout and tool access use the same product language.",
      free: "Percuma",
      credit: "1 credit",
      live: "Live",
    };
  }

  return {
    title: "Common workflows",
    subtitle: "Grouped by user intent, not by internal feature names.",
    promptPill: "Best first step",
    promptTitle: "Ask AI first, then calculate",
    promptBody:
      "Example: I run a Sdn Bhd and need CP204 revision, or I want to check which reliefs apply for YA2025.",
    cta: "Ask AI Tax",
    inputPlaceholder: "Ask a Malaysia tax question...",
    inputCta: "Start",
    creditsTitle: "Your workspace",
    creditsBody:
      "Paid tools show the credit cost before a run. Free calculators stay open.",
    recentTitle: "Recent: Personal tax draft",
    recentBody: "Recent: CP204 revision",
    trustTitle: "Live Stripe checkout",
    trustBody: "Balance, checkout and tool access use the same product language.",
    free: "Free",
    credit: "1 credit",
    live: "Live",
  };
}

export function HomeToolGrid({ locale = "en" }: { locale?: string }) {
  const copy = getCopy(locale);

  return (
    <section className="space-y-8">
      <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {copy.promptPill}
            </span>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-950">
              {copy.promptTitle}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
              {copy.promptBody}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-[#f7faf8] p-4 lg:w-[340px]">
            <p className="text-sm text-zinc-500">{copy.inputPlaceholder}</p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Free preview
              </span>
              <Link
                href="/ai-tax"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-800"
              >
                {copy.inputCta}
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-zinc-950">
              {copy.title}
            </h2>
            <p className="mt-1 text-sm text-zinc-600">{copy.subtitle}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="group flex min-h-44 flex-col rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30"
                >
                  <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="text-base font-semibold text-zinc-950">
                    {tool.label}
                  </span>
                  <span className="mt-1 text-sm leading-relaxed text-zinc-600">
                    {tool.description}
                  </span>
                  <span className="mt-auto flex items-center justify-between pt-4 text-xs font-medium text-zinc-500">
                    <span>
                      {tool.meta === "Free"
                        ? copy.free
                        : tool.meta === "Live"
                          ? copy.live
                          : copy.credit}
                    </span>
                    <ArrowUpRight
                      className="h-4 w-4 text-zinc-400 transition group-hover:text-emerald-700"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        <aside className="space-y-3">
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-zinc-950">
              {copy.creditsTitle}
            </h3>
            <p className="mt-4 text-sm font-semibold text-emerald-700">
              9,979 credits available
            </p>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              {copy.creditsBody}
            </p>
            <div className="mt-4 space-y-3">
              {[copy.trustTitle, copy.recentTitle, copy.recentBody].map(
                (item) => (
                  <div
                    key={item}
                    className="rounded-full bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-600"
                  >
                    {item}
                  </div>
                ),
              )}
            </div>
          </div>
        </aside>
      </div>
      <Link href="/ai-tax" className="sr-only">
        {copy.cta}
      </Link>
    </section>
  );
}
