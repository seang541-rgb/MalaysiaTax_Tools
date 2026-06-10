"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RpgtCalculator } from "./rpgt-calculator";
import { StampDutyCalculator } from "./stamp-duty-calculator";

type Tool = "rpgt" | "stampduty";

export function PropertyToolsTabs() {
  const t = useTranslations("property");
  const [tool, setTool] = useState<Tool>("rpgt");

  return (
    <div className="space-y-6">
      <Tabs value={tool} onValueChange={(v) => setTool(v as Tool)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="rpgt">{t("tabRpgt")}</TabsTrigger>
          <TabsTrigger value="stampduty">{t("tabStampDuty")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {tool === "rpgt" && <RpgtCalculator />}
      {tool === "stampduty" && <StampDutyCalculator />}
    </div>
  );
}
