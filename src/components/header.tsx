"use client";

import { useState } from "react";
import type { ComponentType } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LocaleSwitcher } from "./locale-switcher";
import { ThemeToggle } from "./theme-toggle";
import { AuthButton } from "./auth-button";
import { CreditBalance } from "./credit-balance";
import {
  BotMessageSquare,
  BriefcaseBusiness,
  Building2,
  Calculator,
  CreditCard,
  FileText,
  Home,
  Landmark,
  Menu,
  ReceiptText,
  WalletCards,
  X,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  match?: string[];
};

function isActive(pathname: string, item: NavItem) {
  const matches = item.match ?? [item.href];
  return matches.some((match) =>
    match === "/" ? pathname === "/" : pathname.startsWith(match),
  );
}

export function Header() {
  const t = useTranslations("nav2");
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const groups: { title: string; items: NavItem[] }[] = [
    {
      title: "START",
      items: [
        { href: "/", label: "Workspace", icon: Home, match: ["/"] },
        { href: "/ai-tax", label: t("aiTax"), icon: BotMessageSquare },
      ],
    },
    {
      title: "CALCULATE",
      items: [
        { href: "/", label: t("personalTax"), icon: ReceiptText, match: [] },
        { href: "/corporate", label: t("corporateTax"), icon: Building2 },
        { href: "/batch-pcb", label: t("batchPcb"), icon: Calculator },
        { href: "/sst", label: t("sst"), icon: Landmark },
        { href: "/property", label: t("property"), icon: BriefcaseBusiness },
      ],
    },
    {
      title: "MANAGE",
      items: [
        { href: "/e-invoice", label: t("einvoice"), icon: FileText },
        { href: "/corporate-tools", label: t("corpTools"), icon: WalletCards },
        { href: "/blog", label: t("blog"), icon: FileText },
        { href: "/pricing", label: t("pricing"), icon: CreditCard },
      ],
    },
  ];

  const mobileActions: NavItem[] = [
    { href: "/", label: "Home", icon: Home, match: ["/"] },
    { href: "/ai-tax", label: "AI", icon: BotMessageSquare },
    { href: "/corporate", label: "Tools", icon: Calculator },
    { href: "/pricing", label: "Credits", icon: CreditCard },
  ];

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[244px] flex-col border-r border-zinc-200 bg-white/90 px-4 py-6 text-zinc-950 shadow-sm backdrop-blur lg:flex">
        <div>
          <Link href="/" className="text-2xl font-semibold text-emerald-700">
            MYTax
          </Link>
          <p className="mt-2 text-sm text-zinc-500">Malaysia tax workspace</p>
        </div>

        <nav aria-label="Primary" className="mt-10 space-y-7">
          {groups.map((group) => (
            <div key={group.title} className="space-y-2">
              <p className="px-2 text-[11px] font-semibold uppercase tracking-normal text-zinc-500">
                {group.title}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = isActive(pathname, item);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={`${group.title}-${item.href}-${item.label}`}
                      href={item.href}
                      className={`flex min-h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors ${
                        active
                          ? "bg-emerald-50 font-semibold text-emerald-800"
                          : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 ${active ? "text-emerald-700" : "text-zinc-500"}`}
                        aria-hidden={true}
                      />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto space-y-3 rounded-lg border border-zinc-200 bg-white p-3 text-sm shadow-sm">
          <CreditBalance />
          <div className="text-xs text-zinc-500">Account / EN 中文 BM</div>
          <div className="flex flex-wrap items-center gap-2">
            <AuthButton />
            <ThemeToggle />
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 text-zinc-950 backdrop-blur lg:hidden">
        <div className="flex min-h-16 items-center justify-between gap-3 px-4">
          <Link href="/" className="text-xl font-semibold text-emerald-700">
            MYTax
          </Link>
          <div className="flex items-center gap-2">
            <CreditBalance />
            <button
              type="button"
              className="rounded-md p-2 text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <nav
            aria-label="Mobile menu"
            className="absolute left-0 right-0 z-50 border-t border-zinc-200 bg-white p-4 shadow-lg"
          >
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-zinc-200 pb-3">
              <LocaleSwitcher />
              <ThemeToggle />
            </div>
            <div className="grid gap-2">
              {groups.flatMap((group) =>
                group.items.map((item) => (
                  <Link
                    key={`${group.title}-mobile-${item.href}-${item.label}`}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-md px-3 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
                  >
                    {item.label}
                  </Link>
                )),
              )}
            </div>
            <div className="mt-4 border-t border-zinc-200 pt-3">
              <AuthButton />
            </div>
          </nav>
        ) : null}
      </header>

      <nav
        aria-label="Mobile workflow"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-zinc-200 bg-white/95 px-2 pb-2 pt-2 text-xs text-zinc-500 shadow-[0_-6px_20px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden"
      >
        {mobileActions.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={`mobile-action-${item.href}-${item.label}`}
              href={item.href}
              className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-md ${
                active ? "font-semibold text-emerald-700" : "text-zinc-500"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden={true} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
