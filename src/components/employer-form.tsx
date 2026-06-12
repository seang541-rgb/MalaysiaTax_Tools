"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CreditChargeButton } from "@/components/credit-charge-button";
import { calculateBatchContributions } from "@/engine/employer-contributions";
import { BatchContributionInput, BatchContributionSummary } from "@/engine/types";

function formatRM(amount: number): string {
  return `RM ${amount.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function emptyEmployee(index: number): BatchContributionInput {
  return {
    name: `Employee ${index + 1}`,
    monthlyGrossSalary: 0,
    employeeAge: "below60",
    isMalaysianOrPR: true,
  };
}

export function EmployerForm() {
  const t = useTranslations("employer");
  const [employees, setEmployees] = useState<BatchContributionInput[]>([
    emptyEmployee(0),
  ]);
  const [result, setResult] = useState<BatchContributionSummary | null>(null);

  function addEmployee() {
    setEmployees((prev) => [...prev, emptyEmployee(prev.length)]);
  }

  function removeEmployee(index: number) {
    setEmployees((prev) => prev.filter((_, i) => i !== index));
    setResult(null);
  }

  function updateEmployee(
    index: number,
    field: keyof BatchContributionInput,
    value: string | number | boolean
  ) {
    setEmployees((prev) =>
      prev.map((emp, i) => (i === index ? { ...emp, [field]: value } : emp))
    );
    setResult(null);
  }

  function handleCalculate() {
    const valid = employees.filter((e) => e.monthlyGrossSalary > 0);
    if (valid.length === 0) return;
    setResult(calculateBatchContributions(valid));
  }

  function handleReset() {
    setEmployees([emptyEmployee(0)]);
    setResult(null);
  }

  return (
    <div className="space-y-6">
      {/* Info cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">EPF (KWSP)</p>
          <p>{t("epfNote")}</p>
        </div>
        <div className="rounded-md border p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">SOCSO (PERKESO)</p>
          <p>{t("socsoNote")}</p>
        </div>
        <div className="rounded-md border p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">EIS (SIP)</p>
          <p>{t("eisNote")}</p>
        </div>
      </div>

      {employees.map((emp, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">
              {t("employee")} #{index + 1}
            </CardTitle>
            {employees.length > 1 && (
              <Button
                size="sm"
                variant="ghost"
                className="text-red-500 hover:text-red-700"
                onClick={() => removeEmployee(index)}
              >
                {t("removeEmployee")}
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <Label className="text-xs">{t("employeeName")}</Label>
                <Input
                  value={emp.name}
                  onChange={(e) => updateEmployee(index, "name", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("monthlySalary")}</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    RM
                  </span>
                  <Input
                    type="number"
                    min="0"
                    className="pl-10"
                    value={emp.monthlyGrossSalary || ""}
                    onChange={(e) =>
                      updateEmployee(
                        index,
                        "monthlyGrossSalary",
                        parseFloat(e.target.value) || 0
                      )
                    }
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("ageGroup")}</Label>
                <div className="flex gap-1">
                  {(["below60", "60to65", "above65"] as const).map((age) => (
                    <Button
                      key={age}
                      size="sm"
                      variant={emp.employeeAge === age ? "default" : "outline"}
                      onClick={() => updateEmployee(index, "employeeAge", age)}
                      className="flex-1 text-xs px-1"
                    >
                      {t(age)}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("citizenship")}</Label>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={emp.isMalaysianOrPR ? "default" : "outline"}
                    onClick={() =>
                      updateEmployee(index, "isMalaysianOrPR", true)
                    }
                    className="flex-1 text-xs"
                  >
                    {t("malaysianPR")}
                  </Button>
                  <Button
                    size="sm"
                    variant={!emp.isMalaysianOrPR ? "default" : "outline"}
                    onClick={() =>
                      updateEmployee(index, "isMalaysianOrPR", false)
                    }
                    className="flex-1 text-xs"
                  >
                    {t("foreigner")}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex gap-4">
        <Button variant="outline" onClick={addEmployee}>
          + {t("addEmployee")}
        </Button>
        <CreditChargeButton
          feature="employer_obligations_calculation"
          disabled={!employees.some((e) => e.monthlyGrossSalary > 0)}
          requestSummary={{
            employeeCount: employees.filter((e) => e.monthlyGrossSalary > 0)
              .length,
          }}
          onCharged={handleCalculate}
        >
          {t("calculate")}
        </CreditChargeButton>
        <Button size="lg" variant="outline" onClick={handleReset}>
          {t("reset")}
        </Button>
      </div>

      {result && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle>{t("results")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-primary/5 border-2 border-primary/20 p-6 text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  {t("totalMonthlyCost")}
                </p>
                <p className="text-4xl font-bold text-primary">
                  {formatRM(result.totalMonthlyEmployerCost)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("grandTotal")}: {formatRM(result.totalMonthlyTotalCost)}
                </p>
              </div>

              {/* Summary bar */}
              <div className="grid gap-3 sm:grid-cols-3 text-center">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">{t("epfEmployer")}</p>
                  <p className="text-lg font-semibold">
                    {formatRM(result.totalMonthlyEpfEmployer)}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">{t("socsoEmployer")}</p>
                  <p className="text-lg font-semibold">
                    {formatRM(result.totalMonthlySocsoEmployer)}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">{t("eisEmployer")}</p>
                  <p className="text-lg font-semibold">
                    {formatRM(result.totalMonthlyEisEmployer)}
                  </p>
                </div>
              </div>

              {/* Detail table */}
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left">{t("employeeName")}</th>
                      <th className="px-3 py-2 text-right">{t("salary")}</th>
                      <th className="px-3 py-2 text-right">{t("epfEmployer")}</th>
                      <th className="px-3 py-2 text-right">{t("socsoEmployer")}</th>
                      <th className="px-3 py-2 text-right">{t("eisEmployer")}</th>
                      <th className="px-3 py-2 text-right">{t("totalEmployer")}</th>
                      <th className="px-3 py-2 text-right">{t("totalCost")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.employees.map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">{r.employee.name}</td>
                        <td className="px-3 py-2 text-right">
                          {formatRM(r.employee.monthlyGrossSalary)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatRM(r.contributions.epfEmployer)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatRM(r.contributions.socsoEmployer)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatRM(r.contributions.eisEmployer)}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {formatRM(r.contributions.totalEmployer)}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {formatRM(r.contributions.totalCost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted font-semibold">
                    <tr className="border-t">
                      <td className="px-3 py-2">Total</td>
                      <td className="px-3 py-2 text-right">
                        {formatRM(result.totalMonthlySalary)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatRM(result.totalMonthlyEpfEmployer)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatRM(result.totalMonthlySocsoEmployer)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatRM(result.totalMonthlyEisEmployer)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatRM(result.totalMonthlyEmployerCost)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatRM(result.totalMonthlyTotalCost)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <p className="text-xs text-muted-foreground p-3 bg-muted rounded-md">
                {t("disclaimer")}
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
