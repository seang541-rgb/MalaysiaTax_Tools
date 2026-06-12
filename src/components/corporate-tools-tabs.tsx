"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditChargeButton } from "@/components/credit-charge-button";
import { Cp204Calculator } from "./cp204-calculator";
import { CapitalAllowanceCalculator } from "./capital-allowance-calculator";
import { IncentivesWizard } from "./incentives-wizard";
import { TaxComputationCalculator } from "./tax-computation-calculator";
import { WithholdingTaxCalculator } from "./withholding-tax-calculator";
import { SoleProprietorCalculator } from "./sole-proprietor-calculator";

type Tool = "taxcomp" | "soleprop" | "cp204" | "capalw" | "wht" | "incentives";

export function CorporateToolsTabs() {
  const t = useTranslations("corptools");
  const creditT = useTranslations("creditUse");
  const [tool, setTool] = useState<Tool>("taxcomp");
  const [unlockedTools, setUnlockedTools] = useState<Set<Tool>>(new Set());

  function unlockCurrentTool() {
    setUnlockedTools((prev) => new Set(prev).add(tool));
  }

  const isUnlocked = unlockedTools.has(tool);

  return (
    <div className="space-y-6">
      <Tabs value={tool} onValueChange={(v) => setTool(v as Tool)}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 h-auto">
          <TabsTrigger value="taxcomp">{t("tabTaxcomp")}</TabsTrigger>
          <TabsTrigger value="soleprop">{t("tabSoleprop")}</TabsTrigger>
          <TabsTrigger value="cp204">{t("tabCp204")}</TabsTrigger>
          <TabsTrigger value="capalw">{t("tabCapalw")}</TabsTrigger>
          <TabsTrigger value="wht">{t("tabWht")}</TabsTrigger>
          <TabsTrigger value="incentives">{t("tabIncentives")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {!isUnlocked && (
        <Card>
          <CardHeader>
            <CardTitle>{creditT("unlockTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <CreditChargeButton
              feature="corporate_tools_run"
              requestSummary={{ tool }}
              onCharged={unlockCurrentTool}
            />
          </CardContent>
        </Card>
      )}

      {isUnlocked && tool === "taxcomp" && <TaxComputationCalculator />}
      {isUnlocked && tool === "soleprop" && <SoleProprietorCalculator />}
      {isUnlocked && tool === "cp204" && <Cp204Calculator />}
      {isUnlocked && tool === "capalw" && <CapitalAllowanceCalculator />}
      {isUnlocked && tool === "wht" && <WithholdingTaxCalculator />}
      {isUnlocked && tool === "incentives" && <IncentivesWizard />}
    </div>
  );
}
