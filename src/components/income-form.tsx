"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { IncomeInput, TaxCalculationInput, TaxCalculationResult, ReliefClaim } from "@/engine/types";
import { calculatePersonalTax } from "@/engine/personal";
import { ReliefSelector } from "./relief-selector";
import { TaxResult } from "./tax-result";
import { TaxExplanation } from "./tax-explanation";

const YEAR_OF_ASSESSMENT = 2025;

function emptyIncome(): IncomeInput {
  return { employment: 0, commission: 0, rental: 0, interest: 0, dividend: 0, other: 0 };
}

export function IncomeForm() {
  const t = useTranslations("calculator");
  const [income, setIncome] = useState<IncomeInput>(emptyIncome());
  const [maritalStatus, setMaritalStatus] = useState<"single" | "married">("single");
  const [spouseHasIncome, setSpouseHasIncome] = useState(false);
  const [reliefClaims, setReliefClaims] = useState<ReliefClaim[]>([
    { reliefId: "individual", amount: 9000 },
  ]);
  const [zakatAmount, setZakatAmount] = useState(0);
  const [monthlyPcb, setMonthlyPcb] = useState(0);
  const [result, setResult] = useState<TaxCalculationResult | null>(null);

  function handleIncomeChange(field: keyof IncomeInput, value: string) {
    const num = parseFloat(value) || 0;
    setIncome((prev) => ({ ...prev, [field]: num }));
  }

  function handleCalculate() {
    const input: TaxCalculationInput = {
      yearOfAssessment: YEAR_OF_ASSESSMENT,
      income,
      reliefs: reliefClaims,
      maritalStatus,
      spouseHasIncome,
      zakatAmount,
      monthlyPcbPaid: monthlyPcb,
    };
    setResult(calculatePersonalTax(input));
  }

  function handleReset() {
    setIncome(emptyIncome());
    setMaritalStatus("single");
    setSpouseHasIncome(false);
    setReliefClaims([{ reliefId: "individual", amount: 9000 }]);
    setZakatAmount(0);
    setMonthlyPcb(0);
    setResult(null);
  }

  const incomeFields: (keyof IncomeInput)[] = [
    "employment", "commission", "rental", "interest", "dividend", "other",
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("incomeSection")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {incomeFields.map((field) => (
            <div key={field} className="space-y-2">
              <Label htmlFor={field}>{t(field)}</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  RM
                </span>
                <Input
                  id={field}
                  type="number"
                  min="0"
                  step="0.01"
                  className="pl-12"
                  value={income[field] || ""}
                  onChange={(e) => handleIncomeChange(field, e.target.value)}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("maritalStatus")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              variant={maritalStatus === "single" ? "default" : "outline"}
              onClick={() => setMaritalStatus("single")}
            >
              {t("single")}
            </Button>
            <Button
              variant={maritalStatus === "married" ? "default" : "outline"}
              onClick={() => setMaritalStatus("married")}
            >
              {t("married")}
            </Button>
          </div>
          {maritalStatus === "married" && (
            <div className="flex items-center gap-4">
              <Label>{t("spouseHasIncome")}</Label>
              <Button
                size="sm"
                variant={spouseHasIncome ? "default" : "outline"}
                onClick={() => setSpouseHasIncome(true)}
              >
                {t("yes")}
              </Button>
              <Button
                size="sm"
                variant={!spouseHasIncome ? "default" : "outline"}
                onClick={() => setSpouseHasIncome(false)}
              >
                {t("no")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ReliefSelector
        yearOfAssessment={YEAR_OF_ASSESSMENT}
        claims={reliefClaims}
        onClaimsChange={setReliefClaims}
      />

      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2 pt-6">
          <div className="space-y-2">
            <Label htmlFor="zakat">{t("zakat")}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                RM
              </span>
              <Input
                id="zakat"
                type="number"
                min="0"
                step="0.01"
                className="pl-12"
                value={zakatAmount || ""}
                onChange={(e) => setZakatAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pcb">{t("monthlyPcb")}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                RM
              </span>
              <Input
                id="pcb"
                type="number"
                min="0"
                step="0.01"
                className="pl-12"
                value={monthlyPcb || ""}
                onChange={(e) => setMonthlyPcb(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button size="lg" onClick={handleCalculate}>
          {t("calculate")}
        </Button>
        <Button size="lg" variant="outline" onClick={handleReset}>
          {t("reset")}
        </Button>
      </div>

      {result && (
        <>
          <Separator />
          <TaxResult result={result} />
        </>
      )}

      <Separator />
      <TaxExplanation />
    </div>
  );
}
