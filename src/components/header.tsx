"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LocaleSwitcher } from "./locale-switcher";

export function Header() {
  const t = useTranslations("nav2");
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: t("personalTax") },
    { href: "/corporate", label: t("corporateTax") },
    { href: "/batch-pcb", label: t("batchPcb") },
    { href: "/employer", label: t("employer") },
    { href: "/sst", label: t("sst") },
    { href: "/ai-tax", label: t("aiTax") },
  ];

  return (
    <header className="border-b bg-white">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-xl font-bold text-primary">
            MYTax
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <nav className="hidden md:flex gap-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <LocaleSwitcher />
        </div>
      </div>
    </header>
  );
}
