"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { calculateSoleProprietorTax } from "@/engine/sole-proprietor";

function formatRM(amount: number): string {
  return `RM ${amount.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function SoleProprietorCalculator() {
  const t = useTranslations("soleprop");

  const [revenue, setRevenue] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [capitalAllowance, setCapitalAllowance] = useState(0);
  const [otherIncome, setOtherIncome] = useState(0);
  const [totalReliefs, setTotalReliefs] = useState(9000);
  const [maritalStatus, setMaritalStatus] = useState<"single" | "married">("single");
  const [spouseHasIncome, setSpouseHasIncome] = useState(false);
  const [zakatAmount, setZakatAmount] = useState(0);

  const result = useMemo(() => {
    if (revenue <= 0 && otherIncome <= 0) return null;
    return calculateSoleProprietorTax({
      yearOfAssessment: 2025,
      businessRevenue: revenue,
      businessExpenses: expenses,
      capitalAllowance,
      otherIncome,
      totalReliefs,
      maritalStatus,
      spouseHasIncome,
      zakatAmount,
    });
  }, [revenue, expenses, capitalAllowance, otherIncome, totalReliefs, maritalStatus, spouseHasIncome, zakatAmount]);

  function handleReset() {
    setRevenue(0); setExpenses(0); setCapitalAllowance(0); setOtherIncome(0);
    setTotalReliefs(9000); setMaritalStatus("single"); setSpouseHasIncome(false); setZakatAmount(0);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("inputTitle")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("inputSubtitle")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <p className="text-sm font-semibold">{t("businessSection")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <MoneyField id="sp-rev" label={t("revenue")} value={revenue} onChange={setRevenue} />
              <MoneyField id="sp-exp" label={t("expenses")} value={expenses} onChange={setExpenses} hint={t("expensesHint")} />
              <MoneyField id="sp-ca" label={t("capitalAllowance")} value={capitalAllowance} onChange={setCapitalAllowance} hint={t("caHint")} />
              <MoneyField id="sp-other" label={t("otherIncome")} value={otherIncome} onChange={setOtherIncome} hint={t("otherIncomeHint")} />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold">{t("personalSection")}</p>
            <MoneyField id="sp-reliefs" label={t("totalReliefs")} value={totalReliefs} onChange={setTotalReliefs} hint={t("reliefsHint")} />
            <MoneyField id="sp-zakat" label={t("zakat")} value={zakatAmount} onChange={setZakatAmount} />
            <div className="space-y-2">
              <Label className="text-sm">{t("maritalStatus")}</Label>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant={maritalStatus === "single" ? "default" : "outline"} onClick={() => setMaritalStatus("single")}>
                  {t("single")}
                </Button>
                <Button type="button" size="sm" variant={maritalStatus === "married" ? "default" : "outline"} onClick={() => setMaritalStatus("married")}>
                  {t("married")}
                </Button>
              </div>
            </div>
            {maritalStatus === "married" && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={spouseHasIncome} onChange={(e) => setSpouseHasIncome(e.target.checked)} />
                <span>{t("spouseHasIncome")}</span>
              </label>
            )}
          </div>

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
              <Row label={t("revenue")} value={formatRM(revenue)} />
              <Row label={t("expenses")} value={`- ${formatRM(expenses)}`} />
              <Row label={t("capitalAllowance")} value={`- ${formatRM(capitalAllowance)}`} />
              <Separator />
              <Row label={t("adjustedBusinessIncome")} value={formatRM(result.adjustedBusinessIncome)} bold />
              {result.businessLoss > 0 && (
                <Row label={t("businessLoss")} value={formatRM(result.businessLoss)} highlight="red" />
              )}
              {result.otherIncome > 0 && <Row label={t("otherIncome")} value={`+ ${formatRM(result.otherIncome)}`} />}
              <Row label={t("totalReliefs")} value={`- ${formatRM(result.totalReliefs)}`} />
              <Separator />
              <Row label={t("chargeableIncome")} value={formatRM(result.chargeableIncome)} bold />
              <Row label={t("taxBeforeRebate")} value={formatRM(result.taxBeforeRebate)} />
              {result.rebateAmount > 0 && <Row label={t("rebate")} value={`- ${formatRM(result.rebateAmount)}`} />}
              {result.zakatDeduction > 0 && <Row label={t("zakat")} value={`- ${formatRM(result.zakatDeduction)}`} />}
            </div>

            <div className="rounded-lg bg-primary/5 border-2 border-primary/20 p-6 text-center space-y-2">
              <p className="text-sm text-muted-foreground">{t("taxPayable")}</p>
              <p className="text-4xl font-bold text-primary">{formatRM(result.taxPayable)}</p>
              <p className="text-sm text-muted-foreground">{t("effectiveRate", { rate: result.effectiveRate })}</p>
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
  const cls = highlight === "red" ? "text-red-600 dark:text-red-400" : highlight === "green" ? "text-green-600" : "";
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span className={cls}>{value}</span>
    </div>
  );
}
