"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { Info } from "lucide-react";

export function Footer() {
  const t = useTranslations("footer");
  const locale = useLocale();

  return (
    <footer className="border-t border-zinc-200 bg-white py-6 text-xs text-zinc-500 lg:ml-[244px]">
      <div className="mx-auto max-w-7xl space-y-3 px-4 text-center sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href={`/${locale}/privacy`}
            className="hover:text-zinc-900 hover:underline"
          >
            {t("privacy")}
          </Link>
          <span aria-hidden="true">/</span>
          <Link
            href={`/${locale}/terms`}
            className="hover:text-zinc-900 hover:underline"
          >
            {t("terms")}
          </Link>
          <span aria-hidden="true">/</span>
          <Link
            href={`/${locale}/disclaimer`}
            className="hover:text-zinc-900 hover:underline"
          >
            {t("disclaimer")}
          </Link>
        </div>
        <div className="mx-auto flex max-w-2xl items-start justify-center gap-2 border-t border-zinc-200 pt-3">
          <Info
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700"
            aria-hidden="true"
          />
          <p className="text-left leading-relaxed">{t("disclaimerNote")}</p>
        </div>
        <p>&copy; {new Date().getFullYear()} MYTax. All rights reserved.</p>
      </div>
    </footer>
  );
}
