import type { ReactNode } from "react";
import { useLocale } from "next-intl";
import { BotMessageSquare, Coins, FileCheck2 } from "lucide-react";
import { Link } from "@/i18n/navigation";

function getShellCopy(locale: string) {
  if (locale === "zh") {
    return {
      aiHelper: "AI 助手",
      reviewBeforeAction: "操作前先复核",
      helpTitle: "填写时需要帮忙？",
      helpBody:
        "不用离开计算器也可以询问 AI。答案可以作为这个流程的填写参考。",
      askAi: "询问 AI",
      resultFallback: "结果预览",
      resultBody: "计算后结果会显示在这里。先展示假设，再展示最终应缴金额。",
      beforeCredits: "使用 credits 前",
      creditsBody:
        "按钮会清楚显示这次会消耗多少 credits，不会有隐藏运行成本。",
    };
  }

  if (locale === "ms") {
    return {
      aiHelper: "Pembantu AI",
      reviewBeforeAction: "Semak sebelum tindakan",
      helpTitle: "Perlu bantuan semasa mengisi?",
      helpBody:
        "Tanya AI tanpa meninggalkan kalkulator. Jawapan boleh dijadikan konteks untuk aliran ini.",
      askAi: "Tanya AI",
      resultFallback: "Pratonton keputusan",
      resultBody:
        "Keputusan akan dipaparkan di sini selepas pengiraan. Anda boleh semak andaian sebelum jumlah akhir.",
      beforeCredits: "Sebelum guna credits",
      creditsBody:
        "Butang akan menyatakan jumlah credits yang digunakan. Tiada kos tersembunyi.",
    };
  }

  return {
    aiHelper: "AI helper",
    reviewBeforeAction: "Review before action",
    helpTitle: "Need help while filling this?",
    helpBody:
      "Ask AI without leaving the calculator. The answer can fill context back into this workflow.",
    askAi: "Ask AI",
    resultFallback: "Result preview",
    resultBody:
      "Results appear here after calculation. Show assumptions before showing final payable amount.",
    beforeCredits: "Before using credits",
    creditsBody:
      "The button says exactly how many credits will be consumed. No hidden run cost.",
  };
}

export function ToolPageShell({
  eyebrow,
  title,
  subtitle,
  creditLabel = "Free",
  resultTitle = "Result preview",
  children,
  result,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  creditLabel?: string;
  resultTitle?: string;
  children: ReactNode;
  result?: ReactNode;
}) {
  const copy = getShellCopy(useLocale());

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-primary">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            {subtitle}
          </p>
        </div>
        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3 lg:min-w-[520px]">
          <span className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
            <Coins className="h-4 w-4 text-primary" aria-hidden="true" />
            {creditLabel}
          </span>
          <span className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
            <BotMessageSquare
              className="h-4 w-4 text-primary"
              aria-hidden="true"
            />
            {copy.aiHelper}
          </span>
          <span className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
            <FileCheck2 className="h-4 w-4 text-primary" aria-hidden="true" />
            {copy.reviewBeforeAction}
          </span>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 rounded-lg border border-border bg-card p-5 text-card-foreground shadow-sm md:p-6">
          <div className="mb-6 rounded-lg bg-accent p-4 text-accent-foreground">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold">{copy.helpTitle}</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {copy.helpBody}
                </p>
              </div>
              <Link
                href="/ai-tax"
                className="inline-flex min-h-10 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                {copy.askAi}
              </Link>
            </div>
          </div>
          {children}
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-5 text-card-foreground shadow-sm">
            <h2 className="text-xl font-semibold text-foreground">
              {resultTitle === "Result preview" ? copy.resultFallback : resultTitle}
            </h2>
            <p className="mt-4 text-3xl font-semibold text-primary">
              RM 0.00
            </p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {copy.resultBody}
            </p>
            {result ? <div className="mt-5">{result}</div> : null}
          </div>

          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-5">
            <h2 className="text-base font-semibold text-foreground">
              {copy.beforeCredits}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {copy.creditsBody}
            </p>
            <p className="mt-4 inline-flex rounded-full bg-card px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
              {creditLabel}
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}
