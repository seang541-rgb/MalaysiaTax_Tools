import {
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
      title: "Malaysia tax workspace",
      subtitle:
        "\u5feb\u901f\u6253\u5f00 calculator\u3001AI Tax \u548c credits\u3002",
      cta: "Ask AI Tax",
      free: "\u514d\u8d39",
      credit: "1 credit",
      live: "Live",
    };
  }

  if (locale === "ms") {
    return {
      title: "Ruang kerja cukai Malaysia",
      subtitle: "Akses pantas kepada kalkulator, AI Tax dan credits.",
      cta: "Tanya AI Tax",
      free: "Percuma",
      credit: "1 credit",
      live: "Live",
    };
  }

  return {
    title: "Malaysia tax workspace",
    subtitle: "Fast access to calculators, AI Tax and credits.",
    cta: "Ask AI Tax",
    free: "Free",
    credit: "1 credit",
    live: "Live",
  };
}

export function HomeToolGrid({ locale = "en" }: { locale?: string }) {
  const copy = getCopy(locale);

  return (
    <section className="my-8 rounded-lg border bg-card p-4 shadow-sm md:p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">{copy.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {copy.subtitle}
          </p>
        </div>
        <Link
          href="/ai-tax"
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {copy.cta}
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.href}
              href={tool.href}
              className="group flex min-h-40 flex-col rounded-lg border bg-background p-4 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-base font-semibold text-foreground">
                {tool.label}
              </span>
              <span className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {tool.description}
              </span>
              <span className="mt-auto pt-4 text-xs font-medium text-muted-foreground">
                {tool.meta === "Free"
                  ? copy.free
                  : tool.meta === "Live"
                    ? copy.live
                    : copy.credit}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
