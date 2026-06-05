"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

const localeLabels: Record<string, string> = {
  en: "EN",
  zh: "中文",
  ms: "BM",
};

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(newLocale: string) {
    router.replace(pathname, { locale: newLocale });
  }

  return (
    <div className="flex gap-1">
      {Object.entries(localeLabels).map(([key, label]) => (
        <Button
          key={key}
          variant={locale === key ? "default" : "outline"}
          size="sm"
          onClick={() => switchLocale(key)}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
