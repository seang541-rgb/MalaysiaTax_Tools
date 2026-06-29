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
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 text-zinc-950 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-xl font-semibold text-emerald-800">
            MYTax
          </Link>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          {/* Desktop nav */}
          <nav className="hidden min-w-0 gap-1 overflow-x-auto lg:flex">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-emerald-50 font-medium text-emerald-800"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="hidden items-center gap-3 lg:flex">
            <CreditBalance />
            <AuthButton />
            <ThemeToggle />
            <LocaleSwitcher />
          </div>
          {/* Mobile hamburger */}
          <button
            className="rounded-md p-2 text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 lg:hidden"
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
        <nav className="absolute left-0 right-0 z-50 border-t border-zinc-200 bg-white shadow-lg lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-2 sm:px-6">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-200 pb-3">
              <LocaleSwitcher />
              <ThemeToggle />
            </div>
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
                  className={`rounded-md px-3 py-3 text-sm transition-colors ${
                    isActive
                      ? "bg-emerald-50 font-medium text-emerald-800"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="mt-2 flex flex-col gap-2 border-t border-zinc-200 pt-3">
              <CreditBalance />
              <AuthButton />
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
