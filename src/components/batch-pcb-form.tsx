"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CreditChargeButton } from "@/components/credit-charge-button";
import { SourceNote } from "@/components/source-note";
import { calculateBatchPcb } from "@/engine/batch-pcb";
import { BatchEmployeeInput, BatchPcbSummary } from "@/engine/types";

const YEAR_OF_ASSESSMENT = 2025;

function formatRM(amount: number): string {
  return `RM ${amount.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function emptyEmployee(index: number): BatchEmployeeInput {
  return {
    name: `Employee ${index + 1}`,
    monthlyGrossSalary: 0,
    maritalStatus: "single",
    spouseHasIncome: false,
    numberOfChildren: 0,
  };
}

export function BatchPcbForm() {
  const t = useTranslations("batchPcb");
  const [employees, setEmployees] = useState<BatchEmployeeInput[]>([
    emptyEmployee(0),
  ]);
  const [result, setResult] = useState<BatchPcbSummary | null>(null);

  function addEmployee() {
    setEmployees((prev) => [...prev, emptyEmployee(prev.length)]);
  }

  function removeEmployee(index: number) {
    setEmployees((prev) => prev.filter((_, i) => i !== index));
    setResult(null);
  }

  function updateEmployee(
    index: number,
    field: keyof BatchEmployeeInput,
    value: string | number | boolean
  ) {
    setEmployees((prev) =>
      prev.map((emp, i) => (i === index ? { ...emp, [field]: value } : emp))
    );
    setResult(null);
  }

  function handleCalculate() {
    const validEmployees = employees.filter(
      (e) => e.monthlyGrossSalary > 0
    );
    if (validEmployees.length === 0) return;
    setResult(calculateBatchPcb(YEAR_OF_ASSESSMENT, validEmployees));
  }

  function handleReset() {
    setEmployees([emptyEmployee(0)]);
    setResult(null);
  }

  return (
    <div className="space-y-6">
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
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">{t("employeeName")}</Label>
                <Input
                  value={emp.name}
                  onChange={(e) =>
                    updateEmployee(index, "name", e.target.value)
                  }
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
                <Label className="text-xs">{t("maritalStatus")}</Label>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={
                      emp.maritalStatus === "single" ? "default" : "outline"
                    }
                    onClick={() =>
                      updateEmployee(index, "maritalStatus", "single")
                    }
                    className="flex-1"
                  >
                    {t("single")}
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      emp.maritalStatus === "married" ? "default" : "outline"
                    }
                    onClick={() =>
                      updateEmployee(index, "maritalStatus", "married")
                    }
                    className="flex-1"
                  >
                    {t("married")}
                  </Button>
                </div>
              </div>
            </div>

            {emp.maritalStatus === "married" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">{t("spouseIncome")}</Label>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={emp.spouseHasIncome ? "default" : "outline"}
                      onClick={() =>
                        updateEmployee(index, "spouseHasIncome", true)
                      }
                      className="flex-1"
                    >
                      Yes
                    </Button>
                    <Button
                      size="sm"
                      variant={!emp.spouseHasIncome ? "default" : "outline"}
                      onClick={() =>
                        updateEmployee(index, "spouseHasIncome", false)
                      }
                      className="flex-1"
                    >
                      No
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("children")}</Label>
                  <Input
                    type="number"
                    min="0"
                    max="20"
                    className="w-20"
                    value={emp.numberOfChildren || ""}
                    onChange={(e) =>
                      updateEmployee(
                        index,
                        "numberOfChildren",
                        parseInt(e.target.value) || 0
                      )
                    }
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <div className="flex gap-4">
        <Button variant="outline" onClick={addEmployee}>
          + {t("addEmployee")}
        </Button>
        <CreditChargeButton
          feature="batch_pcb_run"
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
                  {t("totalMonthlyPcb")}
                </p>
                <p className="text-4xl font-bold text-primary">
                  {formatRM(result.totalMonthlyPcb)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("totalAnnualPcb")}: {formatRM(result.totalAnnualPcb)}
                </p>
              </div>

              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left">
                        {t("employeeName")}
                      </th>
                      <th className="px-3 py-2 text-right">
                        {t("monthlySalary")}
                      </th>
                      <th className="px-3 py-2 text-right">
                        {t("monthlyPcb")}
                      </th>
                      <th className="px-3 py-2 text-right">
                        {t("annualTax")}
                      </th>
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
                          {formatRM(r.monthlyPcb)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatRM(r.annualTax)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted font-semibold">
                    <tr className="border-t">
                      <td className="px-3 py-2" colSpan={2}>
                        Total
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatRM(result.totalMonthlyPcb)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatRM(result.totalAnnualTax)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <SourceNote topic="pcb" />
    </div>
  );
}
