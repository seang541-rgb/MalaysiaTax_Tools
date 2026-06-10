"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { calculateCp204 } from "@/engine/cp204";
import { SourceNote } from "./source-note";

function formatRM(amount: number): string {
  return `RM ${amount.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function Cp204Calculator() {
  const t = useTranslations("cp204");

  const [estimatedTax, setEstimatedTax] = useState(0);
  const [priorYearEstimate, setPriorYearEstimate] = useState(0);
  const [actualTax, setActualTax] = useState(0);

  const result = useMemo(() => {
    if (estimatedTax <= 0) return null;
    return calculateCp204({
      estimatedTax,
      priorYearEstimate: priorYearEstimate > 0 ? priorYearEstimate : undefined,
      actualTax: actualTax > 0 ? actualTax : undefined,
    });
  }, [estimatedTax, priorYearEstimate, actualTax]);

  function handleReset() {
    setEstimatedTax(0);
    setPriorYearEstimate(0);
    setActualTax(0);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("inputTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cp204-estimate">{t("estimatedTax")}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                RM
              </span>
              <Input
                id="cp204-estimate"
                type="number"
                min="0"
                step="1000"
                className="pl-12 text-lg h-12"
                value={estimatedTax || ""}
                onChange={(e) => setEstimatedTax(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cp204-prior">{t("priorYearEstimate")}</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  RM
                </span>
                <Input
                  id="cp204-prior"
                  type="number"
                  min="0"
                  step="1000"
                  className="pl-12"
                  value={priorYearEstimate || ""}
                  onChange={(e) =>
                    setPriorYearEstimate(parseFloat(e.target.value) || 0)
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground">{t("priorYearHint")}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cp204-actual">{t("actualTax")}</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  RM
                </span>
                <Input
                  id="cp204-actual"
                  type="number"
                  min="0"
                  step="1000"
                  className="pl-12"
                  value={actualTax || ""}
                  onChange={(e) => setActualTax(parseFloat(e.target.value) || 0)}
                />
              </div>
              <p className="text-xs text-muted-foreground">{t("actualTaxHint")}</p>
            </div>
          </div>

          <Button size="sm" variant="outline" onClick={handleReset}>
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
            {result.meetsMinimum !== null && (
              <div
                className={`rounded-md p-3 text-sm font-medium border ${
                  result.meetsMinimum
                    ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
                    : "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
                }`}
              >
                {result.meetsMinimum
                  ? t("meetsMinimum", { min: formatRM(result.minimumRequired!) })
                  : t("belowMinimum", { min: formatRM(result.minimumRequired!) })}
              </div>
            )}

            <div className="rounded-lg bg-primary/5 border-2 border-primary/20 p-6 text-center space-y-2">
              <p className="text-sm text-muted-foreground">{t("monthlyInstallment")}</p>
              <p className="text-4xl font-bold text-primary">
                {formatRM(result.monthlyAmount)}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("installmentNote", { count: result.installmentCount })}
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{t("installmentCount")}</span>
                <span>{result.installmentCount}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("finalInstallment")}</span>
                <span>{formatRM(result.finalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("revisionWindows")}</span>
                <span>{t("revisionMonthsValue")}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>{t("totalEstimate")}</span>
                <span>{formatRM(result.estimatedTax)}</span>
              </div>
            </div>

            {result.penalty && (
              <div className="space-y-2 text-sm border rounded-md p-4">
                <p className="font-semibold">{t("penaltyTitle")}</p>
                <div className="flex justify-between">
                  <span>{t("penaltyActual")}</span>
                  <span>{formatRM(result.penalty.actualTax)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("penaltyBuffer")}</span>
                  <span>{formatRM(result.penalty.buffer)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("penaltyExcess")}</span>
                  <span>{formatRM(result.penalty.excessOverBuffer)}</span>
                </div>
                <Separator />
                <div
                  className={`flex justify-between font-semibold ${
                    result.penalty.penaltyAmount > 0 ? "text-red-600" : "text-green-600"
                  }`}
                >
                  <span>{t("penaltyAmount")}</span>
                  <span>{formatRM(result.penalty.penaltyAmount)}</span>
                </div>
                {result.penalty.penaltyAmount === 0 && (
                  <p className="text-xs text-muted-foreground">{t("noPenalty")}</p>
                )}
              </div>
            )}

            <p className="text-xs text-muted-foreground p-3 bg-muted rounded-md">
              {t("disclaimer")}
            </p>
          </CardContent>
        </Card>
      )}

      <SourceNote topic="cp204" />
    </div>
  );
}
