"use client";

import { useLocale, useTranslations } from "next-intl";
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

  const formattedDate = formatVerified(entry.verified, locale);
  const reviewedLabel = entry.reviewedLabel
    ? `${t(`reviewedLabel.${entry.reviewedLabel}`)} ${formattedDate}`
    : t("verified", { date: formattedDate });

  return (
    <div className="mt-6 flex items-start gap-2 border-t pt-4 text-xs text-muted-foreground">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
      <p className="leading-relaxed">
        <span className="font-medium">{reviewedLabel}</span>
        {entry.rulePeriod ? (
          <>
            {" | "}
            <span>{t("appliesTo", { period: entry.rulePeriod })}</span>
          </>
        ) : null}
        {" | "}
        <span>{t("sourceLabel")}: </span>
        {entry.sources.map((source, index) => (
          <span key={source.url}>
            {index > 0 && ", "}
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:no-underline"
            >
              {source.label}
            </a>
          </span>
        ))}
      </p>
    </div>
  );
}
