"use client";

import { useState, useSyncExternalStore } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Clock, ChevronDown, FileText } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { nextOccurrences } from "@/lib/tax-deadlines";

// Render nothing until hydrated, then compute on the client so "days remaining"
// reflects the user's local date without causing a hydration mismatch.
const subscribe = () => () => {};

export function DeadlineCountdown() {
  const t = useTranslations("deadlines");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  if (!hydrated) return null;

  const items = nextOccurrences();

  const fmtDate = (d: Date) =>
    d.toLocaleDateString(
      locale === "zh" ? "zh-CN" : locale === "ms" ? "ms-MY" : "en-MY",
      { day: "numeric", month: "short" }
    );

  const next = items[0];
  const nextLabel =
    next.daysRemaining === 0
      ? t("today")
      : t("daysLeft", { days: next.daysRemaining });

  return (
    <div className="rounded-lg border bg-card mb-6 overflow-hidden">
      {/* Slim bar — always visible */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-muted/40 transition-colors"
      >
        <Clock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <span className="text-muted-foreground shrink-0">{t("nextLabel")}</span>
        <span className="font-medium truncate">{t(`items.${next.id}`)}</span>
        <span className="shrink-0 text-xs font-semibold tabular-nums px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          {nextLabel}
        </span>
        <span className="ml-auto shrink-0 inline-flex items-center gap-1 text-xs text-muted-foreground">
          {open ? t("collapse") : t("viewAll")}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </span>
      </button>

      {/* Expanded — all deadlines + e-invoice guidance */}
      {open && (
        <div className="border-t px-4 py-3 space-y-2">
          {items.map((it) => {
            const urgent = it.daysRemaining <= 30;
            return (
              <div
                key={it.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{t(`items.${it.id}`)}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmtDate(it.date)}
                    {it.nextYear ? ` · ${t("nextYear")}` : ""}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-xs font-semibold tabular-nums px-2 py-0.5 rounded ${
                    urgent
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      : "text-muted-foreground"
                  }`}
                >
                  {it.daysRemaining === 0
                    ? t("today")
                    : t("daysLeft", { days: it.daysRemaining })}
                </span>
              </div>
            );
          })}

          <p className="text-xs text-muted-foreground pt-1">{t("note")}</p>

          {/* e-invoice guidance */}
          <Link
            href="/e-invoice"
            className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs hover:border-primary/50 hover:bg-primary/5 transition-colors"
          >
            <FileText className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            <span className="text-muted-foreground">{t("einvoicePrompt")}</span>
            <span className="ml-auto shrink-0 font-medium text-primary">{t("einvoiceLink")} →</span>
          </Link>
        </div>
      )}
    </div>
  );
}
