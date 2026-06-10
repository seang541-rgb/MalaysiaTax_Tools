"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  calculateCapitalAllowance,
  CapitalAssetType,
} from "@/engine/capital-allowance";
import { SourceNote } from "./source-note";

const ASSET_TYPES: CapitalAssetType[] = [
  "general_pm",
  "heavy_machinery",
  "ict",
  "office",
  "motor_vehicle",
  "industrial_building",
  "small_value",
];

function formatRM(amount: number): string {
  return `RM ${amount.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function CapitalAllowanceCalculator() {
  const t = useTranslations("capalw");

  const [assetType, setAssetType] = useState<CapitalAssetType>("general_pm");
  const [cost, setCost] = useState(0);
  const [isNewVehicle, setIsNewVehicle] = useState(true);

  const result = useMemo(() => {
    if (cost <= 0) return null;
    return calculateCapitalAllowance({
      assetType,
      cost,
      isNewVehicleUnder150k: assetType === "motor_vehicle" ? isNewVehicle : undefined,
    });
  }, [assetType, cost, isNewVehicle]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("inputTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ca-asset-type">{t("assetType")}</Label>
            <select
              id="ca-asset-type"
              className="w-full h-10 px-3 rounded-md border bg-background text-sm"
              value={assetType}
              onChange={(e) => setAssetType(e.target.value as CapitalAssetType)}
            >
              {ASSET_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`asset_${type}`)}
                </option>
              ))}
            </select>
          </div>

          {assetType === "motor_vehicle" && (
            <div className="flex items-center gap-4">
              <Label className="text-sm font-normal">{t("newVehicleQuestion")}</Label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={isNewVehicle ? "default" : "outline"}
                  onClick={() => setIsNewVehicle(true)}
                >
                  {t("yes")}
                </Button>
                <Button
                  size="sm"
                  variant={!isNewVehicle ? "default" : "outline"}
                  onClick={() => setIsNewVehicle(false)}
                >
                  {t("no")}
                </Button>
              </div>
            </div>
          )}

          {assetType === "small_value" && (
            <p className="text-xs text-muted-foreground">{t("smallValueNote")}</p>
          )}

          <div className="space-y-2">
            <Label htmlFor="ca-cost">{t("cost")}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                RM
              </span>
              <Input
                id="ca-cost"
                type="number"
                min="0"
                step="1000"
                className="pl-12 text-lg h-12"
                value={cost || ""}
                onChange={(e) => setCost(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <Button size="sm" variant="outline" onClick={() => setCost(0)}>
            {t("reset")}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card role="region" aria-live="polite">
          <CardHeader>
            <CardTitle>{t("resultsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3 text-center">
              <div className="rounded-lg bg-primary/5 border p-4">
                <p className="text-xs text-muted-foreground mb-1">{t("qeLabel")}</p>
                <p className="text-lg font-bold">{formatRM(result.qualifyingExpenditure)}</p>
              </div>
              <div className="rounded-lg bg-primary/5 border p-4">
                <p className="text-xs text-muted-foreground mb-1">{t("ratesLabel")}</p>
                <p className="text-lg font-bold">
                  {(result.iaRate * 100).toFixed(0)}% + {(result.aaRate * 100).toFixed(0)}%
                </p>
              </div>
              <div className="rounded-lg bg-primary/5 border p-4">
                <p className="text-xs text-muted-foreground mb-1">{t("yearsLabel")}</p>
                <p className="text-lg font-bold">{result.yearsToFullClaim}</p>
              </div>
            </div>

            {result.qualifyingExpenditure < result.cost && (
              <p className="text-xs rounded-md p-3 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                {t("capWarning", {
                  cost: formatRM(result.cost),
                  qe: formatRM(result.qualifyingExpenditure),
                })}
              </p>
            )}

            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left">{t("colYear")}</th>
                    <th className="px-3 py-2 text-right">{t("colIA")}</th>
                    <th className="px-3 py-2 text-right">{t("colAA")}</th>
                    <th className="px-3 py-2 text-right">{t("colTotal")}</th>
                    <th className="px-3 py-2 text-right">{t("colResidual")}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.schedule.slice(0, 12).map((row) => (
                    <tr key={row.year} className="border-t">
                      <td className="px-3 py-2">{row.year}</td>
                      <td className="px-3 py-2 text-right">
                        {row.initialAllowance > 0 ? formatRM(row.initialAllowance) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">{formatRM(row.annualAllowance)}</td>
                      <td className="px-3 py-2 text-right font-medium">
                        {formatRM(row.totalAllowance)}
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground">
                        {formatRM(row.residualExpenditure)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {result.schedule.length > 12 && (
              <p className="text-xs text-muted-foreground">
                {t("moreYears", { count: result.schedule.length - 12 })}
              </p>
            )}

            <p className="text-xs text-muted-foreground p-3 bg-muted rounded-md">
              {t("disclaimer")}
            </p>
          </CardContent>
        </Card>
      )}

      <SourceNote topic="capalw" />
    </div>
  );
}
