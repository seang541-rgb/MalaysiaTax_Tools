"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TaxCalculationResult } from "@/engine/types";

function formatRM(amount: number): string {
  return `RM ${amount.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface TaxResultProps {
  result: TaxCalculationResult;
}

export function TaxResult({ result }: TaxResultProps) {
  const t = useTranslations("results");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Row label={t("grossIncome")} value={formatRM(result.grossIncome)} />
          <Row label={t("totalReliefs")} value={`- ${formatRM(result.totalReliefs)}`} />
          <Separator />
          <Row label={t("chargeableIncome")} value={formatRM(result.chargeableIncome)} bold />
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium mb-2">{t("bandBreakdown")}</p>
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
                {result.bandBreakdown
                  .filter((b) => b.taxableInBand > 0)
                  .map((b, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2">
                        {b.band.max === Infinity
                          ? `RM ${b.band.min.toLocaleString()}+`
                          : `RM ${b.band.min.toLocaleString()} – ${b.band.max.toLocaleString()}`
                        }
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

        <div className="space-y-2">
          <Row label={t("taxBeforeRebate")} value={formatRM(result.taxBeforeRebate)} />
          {result.rebateAmount > 0 && (
            <Row label={t("rebate")} value={`- ${formatRM(result.rebateAmount)}`} />
          )}
          {result.zakatDeduction > 0 && (
            <Row label={t("zakat")} value={`- ${formatRM(result.zakatDeduction)}`} />
          )}
          <Separator />
          <Row label={t("taxPayable")} value={formatRM(result.taxAfterRebateAndZakat)} bold />
        </div>

        {result.totalPcbPaid > 0 && (
          <div className="space-y-2">
            <Row label={t("pcbPaid")} value={`- ${formatRM(result.totalPcbPaid)}`} />
            <Separator />
            <Row
              label={result.balanceTaxPayable >= 0 ? t("underpaid") : t("overpaid")}
              value={formatRM(Math.abs(result.balanceTaxPayable))}
              bold
              highlight={result.balanceTaxPayable < 0 ? "green" : "red"}
            />
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-4 p-3 bg-muted rounded-md">
          {t("disclaimer")}
        </p>
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  bold,
  highlight,
}: {
  label: string;
  value: string;
  bold?: boolean;
  highlight?: "green" | "red";
}) {
  const textClass = highlight === "green"
    ? "text-green-600"
    : highlight === "red"
      ? "text-red-600"
      : "";

  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <span>{label}</span>
      <span className={textClass}>{value}</span>
    </div>
  );
}
