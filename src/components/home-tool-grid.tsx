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

const TOOL_META = [
  { href: "/", icon: ReceiptText, cost: "free" },
  { href: "/corporate", icon: Building2, cost: "credit" },
  { href: "/ai-tax", icon: BotMessageSquare, cost: "credit" },
  { href: "/sst", icon: Landmark, cost: "credit" },
  { href: "/batch-pcb", icon: BadgePercent, cost: "free" },
  { href: "/corporate-tools", icon: FileSpreadsheet, cost: "credit" },
  { href: "/pricing", icon: CreditCard, cost: "live" },
] as const;

const TOOL_COPY = {
  en: [
    ["Personal Tax", "Personal income tax, reliefs, rebates, PCB and YA tax rates."],
    ["Corporate Tax", "Company tax, SME rates, capital allowance and tax payable."],
    ["AI Tax", "Ask Malaysia tax questions and route into calculator workflows."],
    ["SST & WHT", "SST registration checks, service tax, sales tax and WHT topics."],
    ["PCB", "Monthly PCB estimates and batch payroll checks."],
    ["CP204", "Tax estimate installments, revisions and cash-flow planning."],
    ["Pricing", "Buy one-time credits through live Stripe Checkout."],
  ],
  zh: [
    ["个人税", "个人所得税、减免、rebate、PCB 与 YA 税率。"],
    ["企业税", "公司税、SME 税率、capital allowance 与应缴税。"],
    ["AI 税务助手", "先说明你的马来西亚税务问题，再进入合适的计算流程。"],
    ["SST 与 WHT", "SST 注册检查、服务税、销售税与预扣税场景。"],
    ["PCB", "月薪扣税估算、批量 PCB 与雇主 payroll 检查。"],
    ["CP204", "预估税分期、修订与现金流规划。"],
    ["价格", "通过正式 Stripe Checkout 购买一次性 credits。"],
  ],
  ms: [
    ["Cukai Individu", "Cukai pendapatan individu, pelepasan, rebat, PCB dan kadar YA."],
    ["Cukai Syarikat", "Cukai syarikat, kadar SME, elaun modal dan cukai perlu dibayar."],
    ["AI Tax", "Tanya soalan cukai Malaysia dan teruskan ke aliran kalkulator yang sesuai."],
    ["SST & WHT", "Semakan pendaftaran SST, cukai perkhidmatan, cukai jualan dan WHT."],
    ["PCB", "Anggaran PCB bulanan dan semakan payroll majikan secara batch."],
    ["CP204", "Ansuran anggaran cukai, semakan semula dan perancangan aliran tunai."],
    ["Harga", "Beli kredit sekali bayar melalui Stripe Checkout rasmi."],
  ],
} as const;

function getCopy(locale: string) {
  if (locale === "zh") {
    return {
      title: "常用流程",
      subtitle: "按使用目的整理，而不是按内部功能名称排列。",
      promptPill: "建议第一步",
      promptTitle: "告诉 MYTax 你想处理什么",
      promptBody:
        "例如：我经营 Sdn Bhd，需要修改 CP204；或我想确认 YA2025 可以申报哪些个人减免。",
      cta: "询问 AI 税务助手",
      inputPlaceholder: "输入一个马来西亚税务问题...",
      inputCta: "开始",
      creditsTitle: "你的工作区",
      creditsBody:
        "付费工具会在执行前显示 credit 成本，免费计算器保持开放使用。",
      recentTitle: "最近：个人税草稿",
      recentBody: "最近：CP204 修订",
      trustTitle: "正式 Stripe 付款",
      trustBody: "余额、付款和工具权限使用一致的产品语言。",
      creditsAvailable: "9,979 credits 可用",
      freePreview: "免费预览",
      free: "\u514d\u8d39",
      credit: "1 credit",
      live: "正式上线",
      tools: TOOL_META.map((tool, index) => ({
        ...tool,
        label: TOOL_COPY.zh[index][0],
        description: TOOL_COPY.zh[index][1],
      })),
    };
  }

  if (locale === "ms") {
    return {
      title: "Aliran kerja utama",
      subtitle: "Disusun mengikut niat pengguna, bukan nama fungsi dalaman.",
      promptPill: "Langkah pertama",
      promptTitle: "Beritahu MYTax apa yang anda mahu buat",
      promptBody:
        "Contoh: Saya mengurus Sdn Bhd dan perlu semak CP204, atau mahu tahu pelepasan YA2025 yang layak.",
      cta: "Tanya AI Tax",
      inputPlaceholder: "Tanya soalan cukai Malaysia...",
      inputCta: "Mula",
      creditsTitle: "Ruang kerja anda",
      creditsBody:
        "Alat berbayar memaparkan kos kredit sebelum dijalankan. Kalkulator percuma kekal terbuka.",
      recentTitle: "Terkini: Draf cukai individu",
      recentBody: "Terkini: Semakan CP204",
      trustTitle: "Stripe Checkout rasmi",
      trustBody: "Baki, pembayaran dan akses alat menggunakan bahasa produk yang sama.",
      creditsAvailable: "9,979 credits tersedia",
      freePreview: "Pratonton percuma",
      free: "Percuma",
      credit: "1 credit",
      live: "Live",
      tools: TOOL_META.map((tool, index) => ({
        ...tool,
        label: TOOL_COPY.ms[index][0],
        description: TOOL_COPY.ms[index][1],
      })),
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
    creditsAvailable: "9,979 credits available",
    freePreview: "Free preview",
    free: "Free",
    credit: "1 credit",
    live: "Live",
    tools: TOOL_META.map((tool, index) => ({
      ...tool,
      label: TOOL_COPY.en[index][0],
      description: TOOL_COPY.en[index][1],
    })),
  };
}

export function HomeToolGrid({ locale = "en" }: { locale?: string }) {
  const copy = getCopy(locale);

  return (
    <section className="space-y-8">
      <div className="rounded-lg border border-border bg-card p-5 text-card-foreground shadow-sm md:p-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <span className="inline-flex rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
              {copy.promptPill}
            </span>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
              {copy.promptTitle}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {copy.promptBody}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted p-4 lg:w-[340px]">
            <p className="text-sm text-muted-foreground">
              {copy.inputPlaceholder}
            </p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                {copy.freePreview}
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
            <h2 className="text-2xl font-semibold text-foreground">
              {copy.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {copy.subtitle}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {copy.tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="group flex min-h-44 flex-col rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-accent text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="text-base font-semibold text-foreground">
                    {tool.label}
                  </span>
                  <span className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {tool.description}
                  </span>
                  <span className="mt-auto flex items-center justify-between pt-4 text-xs font-medium text-muted-foreground">
                    <span>
                      {tool.cost === "free"
                        ? copy.free
                        : tool.cost === "live"
                          ? copy.live
                          : copy.credit}
                    </span>
                    <ArrowUpRight
                      className="h-4 w-4 text-muted-foreground transition group-hover:text-primary"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        <aside className="space-y-3">
          <div className="rounded-lg border border-border bg-card p-5 text-card-foreground shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">
              {copy.creditsTitle}
            </h3>
            <p className="mt-4 text-sm font-semibold text-emerald-700">
              {copy.creditsAvailable}
            </p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {copy.creditsBody}
            </p>
            <div className="mt-4 space-y-3">
              {[copy.trustTitle, copy.recentTitle, copy.recentBody].map(
                (item) => (
                  <div
                    key={item}
                    className="rounded-full bg-muted px-3 py-2 text-xs font-medium text-muted-foreground"
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
