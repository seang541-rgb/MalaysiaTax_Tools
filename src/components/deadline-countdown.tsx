"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { CalendarClock } from "lucide-react";
import { nextOccurrences, DeadlineOccurrence } from "@/lib/tax-deadlines";

export function DeadlineCountdown() {
  const t = useTranslations("deadlines");
  const locale = useLocale();
  const [items, setItems] = useState<DeadlineOccurrence[] | null>(null);

  // Compute on the client so "days remaining" matches the user's local date
  // (avoids server/client hydration mismatch on a date-dependent value).
  useEffect(() => {
    setItems(nextOccurrences());
  }, []);

  if (!items) return null;

  const fmtDate = (d: Date) =>
    d.toLocaleDateString(
      locale === "zh" ? "zh-CN" : locale === "ms" ? "ms-MY" : "en-MY",
      { day: "numeric", month: "short" }
    );

  const next = items[0];

  return (
    <div className="rounded-lg border bg-card p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <CalendarClock className="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 className="text-sm font-semibold">{t("title")}</h2>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((it) => {
          const isNext = it === next;
          const urgent = it.daysRemaining <= 30;
          return (
            <div
              key={it.id}
              className={`flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm ${
                isNext
                  ? "bg-primary/5 border border-primary/20"
                  : "bg-muted/40"
              }`}
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{t(`items.${it.id}`)}</p>
                <p className="text-xs text-muted-foreground">
                  {fmtDate(it.date)}
                  {it.nextYear ? ` · ${t("nextYear")}` : ""}
                </p>
              </div>
              <span
                className={`shrink-0 text-xs font-semibold tabular-nums px-2 py-1 rounded ${
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
      </div>

      <p className="text-xs text-muted-foreground mt-3">{t("note")}</p>
    </div>
  );
}
