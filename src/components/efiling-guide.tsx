"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { TaxCalculationResult, TaxCalculationInput } from "@/engine/types";
import { ChevronDown, FileText } from "lucide-react";

function formatRM(amount: number): string {
  return `RM ${amount.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

interface EfilingGuideProps {
  result: TaxCalculationResult;
  input: TaxCalculationInput;
}

export function EfilingGuide({ result, input }: EfilingGuideProps) {
  const t = useTranslations("efiling");
  const [open, setOpen] = useState(false);

  const employmentTotal = input.income.employment + input.income.commission;
  const otherIncomeTotal = input.income.interest + input.income.other;

  const rows: { figure: string; amount: number; field: string; show: boolean }[] = [
    {
      figure: t("rowEmployment"),
      amount: employmentTotal,
      field: t("fieldEmployment"),
      show: employmentTotal > 0,
    },
    {
      figure: t("rowRental"),
      amount: input.income.rental,
      field: t("fieldRental"),
      show: input.income.rental > 0,
    },
    {
      figure: t("rowDividend"),
      amount: input.income.dividend,
      field: t("fieldDividend"),
      show: input.income.dividend > 0,
    },
    {
      figure: t("rowOtherIncome"),
      amount: otherIncomeTotal,
      field: t("fieldOtherIncome"),
      show: otherIncomeTotal > 0,
    },
    {
      figure: t("rowTotalIncome"),
      amount: result.grossIncome,
      field: t("fieldTotalIncome"),
      show: true,
    },
    {
      figure: t("rowTotalReliefs"),
      amount: result.totalReliefs,
      field: t("fieldTotalReliefs"),
      show: true,
    },
    {
      figure: t("rowChargeable"),
      amount: result.chargeableIncome,
      field: t("fieldChargeable"),
      show: true,
    },
    {
      figure: t("rowZakat"),
      amount: result.zakatDeduction,
      field: t("fieldZakat"),
      show: result.zakatDeduction > 0,
    },
    {
      figure: t("rowTaxPayable"),
      amount: result.taxAfterRebateAndZakat,
      field: t("fieldTaxPayable"),
      show: true,
    },
    {
      figure: t("rowPcb"),
      amount: result.totalPcbPaid,
      field: t("fieldPcb"),
      show: result.totalPcbPaid > 0,
    },
    {
      figure:
        result.balanceTaxPayable >= 0 ? t("rowBalance") : t("rowRefund"),
      amount: Math.abs(result.balanceTaxPayable),
      field:
        result.balanceTaxPayable >= 0 ? t("fieldBalance") : t("fieldRefund"),
      show: result.totalPcbPaid > 0,
    },
  ];

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm font-medium hover:bg-muted transition-colors print:hidden"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          {t("title")}
        </span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t pt-3">
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal pl-4">
            <li>{t("step1")}</li>
            <li>{t("step2")}</li>
            <li>{t("step3")}</li>
          </ol>

          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left">{t("colFigure")}</th>
                  <th className="px-3 py-2 text-right">{t("colAmount")}</th>
                  <th className="px-3 py-2 text-left">{t("colField")}</th>
                </tr>
              </thead>
              <tbody>
                {rows
                  .filter((r) => r.show)
                  .map((r, i) => (
                    <tr key={i} className="border-t align-top">
                      <td className="px-3 py-2">{r.figure}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">
                        {formatRM(r.amount)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {r.field}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground">{t("reliefNote")}</p>
          <p className="text-xs text-muted-foreground">{t("disclaimer")}</p>
        </div>
      )}
    </div>
  );
}
