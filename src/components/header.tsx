"use client";

import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "./locale-switcher";

export function Header() {
  const t = useTranslations("nav");

  return (
    <header className="border-b bg-white">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary">MYTax</span>
        </div>
        <div className="flex items-center gap-4">
          <nav className="hidden md:flex gap-4 text-sm">
            <span className="text-muted-foreground">{t("calculator")}</span>
          </nav>
          <LocaleSwitcher />
        </div>
      </div>
    </header>
  );
}
