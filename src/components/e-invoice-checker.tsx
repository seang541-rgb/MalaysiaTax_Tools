"use client";

import { useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CreditChargeButton } from "@/components/credit-charge-button";
import { checkEInvoicePhase } from "@/engine/e-invoice";
import { CheckCircle2, AlertTriangle, CalendarClock, FileText } from "lucide-react";
import { SourceNote } from "./source-note";

function formatDate(iso: string, locale: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString(
    locale === "zh" ? "zh-CN" : locale === "ms" ? "ms-MY" : "en-MY",
    { year: "numeric", month: "long", day: "numeric" }
  );
}

export function EInvoiceChecker() {
  const t = useTranslations("einvoice");
  const locale = useLocale();
  const [annualRevenue, setAnnualRevenue] = useState(0);
  const [chargedInputKey, setChargedInputKey] = useState<string | null>(null);
  const inputKey = JSON.stringify({ annualRevenue });

  const result = useMemo(() => {
    if (annualRevenue <= 0) return null;
    return checkEInvoicePhase({ annualRevenue });
  }, [annualRevenue]);

  const today = new Date();
  const isAlreadyMandatory =
    result?.mandatoryDate != null &&
    new Date(result.mandatoryDate + "T00:00:00") <= today;
  const inRelaxation =
    result?.relaxationEnd != null &&
    isAlreadyMandatory &&
    today <= new Date(result.relaxationEnd + "T23:59:59");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("revenueQuestion")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="einvoice-revenue">{t("annualRevenue")}</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              RM
            </span>
            <Input
              id="einvoice-revenue"
              type="number"
              min="0"
              step="100000"
              className="pl-12 text-lg h-12"
              value={annualRevenue || ""}
              onChange={(e) => setAnnualRevenue(parseFloat(e.target.value) || 0)}
            />
          </div>
          <p className="text-xs text-muted-foreground">{t("revenueBasis")}</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <CreditChargeButton
              feature="einvoice_check"
              disabled={!result}
              size="sm"
              requestSummary={{ annualRevenue }}
              onCharged={() => setChargedInputKey(inputKey)}
            >
              {t("calculate")}
            </CreditChargeButton>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setAnnualRevenue(0);
                setChargedInputKey(null);
              }}
            >
              {t("reset")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && chargedInputKey === inputKey && (
        <>
          <Separator />
          <Card role="region" aria-live="polite">
            <CardHeader>
              <CardTitle>{t("results")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {result.isExempt ? (
                <div className="rounded-md p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 flex gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-green-800 dark:text-green-200">
                    <p className="font-semibold mb-1">{t("exemptTitle")}</p>
                    <p>{t("exemptDesc")}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className={`rounded-md p-4 border flex gap-3 ${
                      isAlreadyMandatory
                        ? "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800"
                        : "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800"
                    }`}
                  >
                    <AlertTriangle
                      className={`h-5 w-5 shrink-0 mt-0.5 ${
                        isAlreadyMandatory ? "text-amber-600" : "text-blue-600"
                      }`}
                    />
                    <div className="text-sm">
                      <p className="font-semibold mb-1">
                        {t("phaseLabel", { phase: result.phase ?? 0 })}
                      </p>
                      <p>
                        {isAlreadyMandatory
                          ? t("alreadyMandatory", {
                              date: formatDate(result.mandatoryDate!, locale),
                            })
                          : t("notYetMandatory", {
                              date: formatDate(result.mandatoryDate!, locale),
                            })}
                      </p>
                    </div>
                  </div>

                  {inRelaxation && (
                    <div className="rounded-md p-4 bg-muted border flex gap-3">
                      <CalendarClock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-semibold mb-1">{t("relaxationTitle")}</p>
                        <p className="text-muted-foreground">
                          {t("relaxationDesc", {
                            date: formatDate(result.relaxationEnd!, locale),
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Separator />

      {/* Key rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t("keyRulesTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>• {t("rule10k")}</p>
          <p>• {t("ruleExemption")}</p>
          <p>• {t("ruleVoluntary")}</p>
          <p>• {t("ruleMyInvois")}</p>
          <p>• {t("rulePhase4Relaxation")}</p>
        </CardContent>
      </Card>

      {/* Timeline table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("timelineTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left">{t("colPhase")}</th>
                  <th className="px-3 py-2 text-left">{t("colTurnover")}</th>
                  <th className="px-3 py-2 text-left">{t("colDate")}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="px-3 py-2">1</td>
                  <td className="px-3 py-2">&gt; RM100M</td>
                  <td className="px-3 py-2">1 Aug 2024</td>
                </tr>
                <tr className="border-t">
                  <td className="px-3 py-2">2</td>
                  <td className="px-3 py-2">RM25M – RM100M</td>
                  <td className="px-3 py-2">1 Jan 2025</td>
                </tr>
                <tr className="border-t">
                  <td className="px-3 py-2">3</td>
                  <td className="px-3 py-2">RM5M – RM25M</td>
                  <td className="px-3 py-2">1 Jul 2025</td>
                </tr>
                <tr className="border-t">
                  <td className="px-3 py-2">4</td>
                  <td className="px-3 py-2">RM1M – RM5M</td>
                  <td className="px-3 py-2">1 Jan 2026</td>
                </tr>
                <tr className="border-t bg-muted/50">
                  <td className="px-3 py-2">—</td>
                  <td className="px-3 py-2">≤ RM1M</td>
                  <td className="px-3 py-2">{t("exemptShort")}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-3 p-3 bg-muted rounded-md">
            {t("disclaimer")}
          </p>
        </CardContent>
      </Card>

      <SourceNote topic="e-invoice" />
    </div>
  );
}
