"use client";

import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { Info } from "lucide-react";

export function Footer() {
  const t = useTranslations("footer");
  const locale = useLocale();

  return (
    <footer className="border-t bg-white dark:bg-zinc-900 py-6 text-xs text-muted-foreground">
      <div className="container mx-auto px-4 space-y-3 text-center">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href={`/${locale}/privacy`} className="hover:underline">
            {t("privacy")}
          </Link>
          <span>·</span>
          <Link href={`/${locale}/terms`} className="hover:underline">
            {t("terms")}
          </Link>
          <span>·</span>
          <Link href={`/${locale}/disclaimer`} className="hover:underline">
            {t("disclaimer")}
          </Link>
        </div>
        <div className="flex items-start justify-center gap-2 pt-3 border-t max-w-2xl mx-auto">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
          <p className="text-left leading-relaxed">
            {t("disclaimerNote")}
          </p>
        </div>
        <p>&copy; {new Date().getFullYear()} MYTax. All rights reserved.</p>
      </div>
    </footer>
  );
}
