"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { calculateWithholdingTax, WhtPaymentType } from "@/engine/withholding-tax";
import { SourceNote } from "./source-note";

function formatRM(amount: number): string {
  return `RM ${amount.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const PAYMENT_TYPES: WhtPaymentType[] = [
  "interest",
  "royalty",
  "special_4a",
  "contract",
  "public_entertainer",
  "other_4f",
];

export function WithholdingTaxCalculator() {
  const t = useTranslations("wht");

  const [paymentType, setPaymentType] = useState<WhtPaymentType>("special_4a");
  const [grossAmount, setGrossAmount] = useState(0);
  const [useDta, setUseDta] = useState(false);
  const [dtaRate, setDtaRate] = useState(0);

  const isContract = paymentType === "contract";

  const result = useMemo(() => {
    if (grossAmount <= 0) return null;
    return calculateWithholdingTax({
      paymentType,
      grossAmount,
      dtaRate: useDta && !isContract ? dtaRate : undefined,
    });
  }, [paymentType, grossAmount, useDta, dtaRate, isContract]);

  function handleReset() {
    setPaymentType("special_4a");
    setGrossAmount(0);
    setUseDta(false);
    setDtaRate(0);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("inputTitle")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("inputSubtitle")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">{t("paymentType")}</Label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_TYPES.map((pt) => (
                <Button
                  key={pt}
                  type="button"
                  size="sm"
                  variant={paymentType === pt ? "default" : "outline"}
                  className="justify-start h-auto py-2 text-left whitespace-normal"
                  onClick={() => setPaymentType(pt)}
                >
                  {t(`type_${pt}`)}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{t(`desc_${paymentType}`)}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wht-gross" className="text-sm">{t("grossAmount")}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">RM</span>
              <Input
                id="wht-gross"
                type="number"
                min="0"
                step="1000"
                className="pl-12 text-lg h-12"
                value={grossAmount || ""}
                onChange={(e) => setGrossAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {!isContract && (
            <div className="space-y-2">
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <input type="checkbox" className="mt-0.5" checked={useDta} onChange={(e) => setUseDta(e.target.checked)} />
                <span>{t("useDta")}</span>
              </label>
              {useDta && (
                <div className="relative max-w-40">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    className="pr-8"
                    placeholder={t("dtaRate")}
                    value={dtaRate || ""}
                    onChange={(e) => setDtaRate(parseFloat(e.target.value) || 0)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                </div>
              )}
            </div>
          )}

          <Button size="sm" variant="outline" onClick={handleReset}>{t("reset")}</Button>
        </CardContent>
      </Card>

      {result && (
        <Card role="region" aria-live="polite">
          <CardHeader>
            <CardTitle>{t("resultsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("grossAmount")}</span>
                <span>{formatRM(result.grossAmount)}</span>
              </div>
              {result.components.map((c, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-muted-foreground">
                    {result.components.length > 1 ? t(`comp_${c.label}`) : t("whtRate")} ({c.rate}%)
                  </span>
                  <span>- {formatRM(c.amount)}</span>
                </div>
              ))}
              {result.dtaApplied && (
                <p className="text-xs text-green-600 dark:text-green-400">{t("dtaApplied")}</p>
              )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>{t("netPayment")}</span>
                <span>{formatRM(result.netPayment)}</span>
              </div>
            </div>

            <div className="rounded-lg bg-primary/5 border-2 border-primary/20 p-6 text-center space-y-2">
              <p className="text-sm text-muted-foreground">{t("totalWht")} ({result.totalRate}%)</p>
              <p className="text-4xl font-bold text-primary">{formatRM(result.totalWht)}</p>
              <p className="text-sm text-muted-foreground">{t("formNote", { form: result.form })}</p>
            </div>

            <div className="text-xs text-muted-foreground p-3 bg-muted rounded-md space-y-1">
              <p>{t("remittanceNote")}</p>
              <p>{t("disclaimer")}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <SourceNote topic="wht" />
    </div>
  );
}
