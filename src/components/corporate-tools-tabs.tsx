"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Cp204Calculator } from "./cp204-calculator";
import { CapitalAllowanceCalculator } from "./capital-allowance-calculator";
import { IncentivesWizard } from "./incentives-wizard";
import { TaxComputationCalculator } from "./tax-computation-calculator";

type Tool = "taxcomp" | "cp204" | "capalw" | "incentives";

export function CorporateToolsTabs() {
  const t = useTranslations("corptools");
  const [tool, setTool] = useState<Tool>("taxcomp");

  return (
    <div className="space-y-6">
      <Tabs value={tool} onValueChange={(v) => setTool(v as Tool)}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
          <TabsTrigger value="taxcomp">{t("tabTaxcomp")}</TabsTrigger>
          <TabsTrigger value="cp204">{t("tabCp204")}</TabsTrigger>
          <TabsTrigger value="capalw">{t("tabCapalw")}</TabsTrigger>
          <TabsTrigger value="incentives">{t("tabIncentives")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {tool === "taxcomp" && <TaxComputationCalculator />}
      {tool === "cp204" && <Cp204Calculator />}
      {tool === "capalw" && <CapitalAllowanceCalculator />}
      {tool === "incentives" && <IncentivesWizard />}
    </div>
  );
}
