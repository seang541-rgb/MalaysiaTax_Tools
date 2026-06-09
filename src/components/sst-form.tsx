"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { calculateSst, SERVICE_TAX_CATEGORIES } from "@/engine/sst";
import { SstInput, ServiceTaxCategory } from "@/engine/types";

const SERVICE_CATEGORIES = Object.keys(SERVICE_TAX_CATEGORIES) as ServiceTaxCategory[];

function formatRM(amount: number): string {
  return `RM ${amount.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function SstForm() {
  const t = useTranslations("sst");

  const [taxType, setTaxType] = useState<"sales" | "service">("service");
  const [salesTaxRate, setSalesTaxRate] = useState<5 | 10>(10);
  const [serviceCategory, setServiceCategory] = useState<ServiceTaxCategory>("general");
  const [taxableRevenue, setTaxableRevenue] = useState(0);

  const result = useMemo(() => {
    if (taxableRevenue <= 0) return null;
    const input: SstInput = {
      taxableRevenue,
      taxType,
      salesTaxRate: taxType === "sales" ? salesTaxRate : undefined,
      serviceCategory: taxType === "service" ? serviceCategory : undefined,
    };
    return calculateSst(input);
  }, [taxableRevenue, taxType, salesTaxRate, serviceCategory]);

  function handleReset() {
    setTaxType("service");
    setSalesTaxRate(10);
    setServiceCategory("general");
    setTaxableRevenue(0);
  }

  const activeThreshold =
    taxType === "service"
      ? SERVICE_TAX_CATEGORIES[serviceCategory].threshold
      : 500000;
  const activeRate =
    taxType === "service"
      ? SERVICE_TAX_CATEGORIES[serviceCategory].rate * 100
      : salesTaxRate;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("taxType")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={taxType === "service" ? "default" : "outline"}
              onClick={() => setTaxType("service")}
            >
              {t("serviceTax")}
            </Button>
            <Button
              variant={taxType === "sales" ? "default" : "outline"}
              onClick={() => setTaxType("sales")}
            >
              {t("salesTax")}
            </Button>
          </div>

          {taxType === "service" && (
            <div className="space-y-2">
              <Label htmlFor="service-category">{t("serviceCategory")}</Label>
              <select
                id="service-category"
                className="w-full h-10 px-3 rounded-md border bg-background text-sm"
                value={serviceCategory}
                onChange={(e) =>
                  setServiceCategory(e.target.value as ServiceTaxCategory)
                }
              >
                {SERVICE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {t(`category_${cat}`)} —{" "}
                    {SERVICE_TAX_CATEGORIES[cat].rate * 100}%
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {t("expansionNote")}
              </p>
            </div>
          )}

          {taxType === "sales" && (
            <div className="space-y-2">
              <Label>{t("salesTaxRate")}</Label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={salesTaxRate === 5 ? "default" : "outline"}
                  onClick={() => setSalesTaxRate(5)}
                >
                  {t("rate5")}
                </Button>
                <Button
                  size="sm"
                  variant={salesTaxRate === 10 ? "default" : "outline"}
                  onClick={() => setSalesTaxRate(10)}
                >
                  {t("rate10")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("taxableRevenue")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              RM
            </span>
            <Input
              type="number"
              min="0"
              step="10000"
              className="pl-12 text-lg h-12"
              value={taxableRevenue || ""}
              onChange={(e) =>
                setTaxableRevenue(parseFloat(e.target.value) || 0)
              }
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {t("threshold")}:{" "}
            {activeThreshold === 0
              ? t("noThreshold")
              : `RM ${activeThreshold.toLocaleString("en-MY")}`}{" "}
            · {t("taxRate")}: {activeRate}%
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-4">
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
              <div
                className={`rounded-md p-3 text-sm font-medium ${
                  result.isRegistrationRequired
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-green-50 text-green-700 border border-green-200"
                }`}
              >
                {result.isRegistrationRequired
                  ? t("registrationRequired")
                  : t("registrationNotRequired")}
              </div>

              {result.isRegistrationRequired && (
                <>
                  <div className="rounded-lg bg-primary/5 border-2 border-primary/20 p-6 text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {t("estimatedAnnualTax")}
                    </p>
                    <p className="text-4xl font-bold text-primary">
                      {formatRM(result.estimatedTax)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ≈ {formatRM(result.monthlyTax)} / {t("estimatedMonthlyTax")}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>{t("taxableRevenue")}</span>
                      <span>{formatRM(result.taxableRevenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("taxRate")}</span>
                      <span>{result.taxRate}%</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>{t("estimatedAnnualTax")}</span>
                      <span>{formatRM(result.estimatedTax)}</span>
                    </div>
                  </div>
                </>
              )}

              <p className="text-xs text-muted-foreground p-3 bg-muted rounded-md">
                {t("disclaimer")}
              </p>
            </CardContent>
          </Card>
        </>
      )}

      <Separator />

      {/* Explanation */}
      <Card>
        <CardHeader>
          <CardTitle>{t("whatIsSst")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("sstDesc")}
          </p>
          <h3 className="font-semibold">{t("salesVsService")}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("salesVsServiceDesc")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
