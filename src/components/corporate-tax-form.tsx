"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CreditChargeButton } from "@/components/credit-charge-button";
import { SourceNote } from "@/components/source-note";
import { calculateCorporateTax } from "@/engine/corporate";
import { CorporateTaxInput } from "@/engine/types";

const YEAR_OF_ASSESSMENT = 2025;

function formatRM(amount: number): string {
  return `RM ${amount.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function CorporateTaxForm() {
  const t = useTranslations("corporate");

  const [chargeableIncome, setChargeableIncome] = useState(0);
  const [isSme, setIsSme] = useState(true);
  const [paidUpCapital, setPaidUpCapital] = useState(500000);
  const [annualRevenue, setAnnualRevenue] = useState(5000000);
  const [isSubsidiary, setIsSubsidiary] = useState(false);
  const [foreignOwned, setForeignOwned] = useState(false);
  const [chargedInputKey, setChargedInputKey] = useState<string | null>(null);

  const inputKey = JSON.stringify({
    chargeableIncome,
    isSme,
    paidUpCapital,
    annualRevenue,
    isSubsidiary,
    foreignOwned,
  });

  const result = useMemo(() => {
    if (chargeableIncome <= 0) return null;
    const input: CorporateTaxInput = {
      yearOfAssessment: YEAR_OF_ASSESSMENT,
      chargeableIncome,
      isSme,
      paidUpCapital,
      annualRevenue,
      isSubsidiaryOfLargeCompany: isSubsidiary,
      foreignOwnershipOver20Pct: foreignOwned,
    };
    return calculateCorporateTax(input);
  }, [chargeableIncome, isSme, paidUpCapital, annualRevenue, isSubsidiary, foreignOwned]);

  function handleReset() {
    setChargeableIncome(0);
    setIsSme(true);
    setPaidUpCapital(500000);
    setAnnualRevenue(5000000);
    setIsSubsidiary(false);
    setForeignOwned(false);
    setChargedInputKey(null);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("companyType")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={isSme ? "default" : "outline"}
              onClick={() => setIsSme(true)}
            >
              {t("sme")}
            </Button>
            <Button
              variant={!isSme ? "default" : "outline"}
              onClick={() => setIsSme(false)}
            >
              {t("nonSme")}
            </Button>
          </div>

          {isSme && (
            <>
              <p className="text-sm text-muted-foreground">{t("smeNote")}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="paid-up-capital">{t("paidUpCapital")}</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      RM
                    </span>
                    <Input
                      id="paid-up-capital"
                      type="number"
                      min="0"
                      className="pl-12"
                      value={paidUpCapital || ""}
                      onChange={(e) =>
                        setPaidUpCapital(parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="annual-revenue">{t("annualRevenue")}</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      RM
                    </span>
                    <Input
                      id="annual-revenue"
                      type="number"
                      min="0"
                      className="pl-12"
                      value={annualRevenue || ""}
                      onChange={(e) =>
                        setAnnualRevenue(parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between gap-4">
                  <Label className="text-sm font-normal flex-1">
                    {t("subsidiaryQuestion")}
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={isSubsidiary ? "default" : "outline"}
                      onClick={() => setIsSubsidiary(true)}
                    >
                      {t("yes")}
                    </Button>
                    <Button
                      size="sm"
                      variant={!isSubsidiary ? "default" : "outline"}
                      onClick={() => setIsSubsidiary(false)}
                    >
                      {t("no")}
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <Label className="text-sm font-normal flex-1">
                    {t("foreignOwnershipQuestion")}
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={foreignOwned ? "default" : "outline"}
                      onClick={() => setForeignOwned(true)}
                    >
                      {t("yes")}
                    </Button>
                    <Button
                      size="sm"
                      variant={!foreignOwned ? "default" : "outline"}
                      onClick={() => setForeignOwned(false)}
                    >
                      {t("no")}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("chargeableIncome")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              RM
            </span>
            <Input
              type="number"
              min="0"
              step="1000"
              className="pl-12 text-lg h-12"
              value={chargeableIncome || ""}
              onChange={(e) =>
                setChargeableIncome(parseFloat(e.target.value) || 0)
              }
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <CreditChargeButton
          feature="corporate_tax_calculation"
          disabled={!result}
          requestSummary={{ chargeableIncome, isSme }}
          onCharged={() => setChargedInputKey(inputKey)}
        >
          {t("calculate")}
        </CreditChargeButton>
        <Button size="lg" variant="outline" onClick={handleReset}>
          {t("reset")}
        </Button>
      </div>

      {result && chargedInputKey === inputKey && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle>{t("totalTax")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isSme && (
                <div
                  className={`rounded-md p-3 text-sm font-medium ${
                    result.isSmeQualified
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {result.isSmeQualified
                    ? t("smeQualified")
                    : t("smeNotQualified")}
                </div>
              )}

              <div className="rounded-lg bg-primary/5 border-2 border-primary/20 p-6 text-center space-y-2">
                <p className="text-sm text-muted-foreground">{t("totalTax")}</p>
                <p className="text-4xl font-bold text-primary">
                  {formatRM(result.totalTax)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("effectiveRate")}: {result.effectiveRate}%
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium mb-2">
                  {t("bandBreakdown")}
                </p>
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left">{t("band")}</th>
                        <th className="px-3 py-2 text-right">{t("rate")}</th>
                        <th className="px-3 py-2 text-right">{t("taxable")}</th>
                        <th className="px-3 py-2 text-right">{t("tax")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.bandBreakdown.map((b, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-2">
                            {t(b.band.label as "sme_tier1" | "sme_tier2" | "sme_tier3" | "standard")}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {(b.band.rate * 100).toFixed(0)}%
                          </td>
                          <td className="px-3 py-2 text-right">
                            {formatRM(b.taxableInBand)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {formatRM(b.taxForBand)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mt-4 p-3 bg-muted rounded-md">
                {t("disclaimer")}
              </p>

              <SourceNote topic="corporate" />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
