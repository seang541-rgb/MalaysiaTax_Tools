"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Cp204Calculator } from "./cp204-calculator";
import { CapitalAllowanceCalculator } from "./capital-allowance-calculator";
import { IncentivesWizard } from "./incentives-wizard";

type Tool = "cp204" | "capalw" | "incentives";

export function CorporateToolsTabs() {
  const t = useTranslations("corptools");
  const [tool, setTool] = useState<Tool>("cp204");

  return (
    <div className="space-y-6">
      <Tabs value={tool} onValueChange={(v) => setTool(v as Tool)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cp204">{t("tabCp204")}</TabsTrigger>
          <TabsTrigger value="capalw">{t("tabCapalw")}</TabsTrigger>
          <TabsTrigger value="incentives">{t("tabIncentives")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {tool === "cp204" && <Cp204Calculator />}
      {tool === "capalw" && <CapitalAllowanceCalculator />}
      {tool === "incentives" && <IncentivesWizard />}
    </div>
  );
}
