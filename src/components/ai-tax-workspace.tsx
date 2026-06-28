"use client";

import type { ReactNode } from "react";
import { BookOpenCheck, Calculator, Coins, Sparkles } from "lucide-react";

export function AiTaxWorkspace({
  title,
  subtitle,
  creditHint,
  contextHint,
  toolHint,
  promptTitle = "Try asking",
  promptNote = "Ask directly. The agent detects the tax area and asks follow-up questions only when details are missing.",
  contextPanelTitle = "Tax Context",
  contextPanelNote = "Keep the old fill-in flow, but use it as supporting context for the chat.",
  contextApplyLabel = "Apply context",
  contextFields = [
    ["Taxpayer type", "Sdn Bhd / Individual"],
    ["Year of assessment", "YA 2025"],
    ["Income / revenue", "RM 0.00"],
    ["Reliefs or deductions", "Add item"],
    ["Documents", "Upload / paste"],
  ],
  prompts,
  children,
}: {
  title: string;
  subtitle: string;
  creditHint: string;
  contextHint: string;
  toolHint: string;
  promptTitle?: string;
  promptNote?: string;
  contextPanelTitle?: string;
  contextPanelNote?: string;
  contextApplyLabel?: string;
  contextFields?: [string, string][];
  prompts: string[];
  children: ReactNode;
}) {
  return (
    <div className="min-h-[calc(100vh-4rem)] w-full overflow-x-hidden bg-[#f3f6f3] py-6 text-zinc-950 [--border:#d4ddd7] [--card-foreground:#18181b] [--card:#ffffff] [--muted-foreground:#52525b] [--muted:#f4f7f5] [--primary-foreground:#ffffff] [--primary:#047857]">
      <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
        <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              MYTax Agent
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-950 md:text-4xl">
              {title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 md:text-base">
              {subtitle}
            </p>
          </div>
          <div className="grid gap-2 text-xs text-zinc-600 sm:grid-cols-3 lg:min-w-[520px]">
            <span className="inline-flex min-h-10 items-center gap-2 rounded-md border border-emerald-100 bg-white px-3 py-2">
              <Coins className="h-4 w-4 text-primary" aria-hidden="true" />
              {creditHint}
            </span>
            <span className="inline-flex min-h-10 items-center gap-2 rounded-md border border-emerald-100 bg-white px-3 py-2">
              <BookOpenCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              {contextHint}
            </span>
            <span className="inline-flex min-h-10 items-center gap-2 rounded-md border border-emerald-100 bg-white px-3 py-2">
              <Calculator className="h-4 w-4 text-primary" aria-hidden="true" />
              {toolHint}
            </span>
          </div>
        </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <main className="min-w-0 space-y-4">
          <div className="mb-4 space-y-3 rounded-lg border border-zinc-200 bg-[#f7faf8] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
              {promptTitle}
            </div>
            <div className="flex flex-wrap gap-2">
              {prompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("mytax:ai-prompt", { detail: prompt })
                    );
                  }}
                  className="min-h-9 rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-left text-xs font-medium text-zinc-600 transition-colors hover:border-primary/40 hover:bg-emerald-50 hover:text-zinc-950"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <p className="max-w-3xl text-xs leading-relaxed text-zinc-500">
              {promptNote}
            </p>
          </div>

          <div>{children}</div>
        </main>

        <aside
          aria-labelledby="tax-context-heading"
          className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm xl:sticky xl:top-24 xl:h-fit"
        >
          <h2 id="tax-context-heading" className="text-xl font-bold text-zinc-950">
            {contextPanelTitle}
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            {contextPanelNote}
          </p>

          <div className="mt-5 space-y-4">
            {contextFields.map(([label, value]) => (
              <div key={label} className="space-y-2">
                <div className="text-xs font-semibold text-zinc-600">{label}</div>
                <div
                  className={
                    label === "Reliefs or deductions" || label === "扣除 / 减免" || label === "Pelepasan / potongan"
                      ? "min-h-11 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-700"
                      : "min-h-11 rounded-md border border-zinc-200 bg-[#f7faf8] px-3 py-2.5 text-sm font-medium text-zinc-900"
                  }
                >
                  {value}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="mt-5 min-h-10 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {contextApplyLabel}
          </button>
        </aside>
      </div>
      </div>
    </div>
  );
}
