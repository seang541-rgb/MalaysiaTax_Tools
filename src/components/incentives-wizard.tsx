"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Award } from "lucide-react";

type Sector = "manufacturing" | "services" | "digital" | "green";
type Stage = "new" | "existing";

interface Incentive {
  id: string;
  sectors: Sector[];
  stages: Stage[];
}

// Matching matrix — content lives in translation files (incentives.<id>_*)
const INCENTIVES: Incentive[] = [
  { id: "pioneer", sectors: ["manufacturing", "services"], stages: ["new"] },
  { id: "ita", sectors: ["manufacturing", "services"], stages: ["new", "existing"] },
  { id: "ra", sectors: ["manufacturing"], stages: ["existing"] },
  { id: "gita", sectors: ["green"], stages: ["new", "existing"] },
  { id: "md", sectors: ["digital"], stages: ["new", "existing"] },
  { id: "automation", sectors: ["manufacturing"], stages: ["existing"] },
];

const SECTORS: Sector[] = ["manufacturing", "services", "digital", "green"];
const STAGES: Stage[] = ["new", "existing"];

export function IncentivesWizard() {
  const t = useTranslations("incentives");
  const [sector, setSector] = useState<Sector | null>(null);
  const [stage, setStage] = useState<Stage | null>(null);

  const matches =
    sector && stage
      ? INCENTIVES.filter(
          (i) => i.sectors.includes(sector) && i.stages.includes(stage)
        )
      : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>{t("sectorQuestion")}</Label>
            <div className="flex flex-wrap gap-2">
              {SECTORS.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={sector === s ? "default" : "outline"}
                  onClick={() => setSector(s)}
                >
                  {t(`sector_${s}`)}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("stageQuestion")}</Label>
            <div className="flex flex-wrap gap-2">
              {STAGES.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={stage === s ? "default" : "outline"}
                  onClick={() => setStage(s)}
                >
                  {t(`stage_${s}`)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {sector && stage && (
        <div className="space-y-4" role="region" aria-live="polite">
          {matches.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                {t("noMatch")}
              </CardContent>
            </Card>
          ) : (
            matches.map((inc) => (
              <Card key={inc.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Award className="h-5 w-5 text-primary shrink-0" />
                    {t(`${inc.id}_name`)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium">{t("benefitLabel")}: </span>
                    <span className="text-muted-foreground">
                      {t(`${inc.id}_benefit`)}
                    </span>
                  </p>
                  <p>
                    <span className="font-medium">{t("eligibilityLabel")}: </span>
                    <span className="text-muted-foreground">
                      {t(`${inc.id}_eligibility`)}
                    </span>
                  </p>
                  <p>
                    <span className="font-medium">{t("agencyLabel")}: </span>
                    <span className="text-muted-foreground">
                      {t(`${inc.id}_agency`)}
                    </span>
                  </p>
                </CardContent>
              </Card>
            ))
          )}
          <p className="text-xs text-muted-foreground p-3 bg-muted rounded-md">
            {t("disclaimer")}
          </p>
        </div>
      )}
    </div>
  );
}
