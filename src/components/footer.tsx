"use client";

import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";

export function Footer() {
  const t = useTranslations("footer");
  const locale = useLocale();

  return (
    <footer className="border-t bg-white dark:bg-zinc-900 py-6 text-center text-xs text-muted-foreground">
      <div className="container mx-auto px-4 space-y-2">
        <div className="flex items-center justify-center gap-4">
          <Link href={`/${locale}/privacy`} className="hover:underline">
            {t("privacy")}
          </Link>
          <span>|</span>
          <Link href={`/${locale}/terms`} className="hover:underline">
            {t("terms")}
          </Link>
        </div>
        <p>&copy; {new Date().getFullYear()} MYTax. All rights reserved.</p>
      </div>
    </footer>
  );
}
