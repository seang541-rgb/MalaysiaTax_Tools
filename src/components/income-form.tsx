"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  IncomeInput,
  TaxCalculationInput,
  ReliefClaim,
} from "@/engine/types";
import { calculatePersonalTax } from "@/engine/personal";
import { ReliefSelector } from "./relief-selector";
import { TaxResult } from "./tax-result";
import { TaxExplanation } from "./tax-explanation";

const YEAR_OF_ASSESSMENT = 2025;

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

export function IncomeForm() {
  const t = useTranslations("calculator");
  const [mode, setMode] = useState<"simple" | "advanced">("simple");

  // Simple mode state
  const [monthlySalary, setMonthlySalary] = useState(0);
  const [simpleMarital, setSimpleMarital] = useState<"single" | "married">(
    "single"
  );
  const [simpleSpouseIncome, setSimpleSpouseIncome] = useState(false);
  const [numberOfChildren, setNumberOfChildren] = useState(0);

  // Advanced mode state
  const [income, setIncome] = useState<IncomeInput>(emptyIncome());
  const [maritalStatus, setMaritalStatus] = useState<"single" | "married">(
    "single"
  );
  const [spouseHasIncome, setSpouseHasIncome] = useState(false);
  const [reliefClaims, setReliefClaims] = useState<ReliefClaim[]>([
    { reliefId: "individual", amount: 9000 },
  ]);
  const [zakatAmount, setZakatAmount] = useState(0);
  const [monthlyPcb, setMonthlyPcb] = useState(0);

  const simpleResult = useMemo(() => {
    if (monthlySalary <= 0) return null;
    const annualIncome = monthlySalary * 12;
    const reliefs: ReliefClaim[] = [
      { reliefId: "individual", amount: 9000 },
      { reliefId: "epf_employee", amount: Math.min(annualIncome * 0.11, 4000) },
      { reliefId: "socso_eis", amount: 350 },
    ];
    if (simpleMarital === "married" && !simpleSpouseIncome) {
      reliefs.push({ reliefId: "spouse", amount: 4000 });
    }
    for (let i = 0; i < numberOfChildren; i++) {
      reliefs.push({ reliefId: "child_under_18", amount: 2000 });
    }
    const input: TaxCalculationInput = {
      yearOfAssessment: YEAR_OF_ASSESSMENT,
      income: { employment: annualIncome, commission: 0, rental: 0, interest: 0, dividend: 0, other: 0 },
      reliefs,
      maritalStatus: simpleMarital,
      spouseHasIncome: simpleSpouseIncome,
      zakatAmount: 0,
      monthlyPcbPaid: 0,
    };
    return calculatePersonalTax(input);
  }, [monthlySalary, simpleMarital, simpleSpouseIncome, numberOfChildren]);

  const advancedResult = useMemo(() => {
    const hasIncome = Object.values(income).some((v) => v > 0);
    if (!hasIncome) return null;
    const input: TaxCalculationInput = {
      yearOfAssessment: YEAR_OF_ASSESSMENT,
      income,
      reliefs: reliefClaims,
      maritalStatus,
      spouseHasIncome,
      zakatAmount,
      monthlyPcbPaid: monthlyPcb,
    };
    return calculatePersonalTax(input);
  }, [income, reliefClaims, maritalStatus, spouseHasIncome, zakatAmount, monthlyPcb]);

  function handleIncomeChange(field: keyof IncomeInput, value: string) {
    const num = parseFloat(value) || 0;
    setIncome((prev) => ({ ...prev, [field]: num }));
  }

  function handleReset() {
    if (mode === "simple") {
      setMonthlySalary(0);
      setSimpleMarital("single");
      setSimpleSpouseIncome(false);
      setNumberOfChildren(0);
    } else {
      setIncome(emptyIncome());
      setMaritalStatus("single");
      setSpouseHasIncome(false);
      setReliefClaims([{ reliefId: "individual", amount: 9000 }]);
      setZakatAmount(0);
      setMonthlyPcb(0);
    }
  }

  const incomeFields: (keyof IncomeInput)[] = [
    "employment",
    "commission",
    "rental",
    "interest",
    "dividend",
    "other",
  ];

  const currentResult = mode === "simple" ? simpleResult : advancedResult;

  return (
    <div className="space-y-6">
      <Tabs
        value={mode}
        onValueChange={(v) => setMode(v as "simple" | "advanced")}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="simple">{t("simpleMode")}</TabsTrigger>
          <TabsTrigger value="advanced">{t("advancedMode")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {mode === "simple" ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("simpleTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="monthly-salary">{t("monthlySalary")}</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  RM
                </span>
                <Input
                  id="monthly-salary"
                  type="number"
                  min="0"
                  step="0.01"
                  className="pl-12 text-lg h-12"
                  value={monthlySalary || ""}
                  onChange={(e) =>
                    setMonthlySalary(parseFloat(e.target.value) || 0)
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("maritalStatus")}</Label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={simpleMarital === "single" ? "default" : "outline"}
                    onClick={() => setSimpleMarital("single")}
                  >
                    {t("single")}
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      simpleMarital === "married" ? "default" : "outline"
                    }
                    onClick={() => setSimpleMarital("married")}
                  >
                    {t("married")}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="children">{t("numberOfChildren")}</Label>
                <Input
                  id="children"
                  type="number"
                  min="0"
                  max="20"
                  step="1"
                  className="w-24"
                  value={numberOfChildren || ""}
                  onChange={(e) =>
                    setNumberOfChildren(parseInt(e.target.value) || 0)
                  }
                />
              </div>
            </div>

            {simpleMarital === "married" && (
              <div className="flex items-center gap-4">
                <Label>{t("spouseHasIncome")}</Label>
                <Button
                  size="sm"
                  variant={simpleSpouseIncome ? "default" : "outline"}
                  onClick={() => setSimpleSpouseIncome(true)}
                >
                  {t("yes")}
                </Button>
                <Button
                  size="sm"
                  variant={!simpleSpouseIncome ? "default" : "outline"}
                  onClick={() => setSimpleSpouseIncome(false)}
                >
                  {t("no")}
                </Button>
              </div>
            )}

            {monthlySalary > 0 && (
              <p className="text-sm text-muted-foreground">
                {t("annualEquivalent")}: RM{" "}
                {(monthlySalary * 12).toLocaleString("en-MY", {
                  minimumFractionDigits: 2,
                })}
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
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
                    onChange={(e) =>
                      setZakatAmount(parseFloat(e.target.value) || 0)
                    }
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
                    onChange={(e) =>
                      setMonthlyPcb(parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <div className="flex gap-4">
        <Button size="lg" variant="outline" onClick={handleReset}>
          {t("reset")}
        </Button>
      </div>

      {currentResult && (
        <>
          <Separator />
          <TaxResult result={currentResult} />
        </>
      )}

      <Separator />
      <TaxExplanation />
    </div>
  );
}
