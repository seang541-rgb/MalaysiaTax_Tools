"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditChargeButton } from "@/components/credit-charge-button";
import { RpgtCalculator } from "./rpgt-calculator";
import { StampDutyCalculator } from "./stamp-duty-calculator";

type Tool = "rpgt" | "stampduty";

export function PropertyToolsTabs() {
  const t = useTranslations("property");
  const creditT = useTranslations("creditUse");
  const [tool, setTool] = useState<Tool>("rpgt");
  const [unlockedTools, setUnlockedTools] = useState<Set<Tool>>(new Set());

  function unlockCurrentTool() {
    setUnlockedTools((prev) => new Set(prev).add(tool));
  }

  const isUnlocked = unlockedTools.has(tool);

  return (
    <div className="space-y-6">
      <Tabs value={tool} onValueChange={(v) => setTool(v as Tool)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="rpgt">{t("tabRpgt")}</TabsTrigger>
          <TabsTrigger value="stampduty">{t("tabStampDuty")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {!isUnlocked && (
        <Card>
          <CardHeader>
            <CardTitle>{creditT("unlockTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <CreditChargeButton
              feature="property_calculation"
              requestSummary={{ tool }}
              onCharged={unlockCurrentTool}
            />
          </CardContent>
        </Card>
      )}

      {isUnlocked && tool === "rpgt" && <RpgtCalculator />}
      {isUnlocked && tool === "stampduty" && <StampDutyCalculator />}
    </div>
  );
}
