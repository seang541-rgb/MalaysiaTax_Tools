"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReliefClaim } from "@/engine/types";
import { getReliefDefinitions } from "@/engine/tax-reliefs";

interface ReliefSelectorProps {
  yearOfAssessment: number;
  claims: ReliefClaim[];
  onClaimsChange: (claims: ReliefClaim[]) => void;
}

export function ReliefSelector({
  yearOfAssessment,
  claims,
  onClaimsChange,
}: ReliefSelectorProps) {
  const t = useTranslations("reliefs");
  const tCalc = useTranslations("calculator");
  const tCommon = useTranslations("common");
  const definitions = getReliefDefinitions(yearOfAssessment);

  function isChecked(reliefId: string): boolean {
    return claims.some((c) => c.reliefId === reliefId);
  }

  function getAmount(reliefId: string): number {
    return claims.find((c) => c.reliefId === reliefId)?.amount ?? 0;
  }

  function toggleRelief(reliefId: string, maxAmount: number) {
    if (isChecked(reliefId)) {
      onClaimsChange(claims.filter((c) => c.reliefId !== reliefId));
    } else {
      onClaimsChange([...claims, { reliefId, amount: maxAmount }]);
    }
  }

  function updateAmount(reliefId: string, value: string, maxAmount: number) {
    const num = Math.min(parseFloat(value) || 0, maxAmount);
    onClaimsChange(
      claims.map((c) => (c.reliefId === reliefId ? { ...c, amount: num } : c))
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tCalc("reliefSection")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {definitions.map((def) => {
          const checked = isChecked(def.id);
          const isIndividual = def.id === "individual";
          return (
            <div
              key={def.id}
              className="flex items-center gap-3 rounded-md border p-3"
            >
              <Checkbox
                id={def.id}
                checked={checked}
                disabled={isIndividual}
                onCheckedChange={() => toggleRelief(def.id, def.maxAmount)}
              />
              <Label htmlFor={def.id} className="flex-1 cursor-pointer text-sm">
                {t(def.id as any)}
                <span className="ml-2 text-xs text-muted-foreground">
                  ({tCommon("max")} RM{def.maxAmount.toLocaleString()})
                </span>
              </Label>
              {checked && (
                <div className="relative w-32">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    RM
                  </span>
                  <Input
                    type="number"
                    min="0"
                    max={def.maxAmount}
                    step="0.01"
                    className="h-8 pl-8 text-sm"
                    value={getAmount(def.id) || ""}
                    onChange={(e) =>
                      updateAmount(def.id, e.target.value, def.maxAmount)
                    }
                  />
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
