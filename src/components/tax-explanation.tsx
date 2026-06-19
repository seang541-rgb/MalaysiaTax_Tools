"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";

export function TaxExplanation() {
  const t = useTranslations("explanation");
  const [open, setOpen] = useState(false);

  const sections = [
    { title: t("whatIsTaxable"), body: t("taxableDesc") },
    { title: t("howItWorks"), body: t("howItWorksDesc") },
    { title: t("whatAreReliefs"), body: t("reliefsDesc") },
    { title: t("whatIsPcb"), body: t("pcbDesc") },
  ];

  return (
    <div className="rounded-lg border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="font-semibold">{t("title")}</span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="space-y-5 border-t px-5 py-4">
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="font-semibold mb-1.5 text-sm">{section.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {section.body}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
