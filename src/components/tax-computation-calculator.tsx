"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { calculateTaxComputation } from "@/engine/tax-computation";

function formatRM(amount: number): string {
  return `RM ${amount.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

interface MoneyFieldProps {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
  allowNegative?: boolean;
}

function MoneyField({ id, label, value, onChange, hint, allowNegative }: MoneyFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm">{label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          RM
        </span>
        <Input
          id={id}
          type="number"
          min={allowNegative ? undefined : "0"}
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

function WorksheetRow({
  label,
  amount,
  sign,
  bold,
}: {
  label: string;
  amount: number;
  sign?: "+" | "-" | "=";
  bold?: boolean;
}) {
  return (
    <div className={`flex justify-between gap-2 ${bold ? "font-semibold" : ""}`}>
      <span className={sign === "=" ? "" : "text-muted-foreground"}>
        {sign && <span className="inline-block w-4">{sign}</span>}
        {label}
      </span>
      <span className="tabular-nums">{formatRM(amount)}</span>
    </div>
  );
}

export function TaxComputationCalculator() {
  const t = useTranslations("taxcomp");

  const [pbt, setPbt] = useState(0);
  // add-backs
  const [depreciation, setDepreciation] = useState(0);
  const [provisions, setProvisions] = useState(0);
  const [entertainment, setEntertainment] = useState(0);
  const [fines, setFines] = useState(0);
  const [privateExp, setPrivateExp] = useState(0);
  const [donationsInPnl, setDonationsInPnl] = useState(0);
  const [otherAddBack, setOtherAddBack] = useState(0);
  // non-taxable
  const [exemptDividends, setExemptDividends] = useState(0);
  const [capitalGains, setCapitalGains] = useState(0);
  const [forexGain, setForexGain] = useState(0);
  const [otherNonTax, setOtherNonTax] = useState(0);
  // allowances & losses
  const [caCurrent, setCaCurrent] = useState(0);
  const [caBf, setCaBf] = useState(0);
  const [lossBf, setLossBf] = useState(0);
  const [otherIncome, setOtherIncome] = useState(0);
  const [donations, setDonations] = useState(0);
  const [isSme, setIsSme] = useState(true);

  const hasInput = pbt !== 0 || caCurrent > 0 || otherIncome > 0;

  const result = useMemo(() => {
    if (!hasInput) return null;
    return calculateTaxComputation({
      profitBeforeTax: pbt,
      addBacks: {
        depreciation,
        provisions,
        entertainmentDisallowed: entertainment,
        finesPenalties: fines,
        privateExpenses: privateExp,
        donationsInPnl,
        other: otherAddBack,
      },
      nonTaxableIncome: {
        exemptDividends,
        capitalGains,
        unrealisedForexGain: forexGain,
        other: otherNonTax,
      },
      capitalAllowanceCurrent: caCurrent,
      capitalAllowanceBroughtForward: caBf,
      businessLossBroughtForward: lossBf,
      otherIncome,
      approvedDonations: donations,
      isSme,
      paidUpCapital: isSme ? 1000000 : 10000000,
      annualRevenue: isSme ? 5000000 : 100000000,
    });
  }, [
    hasInput, pbt, depreciation, provisions, entertainment, fines, privateExp,
    donationsInPnl, otherAddBack, exemptDividends, capitalGains, forexGain,
    otherNonTax, caCurrent, caBf, lossBf, otherIncome, donations, isSme,
  ]);

  function handleReset() {
    setPbt(0); setDepreciation(0); setProvisions(0); setEntertainment(0);
    setFines(0); setPrivateExp(0); setDonationsInPnl(0); setOtherAddBack(0);
    setExemptDividends(0); setCapitalGains(0); setForexGain(0); setOtherNonTax(0);
    setCaCurrent(0); setCaBf(0); setLossBf(0); setOtherIncome(0); setDonations(0);
    setIsSme(true);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("inputTitle")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("inputSubtitle")}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <MoneyField
            id="tc-pbt"
            label={t("pbt")}
            value={pbt}
            onChange={setPbt}
            hint={t("pbtHint")}
            allowNegative
          />

          <div className="space-y-3">
            <p className="text-sm font-semibold">{t("addBacksTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("addBacksHint")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <MoneyField id="tc-dep" label={t("depreciation")} value={depreciation} onChange={setDepreciation} />
              <MoneyField id="tc-prov" label={t("provisions")} value={provisions} onChange={setProvisions} />
              <MoneyField id="tc-ent" label={t("entertainment")} value={entertainment} onChange={setEntertainment} />
              <MoneyField id="tc-fines" label={t("fines")} value={fines} onChange={setFines} />
              <MoneyField id="tc-priv" label={t("privateExpenses")} value={privateExp} onChange={setPrivateExp} />
              <MoneyField id="tc-donpnl" label={t("donationsInPnl")} value={donationsInPnl} onChange={setDonationsInPnl} />
              <MoneyField id="tc-otherab" label={t("otherAddBacks")} value={otherAddBack} onChange={setOtherAddBack} />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold">{t("nonTaxableTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("nonTaxableHint")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <MoneyField id="tc-div" label={t("exemptDividends")} value={exemptDividends} onChange={setExemptDividends} />
              <MoneyField id="tc-cg" label={t("capitalGains")} value={capitalGains} onChange={setCapitalGains} />
              <MoneyField id="tc-fx" label={t("forexGain")} value={forexGain} onChange={setForexGain} />
              <MoneyField id="tc-othernt" label={t("otherNonTaxable")} value={otherNonTax} onChange={setOtherNonTax} />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold">{t("allowancesTitle")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <MoneyField id="tc-ca" label={t("caCurrent")} value={caCurrent} onChange={setCaCurrent} hint={t("caCurrentHint")} />
              <MoneyField id="tc-cabf" label={t("caBf")} value={caBf} onChange={setCaBf} />
              <MoneyField id="tc-lossbf" label={t("lossBf")} value={lossBf} onChange={setLossBf} hint={t("lossBfHint")} />
              <MoneyField id="tc-otherinc" label={t("otherIncome")} value={otherIncome} onChange={setOtherIncome} hint={t("otherIncomeHint")} />
              <MoneyField id="tc-don" label={t("donations")} value={donations} onChange={setDonations} hint={t("donationsHint")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">{t("smeQuestion")}</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={isSme ? "default" : "outline"}
                onClick={() => setIsSme(true)}
              >
                {t("yes")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={!isSme ? "default" : "outline"}
                onClick={() => setIsSme(false)}
              >
                {t("no")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t("smeHint")}</p>
          </div>

          <Button size="sm" variant="outline" onClick={handleReset}>
            {t("reset")}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card role="region" aria-live="polite">
          <CardHeader>
            <CardTitle>{t("worksheetTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <WorksheetRow label={t("pbt")} amount={result.profitBeforeTax} />
              <WorksheetRow label={t("rowAddBacks")} amount={result.totalAddBacks} sign="+" />
              <WorksheetRow label={t("rowNonTaxable")} amount={result.totalNonTaxable} sign="-" />
              <Separator />
              <WorksheetRow label={t("rowAdjusted")} amount={result.adjustedIncome} sign="=" bold />
              {result.currentYearLoss > 0 && (
                <WorksheetRow label={t("rowCurrentLoss")} amount={result.currentYearLoss} />
              )}
              <WorksheetRow label={t("rowCaUsed")} amount={result.capitalAllowanceUsed} sign="-" />
              <Separator />
              <WorksheetRow label={t("rowStatutory")} amount={result.statutoryBusinessIncome} sign="=" bold />
              <WorksheetRow label={t("rowLossBfUsed")} amount={result.lossBroughtForwardUsed} sign="-" />
              <WorksheetRow label={t("rowOtherIncome")} amount={result.otherIncome} sign="+" />
              <Separator />
              <WorksheetRow label={t("rowAggregate")} amount={result.aggregateIncome} sign="=" bold />
              {result.currentYearLossUsed > 0 && (
                <WorksheetRow label={t("rowCurrentLossUsed")} amount={result.currentYearLossUsed} sign="-" />
              )}
              <WorksheetRow label={t("rowDonations")} amount={result.donationsAllowed} sign="-" />
              <Separator />
              <WorksheetRow label={t("rowChargeable")} amount={result.chargeableIncome} sign="=" bold />
            </div>

            <div className="rounded-lg bg-primary/5 border-2 border-primary/20 p-6 text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                {t("taxPayable")}
                {result.tax.isSmeQualified ? ` (${t("smeRates")})` : ` (${t("standardRate")})`}
              </p>
              <p className="text-4xl font-bold text-primary">
                {formatRM(result.tax.totalTax)}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("effectiveRate", { rate: result.tax.effectiveRate })}
              </p>
            </div>

            {(result.capitalAllowanceCarriedForward > 0 ||
              result.lossCarriedForward > 0 ||
              result.donationsDisallowed > 0) && (
              <div className="space-y-2 text-sm border rounded-md p-4">
                <p className="font-semibold">{t("carryForwardTitle")}</p>
                {result.capitalAllowanceCarriedForward > 0 && (
                  <div className="flex justify-between">
                    <span>{t("caCf")}</span>
                    <span>{formatRM(result.capitalAllowanceCarriedForward)}</span>
                  </div>
                )}
                {result.lossCarriedForward > 0 && (
                  <div className="flex justify-between">
                    <span>{t("lossCf")}</span>
                    <span>{formatRM(result.lossCarriedForward)}</span>
                  </div>
                )}
                {result.donationsDisallowed > 0 && (
                  <div className="flex justify-between text-red-600 dark:text-red-400">
                    <span>{t("donationsLost")}</span>
                    <span>{formatRM(result.donationsDisallowed)}</span>
                  </div>
                )}
              </div>
            )}

            <p className="text-xs text-muted-foreground p-3 bg-muted rounded-md">
              {t("disclaimer")}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
