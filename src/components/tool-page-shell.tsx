import type { ReactNode } from "react";
import { BotMessageSquare, Coins, FileCheck2 } from "lucide-react";
import { Link } from "@/i18n/navigation";

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
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-emerald-700">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 md:text-5xl">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-600">
            {subtitle}
          </p>
        </div>
        <div className="grid gap-2 text-xs text-zinc-600 sm:grid-cols-3 lg:min-w-[520px]">
          <span className="inline-flex min-h-10 items-center gap-2 rounded-md border border-emerald-100 bg-white px-3 py-2">
            <Coins className="h-4 w-4 text-emerald-700" aria-hidden="true" />
            {creditLabel}
          </span>
          <span className="inline-flex min-h-10 items-center gap-2 rounded-md border border-emerald-100 bg-white px-3 py-2">
            <BotMessageSquare
              className="h-4 w-4 text-emerald-700"
              aria-hidden="true"
            />
            AI helper
          </span>
          <span className="inline-flex min-h-10 items-center gap-2 rounded-md border border-emerald-100 bg-white px-3 py-2">
            <FileCheck2
              className="h-4 w-4 text-emerald-700"
              aria-hidden="true"
            />
            Review before action
          </span>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-6 rounded-lg bg-emerald-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-zinc-950">
                  Need help while filling this?
                </h2>
                <p className="mt-1 text-sm leading-6 text-zinc-600">
                  Ask AI without leaving the calculator. The answer can fill
                  context back into this workflow.
                </p>
              </div>
              <Link
                href="/ai-tax"
                className="inline-flex min-h-10 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Ask AI
              </Link>
            </div>
          </div>
          {children}
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-zinc-950">
              {resultTitle}
            </h2>
            <p className="mt-4 text-3xl font-semibold text-emerald-700">
              RM 0.00
            </p>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Results appear here after calculation. Show assumptions before
              showing final payable amount.
            </p>
            {result ? <div className="mt-5">{result}</div> : null}
          </div>

          <div className="rounded-lg bg-amber-50 p-5">
            <h2 className="text-base font-semibold text-zinc-950">
              Before using credits
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              The button says exactly how many credits will be consumed. No
              hidden run cost.
            </p>
            <p className="mt-4 inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-700">
              {creditLabel}
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}
