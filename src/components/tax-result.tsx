"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TaxCalculationResult } from "@/engine/types";
import { Printer, Share2, Check } from "lucide-react";
import { useState } from "react";
import { TaxCalculationInput } from "@/engine/types";
import { EfilingGuide } from "./efiling-guide";
import { SourceNote } from "./source-note";

function formatRM(amount: number): string {
  return `RM ${amount.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface TaxResultProps {
  result: TaxCalculationResult;
  input?: TaxCalculationInput;
}

function encodeShareData(input: TaxCalculationInput): string {
  const data = {
    i: input.income,
    r: input.reliefs,
    m: input.maritalStatus,
    s: input.spouseHasIncome,
    z: input.zakatAmount,
    p: input.monthlyPcbPaid,
  };
  return btoa(JSON.stringify(data));
}

export function TaxResult({ result, input }: TaxResultProps) {
  const t = useTranslations("results");
  const [copied, setCopied] = useState(false);

  function handleShare() {
    if (!input) return;
    const hash = encodeShareData(input);
    const url = `${window.location.origin}${window.location.pathname}?d=${hash}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Card role="region" aria-label={t("title")} aria-live="polite">
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
          {result.dividendTax > 0 && (
            <Row label={t("dividendTax")} value={formatRM(result.dividendTax)} />
          )}
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

        {input && <EfilingGuide result={result} input={input} />}

        <p className="text-xs text-muted-foreground mt-4 p-3 bg-muted rounded-md">
          {t("disclaimer")}
        </p>

        <SourceNote topic="personal" />

        <div className="flex gap-3 mt-4 print:hidden">
          <button
            onClick={() => window.print()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            <Printer className="h-4 w-4" />
            {t("printExport")}
          </button>
          {input && (
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Share2 className="h-4 w-4" />}
              {copied ? t("linkCopied") : t("shareResult")}
            </button>
          )}
        </div>
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
