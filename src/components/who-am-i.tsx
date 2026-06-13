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
    <section className="rounded-lg border bg-card p-4 my-8">
      <p className="text-sm font-medium mb-3">{t("title")}</p>

      <div className="flex flex-wrap gap-2">
        {PERSONAS.map((p) => {
          const Icon = p.icon;
          const selected = p.id === active;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setActive(selected ? null : p.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                selected
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted/60"
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {t(`p_${p.id}`)}
            </button>
          );
        })}
      </div>

      {activePersona && (
        <div className="mt-3 flex flex-col gap-1.5">
          {activePersona.tools.map((tool) => (
            <Link
              key={tool.labelKey}
              href={tool.href}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              <span className="font-medium">{t(tool.labelKey)}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
