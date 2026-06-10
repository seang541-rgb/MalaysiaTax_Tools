"use client";

import { useTranslations, useLocale } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { TAX_SOURCES, TaxTopic } from "@/lib/tax-sources";

function formatVerified(ym: string, locale: string): string {
  const [year, month] = ym.split("-").map(Number);
  const d = new Date(year, (month || 1) - 1, 1);
  return d.toLocaleDateString(
    locale === "zh" ? "zh-CN" : locale === "ms" ? "ms-MY" : "en-MY",
    { year: "numeric", month: "long" }
  );
}

export function SourceNote({ topic }: { topic: TaxTopic }) {
  const t = useTranslations("sourceNote");
  const locale = useLocale();
  const entry = TAX_SOURCES[topic];
  if (!entry) return null;

  return (
    <div className="mt-6 flex items-start gap-2 text-xs text-muted-foreground border-t pt-4">
      <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary/70" />
      <p className="leading-relaxed">
        <span className="font-medium">{t("verified", { date: formatVerified(entry.verified, locale) })}</span>
        {" · "}
        <span>{t("sourceLabel")}: </span>
        {entry.sources.map((s, i) => (
          <span key={s.url}>
            {i > 0 && ", "}
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:no-underline"
            >
              {s.label}
            </a>
          </span>
        ))}
      </p>
    </div>
  );
}
