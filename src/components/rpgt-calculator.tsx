"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { calculateRpgt, RpgtDisposerType } from "@/engine/rpgt";

function formatRM(amount: number): string {
  return `RM ${amount.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const DISPOSER_TYPES: RpgtDisposerType[] = ["citizen_pr", "company", "foreigner"];

export function RpgtCalculator() {
  const t = useTranslations("rpgt");

  const [disposalPrice, setDisposalPrice] = useState(0);
  const [acquisitionPrice, setAcquisitionPrice] = useState(0);
  const [allowableExpenses, setAllowableExpenses] = useState(0);
  const [disposerType, setDisposerType] = useState<RpgtDisposerType>("citizen_pr");
  const [holdingYears, setHoldingYears] = useState(0);
  const [onceInLifetime, setOnceInLifetime] = useState(false);

  const isIndividual = disposerType !== "company";

  const result = useMemo(() => {
    if (disposalPrice <= 0 || holdingYears <= 0) return null;
    return calculateRpgt({
      disposalPrice,
      acquisitionPrice,
      allowableExpenses,
      disposerType,
      holdingYears,
      onceInLifetimeExemption: onceInLifetime,
    });
  }, [disposalPrice, acquisitionPrice, allowableExpenses, disposerType, holdingYears, onceInLifetime]);

  function handleReset() {
    setDisposalPrice(0);
    setAcquisitionPrice(0);
    setAllowableExpenses(0);
    setDisposerType("citizen_pr");
    setHoldingYears(0);
    setOnceInLifetime(false);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("inputTitle")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("inputSubtitle")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <MoneyField id="rpgt-disposal" label={t("disposalPrice")} value={disposalPrice} onChange={setDisposalPrice} hint={t("disposalHint")} />
            <MoneyField id="rpgt-acq" label={t("acquisitionPrice")} value={acquisitionPrice} onChange={setAcquisitionPrice} hint={t("acquisitionHint")} />
          </div>
          <MoneyField id="rpgt-exp" label={t("allowableExpenses")} value={allowableExpenses} onChange={setAllowableExpenses} hint={t("expensesHint")} />

          <div className="space-y-2">
            <Label className="text-sm">{t("disposerType")}</Label>
            <div className="flex flex-wrap gap-2">
              {DISPOSER_TYPES.map((dt) => (
                <Button
                  key={dt}
                  type="button"
                  size="sm"
                  variant={disposerType === dt ? "default" : "outline"}
                  onClick={() => setDisposerType(dt)}
                >
                  {t(`disposer_${dt}`)}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rpgt-years" className="text-sm">{t("holdingYears")}</Label>
            <Input
              id="rpgt-years"
              type="number"
              min="0"
              step="0.5"
              className="h-11"
              value={holdingYears || ""}
              onChange={(e) => setHoldingYears(parseFloat(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">{t("holdingHint")}</p>
          </div>

          {isIndividual && (
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={onceInLifetime}
                onChange={(e) => setOnceInLifetime(e.target.checked)}
              />
              <span>{t("onceInLifetime")}</span>
            </label>
          )}

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
            <div className="space-y-2 text-sm">
              <Row label={t("disposalPrice")} value={formatRM(result.disposalPrice)} />
              <Row label={t("acquisitionPrice")} value={`- ${formatRM(result.acquisitionPrice)}`} />
              <Row label={t("allowableExpenses")} value={`- ${formatRM(result.allowableExpenses)}`} />
              <Separator />
              <Row label={t("chargeableGain")} value={formatRM(result.chargeableGain)} bold />
              {result.onceInLifetimeApplied ? (
                <Row label={t("onceInLifetimeExempt")} value={`- ${formatRM(result.chargeableGain)}`} highlight="green" />
              ) : (
                result.scheduleExemption > 0 && (
                  <Row label={t("exemption")} value={`- ${formatRM(result.scheduleExemption)}`} />
                )
              )}
              <Separator />
              <Row label={t("netGain")} value={formatRM(result.netChargeableGain)} bold />
            </div>

            <div className="rounded-lg bg-primary/5 border-2 border-primary/20 p-6 text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                {t("rpgtPayable")} ({t(`bracket_${result.holdingBracket}`)} · {result.rate}%)
              </p>
              <p className="text-4xl font-bold text-primary">{formatRM(result.rpgtPayable)}</p>
              {result.rpgtPayable === 0 && (
                <p className="text-sm text-green-600 dark:text-green-400">{t("noTax")}</p>
              )}
            </div>

            <div className="text-xs text-muted-foreground p-3 bg-muted rounded-md space-y-1">
              <p>{t("filingNote")}</p>
              <p>{t("disclaimer")}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MoneyField({
  id, label, value, onChange, hint,
}: {
  id: string; label: string; value: number; onChange: (v: number) => void; hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm">{label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">RM</span>
        <Input
          id={id}
          type="number"
          min="0"
          step="1000"
          className="pl-12"
          value={value || ""}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        />
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Row({
  label, value, bold, highlight,
}: {
  label: string; value: string; bold?: boolean; highlight?: "green" | "red";
}) {
  const cls = highlight === "green" ? "text-green-600 dark:text-green-400" : highlight === "red" ? "text-red-600" : "";
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span className={cls}>{value}</span>
    </div>
  );
}
