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
  prompts: string[];
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <section className="rounded-lg border bg-card p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              MYTax Agent
            </div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              {title}
            </h1>
            <p className="mt-2 text-muted-foreground md:text-base">
              {subtitle}
            </p>
          </div>
          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3 md:min-w-[440px]">
            <span className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2">
              <Coins className="h-4 w-4 text-primary" aria-hidden="true" />
              {creditHint}
            </span>
            <span className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2">
              <BookOpenCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              {contextHint}
            </span>
            <span className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2">
              <Calculator className="h-4 w-4 text-primary" aria-hidden="true" />
              {toolHint}
            </span>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">{promptTitle}</h2>
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <div className="grid gap-2">
            {prompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("mytax:ai-prompt", { detail: prompt })
                  );
                }}
                className="min-h-11 rounded-md border bg-background px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-foreground"
              >
                {prompt}
              </button>
            ))}
          </div>
          <p className="mt-4 rounded-md border border-primary/20 bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground">
            {promptNote}
          </p>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
