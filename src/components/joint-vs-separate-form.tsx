"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReliefSelector } from "@/components/relief-selector";
import { SourceNote } from "@/components/source-note";
import { IncomeInput, ReliefClaim } from "@/engine/types";
import {
  compareJointVsSeparate,
  type SpouseTaxProfile,
} from "@/engine/joint-assessment";

const YEAR = 2025;

function emptyIncome(): IncomeInput {
  return {
    employment: 0,
    commission: 0,
    rental: 0,
    interest: 0,
    dividend: 0,
    other: 0,
  };
}

function formatRm(amount: number): string {
  return amount.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface SpouseState {
  employment: number;
  other: number;
  reliefs: ReliefClaim[];
}

function initialSpouse(): SpouseState {
  return { employment: 0, other: 0, reliefs: [{ reliefId: "individual", amount: 9000 }] };
}

function toProfile(s: SpouseState): SpouseTaxProfile {
  return {
    income: { ...emptyIncome(), employment: s.employment, other: s.other },
    reliefs: s.reliefs,
    zakatAmount: 0,
    monthlyPcbPaid: 0,
  };
}

function SpousePanel({
  label,
  state,
  onChange,
}: {
  label: string;
  state: SpouseState;
  onChange: (next: SpouseState) => void;
}) {
  const t = useTranslations("jointAssessment");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{label}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>
              {t("employment")} — {t("annualIncome")}
            </Label>
            <Input
              type="number"
              min="0"
              value={state.employment || ""}
              onChange={(e) =>
                onChange({ ...state, employment: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div className="space-y-1">
            <Label>
              {t("other")} — {t("annualIncome")}
            </Label>
            <Input
              type="number"
              min="0"
              value={state.other || ""}
              onChange={(e) =>
                onChange({ ...state, other: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
        </CardContent>
      </Card>
      <ReliefSelector
        yearOfAssessment={YEAR}
        claims={state.reliefs}
        onClaimsChange={(reliefs) => onChange({ ...state, reliefs })}
      />
    </div>
  );
}

export function JointVsSeparateForm() {
  const t = useTranslations("jointAssessment");
  const [spouse1, setSpouse1] = useState<SpouseState>(initialSpouse());
  const [spouse2, setSpouse2] = useState<SpouseState>(initialSpouse());

  const comparison = useMemo(
    () =>
      compareJointVsSeparate({
        yearOfAssessment: YEAR,
        spouse1: toProfile(spouse1),
        spouse2: toProfile(spouse2),
      }),
    [spouse1, spouse2]
  );

  const { separateTax, jointTax, recommended, saving } = comparison;
  const sameTax = saving < 0.01;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <SpousePanel label={t("spouse1")} state={spouse1} onChange={setSpouse1} />
        <SpousePanel label={t("spouse2")} state={spouse2} onChange={setSpouse2} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("resultsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div
              className={`rounded-lg border p-4 ${
                !sameTax && recommended === "separate"
                  ? "border-primary bg-primary/5"
                  : ""
              }`}
            >
              <p className="text-sm text-muted-foreground">{t("separateLabel")}</p>
              <p className="text-2xl font-bold">RM{formatRm(separateTax)}</p>
              <p className="text-xs text-muted-foreground">{t("totalTax")}</p>
            </div>
            <div
              className={`rounded-lg border p-4 ${
                !sameTax && recommended === "joint"
                  ? "border-primary bg-primary/5"
                  : ""
              }`}
            >
              <p className="text-sm text-muted-foreground">{t("jointLabel")}</p>
              <p className="text-2xl font-bold">RM{formatRm(jointTax)}</p>
              <p className="text-xs text-muted-foreground">{t("totalTax")}</p>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-4">
            <ArrowRight className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-semibold">
                {sameTax
                  ? t("bothSame")
                  : recommended === "joint"
                    ? t("recommendedJoint")
                    : t("recommendedSeparate")}
              </p>
              {!sameTax && (
                <p className="text-sm text-muted-foreground">
                  {t("saving", { amount: formatRm(saving) })}
                </p>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">{t("estimateNote")}</p>
          <SourceNote topic="joint-assessment" />
        </CardContent>
      </Card>
    </div>
  );
}
