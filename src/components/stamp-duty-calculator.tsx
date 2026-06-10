"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { calculateStampDuty, StampBuyerType } from "@/engine/stamp-duty";

function formatRM(amount: number): string {
  return `RM ${amount.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function StampDutyCalculator() {
  const t = useTranslations("stampduty");

  const [propertyPrice, setPropertyPrice] = useState(0);
  const [buyerType, setBuyerType] = useState<StampBuyerType>("citizen_pr");
  const [loanAmount, setLoanAmount] = useState(0);
  const [firstTimeBuyer, setFirstTimeBuyer] = useState(false);

  const isLocal = buyerType === "citizen_pr";
  const eligibleByPrice = propertyPrice > 0 && propertyPrice <= 500000;

  const result = useMemo(() => {
    if (propertyPrice <= 0) return null;
    return calculateStampDuty({
      propertyPrice,
      buyerType,
      loanAmount,
      firstTimeBuyer,
    });
  }, [propertyPrice, buyerType, loanAmount, firstTimeBuyer]);

  function handleReset() {
    setPropertyPrice(0);
    setBuyerType("citizen_pr");
    setLoanAmount(0);
    setFirstTimeBuyer(false);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("inputTitle")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("inputSubtitle")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <MoneyField id="sd-price" label={t("propertyPrice")} value={propertyPrice} onChange={setPropertyPrice} hint={t("priceHint")} />

          <div className="space-y-2">
            <Label className="text-sm">{t("buyerType")}</Label>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant={buyerType === "citizen_pr" ? "default" : "outline"} onClick={() => setBuyerType("citizen_pr")}>
                {t("buyer_citizen_pr")}
              </Button>
              <Button type="button" size="sm" variant={buyerType === "foreigner" ? "default" : "outline"} onClick={() => setBuyerType("foreigner")}>
                {t("buyer_foreigner")}
              </Button>
            </div>
            {buyerType === "foreigner" && (
              <p className="text-xs text-amber-600 dark:text-amber-400">{t("foreignerNote")}</p>
            )}
          </div>

          <MoneyField id="sd-loan" label={t("loanAmount")} value={loanAmount} onChange={setLoanAmount} hint={t("loanHint")} />

          {isLocal && (
            <label className={`flex items-start gap-2 text-sm ${eligibleByPrice ? "cursor-pointer" : "opacity-60"}`}>
              <input
                type="checkbox"
                className="mt-0.5"
                checked={firstTimeBuyer}
                disabled={!eligibleByPrice}
                onChange={(e) => setFirstTimeBuyer(e.target.checked)}
              />
              <span>{t("firstTimeBuyer")}</span>
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
            <div className="space-y-1">
              <p className="text-sm font-medium mb-2">{t("motBreakdown")}</p>
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left">{t("band")}</th>
                      <th className="px-3 py-2 text-right">{t("rate")}</th>
                      <th className="px-3 py-2 text-right">{t("duty")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.motTiers.filter((tr) => tr.duty > 0 || result.foreignerFlatRate).map((tr, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">
                          {tr.to === Infinity
                            ? `RM ${tr.from.toLocaleString()}+`
                            : `RM ${tr.from.toLocaleString()} – ${tr.to.toLocaleString()}`}
                        </td>
                        <td className="px-3 py-2 text-right">{tr.rate}%</td>
                        <td className="px-3 py-2 text-right">{formatRM(tr.duty)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <Row label={t("motDuty")} value={formatRM(result.motDutyBeforeExemption)} />
              {result.loanAmount > 0 && (
                <Row label={t("loanDuty")} value={formatRM(result.loanDutyBeforeExemption)} />
              )}
              {result.firstTimeExemptionApplied && (
                <Row label={t("firstTimeExemption")} value={`- ${formatRM(result.motDutyBeforeExemption + result.loanDutyBeforeExemption)}`} highlight="green" />
              )}
              <Separator />
            </div>

            <div className="rounded-lg bg-primary/5 border-2 border-primary/20 p-6 text-center space-y-2">
              <p className="text-sm text-muted-foreground">{t("totalDuty")}</p>
              <p className="text-4xl font-bold text-primary">{formatRM(result.totalDuty)}</p>
              {result.firstTimeExemptionApplied && (
                <p className="text-sm text-green-600 dark:text-green-400">{t("fullyExempt")}</p>
              )}
            </div>

            <p className="text-xs text-muted-foreground p-3 bg-muted rounded-md">{t("disclaimer")}</p>
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
          step="10000"
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
  label, value, highlight,
}: {
  label: string; value: string; highlight?: "green" | "red";
}) {
  const cls = highlight === "green" ? "text-green-600 dark:text-green-400" : highlight === "red" ? "text-red-600" : "";
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cls}>{value}</span>
    </div>
  );
}
