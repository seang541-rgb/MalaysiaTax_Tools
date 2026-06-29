import {
  ArrowUpRight,
  BadgePercent,
  BotMessageSquare,
  Building2,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileSpreadsheet,
  Landmark,
  ReceiptText,
  ShieldCheck,
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
      title: "常用工具",
      subtitle: "把常用税务工具放在同一个工作台，先问 AI，再进入计算器。",
      promptTitle: "先问 AI，再进入计算器",
      promptBody: "描述你的情况，AI Tax 会把你带到个人税、公司税、SST、PCB 或 credits 流程。",
      cta: "Ask AI Tax",
      creditsTitle: "Credits & access",
      creditsBody: "免费工具可直接使用，付费工具会在使用前显示 credit 成本。",
      recentTitle: "Recent work",
      recentBody: "继续处理最近的个人税、公司税或 payroll 检查。",
      trustTitle: "Live workspace",
      trustBody: "Stripe live checkout、Supabase balance 和工具入口已放在同一个体验。",
      free: "\u514d\u8d39",
      credit: "1 credit",
      live: "Live",
    };
  }

  if (locale === "ms") {
    return {
      title: "Alat utama",
      subtitle: "Satu ruang kerja untuk kalkulator cukai, AI Tax dan credits.",
      promptTitle: "Tanya AI sebelum kira",
      promptBody: "Terangkan situasi anda dan AI Tax akan halakan ke aliran kerja yang sesuai.",
      cta: "Tanya AI Tax",
      creditsTitle: "Credits & access",
      creditsBody: "Alat percuma boleh digunakan terus; alat berbayar tunjuk kos credit dahulu.",
      recentTitle: "Recent work",
      recentBody: "Sambung semakan cukai peribadi, syarikat atau payroll.",
      trustTitle: "Live workspace",
      trustBody: "Stripe live checkout, Supabase balance dan pintasan alat berada dalam satu ruang.",
      free: "Percuma",
      credit: "1 credit",
      live: "Live",
    };
  }

  return {
    title: "Common tools",
    subtitle: "A single workspace for calculators, AI Tax and credits.",
    promptTitle: "Ask AI first, then calculate",
    promptBody: "Describe the case and AI Tax routes you into the right Malaysia tax workflow.",
    cta: "Ask AI Tax",
    creditsTitle: "Credits & access",
    creditsBody: "Free tools open directly. Paid tools show the credit cost before use.",
    recentTitle: "Recent work",
    recentBody: "Continue personal tax, corporate tax or payroll checks from one place.",
    trustTitle: "Live workspace",
    trustBody: "Stripe live checkout, Supabase balances and tool access share one experience.",
    free: "Free",
    credit: "1 credit",
    live: "Live",
  };
}

export function HomeToolGrid({ locale = "en" }: { locale?: string }) {
  const copy = getCopy(locale);

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm md:p-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <p className="text-sm font-medium text-emerald-700">AI Tax</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
              {copy.promptTitle}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
              {copy.promptBody}
            </p>
          </div>
          <Link
            href="/ai-tax"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-800"
          >
            {copy.cta}
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-zinc-950">
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
                  className="group flex min-h-40 flex-col rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30"
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
          {[
            {
              title: copy.creditsTitle,
              body: copy.creditsBody,
              icon: CheckCircle2,
              tone: "text-emerald-700 bg-emerald-50",
            },
            {
              title: copy.recentTitle,
              body: copy.recentBody,
              icon: Clock3,
              tone: "text-blue-700 bg-blue-50",
            },
            {
              title: copy.trustTitle,
              body: copy.trustBody,
              icon: ShieldCheck,
              tone: "text-amber-700 bg-amber-50",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <span
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-md ${item.tone}`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-3 text-sm font-semibold text-zinc-950">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm leading-6 text-zinc-600">
                  {item.body}
                </p>
              </div>
            );
          })}
        </aside>
      </div>
    </section>
  );
}
