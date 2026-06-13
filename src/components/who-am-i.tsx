"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Briefcase,
  Store,
  Building2,
  Users,
  Home,
  ArrowRight,
} from "lucide-react";

type Persona = "employee" | "soleprop" | "company" | "employer" | "property";

interface ToolLink {
  href: string;
  labelKey: string;
}

const PERSONAS: { id: Persona; icon: typeof Briefcase; tools: ToolLink[] }[] = [
  {
    id: "employee",
    icon: Briefcase,
    tools: [
      { href: "/", labelKey: "t_personal" },
      { href: "/ai-tax", labelKey: "t_ai" },
    ],
  },
  {
    id: "soleprop",
    icon: Store,
    tools: [
      { href: "/corporate-tools", labelKey: "t_soleprop" },
      { href: "/sst", labelKey: "t_sst" },
      { href: "/e-invoice", labelKey: "t_einvoice" },
    ],
  },
  {
    id: "company",
    icon: Building2,
    tools: [
      { href: "/corporate", labelKey: "t_corporate" },
      { href: "/corporate-tools", labelKey: "t_corptools" },
      { href: "/e-invoice", labelKey: "t_einvoice" },
      { href: "/sst", labelKey: "t_sst" },
    ],
  },
  {
    id: "employer",
    icon: Users,
    tools: [
      { href: "/employer", labelKey: "t_employer" },
      { href: "/batch-pcb", labelKey: "t_batchpcb" },
    ],
  },
  {
    id: "property",
    icon: Home,
    tools: [{ href: "/property", labelKey: "t_property" }],
  },
];

export function WhoAmI() {
  const t = useTranslations("whoami");
  const [active, setActive] = useState<Persona | null>(null);

  const activePersona = PERSONAS.find((p) => p.id === active);

  return (
    <section className="rounded-lg border bg-card p-5 my-8">
      <h2 className="text-lg font-semibold mb-1">{t("title")}</h2>
      <p className="text-sm text-muted-foreground mb-4">{t("subtitle")}</p>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {PERSONAS.map((p) => {
          const Icon = p.icon;
          const selected = p.id === active;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setActive(selected ? null : p.id)}
              className={`flex flex-col items-center gap-2 rounded-lg border px-2 py-3 text-center transition-colors ${
                selected
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted/60"
              }`}
            >
              <Icon
                className={`h-5 w-5 ${selected ? "text-primary" : "text-muted-foreground"}`}
                aria-hidden="true"
              />
              <span className="text-xs font-medium leading-tight">
                {t(`p_${p.id}`)}
              </span>
            </button>
          );
        })}
      </div>

      {activePersona && (
        <div className="mt-4 rounded-md bg-muted/40 p-4">
          <p className="text-sm font-medium mb-3">
            {t("recommendedFor", { persona: t(`p_${activePersona.id}`) })}
          </p>
          <div className="flex flex-col gap-2">
            {activePersona.tools.map((tool) => (
              <Link
                key={tool.labelKey}
                href={tool.href}
                className="flex items-center justify-between rounded-md border bg-card px-3 py-2.5 text-sm hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <span className="font-medium">{t(tool.labelKey)}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
