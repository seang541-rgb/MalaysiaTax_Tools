"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LocaleSwitcher } from "./locale-switcher";
import { ThemeToggle } from "./theme-toggle";
import { AuthButton } from "./auth-button";
import { CreditBalance } from "./credit-balance";
import { Menu, X } from "lucide-react";

export function Header() {
  const t = useTranslations("nav2");
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { href: "/", label: t("personalTax") },
    { href: "/corporate", label: t("corporateTax") },
    { href: "/batch-pcb", label: t("batchPcb") },
    { href: "/employer", label: t("employer") },
    { href: "/sst", label: t("sst") },
    { href: "/property", label: t("property") },
    { href: "/e-invoice", label: t("einvoice") },
    { href: "/corporate-tools", label: t("corpTools") },
    { href: "/ai-tax", label: t("aiTax") },
    { href: "/blog", label: t("blog") },
    { href: "/pricing", label: t("pricing") },
  ];

  return (
    <header className="border-b bg-white dark:bg-zinc-900 relative">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-xl font-bold text-primary">
            MYTax
          </Link>
        </div>
        <div className="flex items-center gap-4">
          {/* Desktop nav */}
          <nav className="hidden lg:flex gap-1">
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
          <CreditBalance />
          <AuthButton />
          <ThemeToggle />
          <LocaleSwitcher />
          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-2 rounded-md hover:bg-muted transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav dropdown */}
      {mobileOpen && (
        <nav className="lg:hidden border-t bg-white dark:bg-zinc-900 absolute left-0 right-0 z-50 shadow-lg">
          <div className="container mx-auto px-4 py-2 flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`px-3 py-3 rounded-md text-sm transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}
