"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TaxExplanation() {
  const t = useTranslations("explanation");

  const sections = [
    { title: t("whatIsTaxable"), body: t("taxableDesc") },
    { title: t("howItWorks"), body: t("howItWorksDesc") },
    { title: t("whatAreReliefs"), body: t("reliefsDesc") },
    { title: t("whatIsPcb"), body: t("pcbDesc") },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {sections.map((section) => (
          <div key={section.title}>
            <h3 className="font-semibold mb-2">{section.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {section.body}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
