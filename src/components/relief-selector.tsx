"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ReliefClaim, ReliefDefinition } from "@/engine/types";
import { getReliefDefinitions } from "@/engine/tax-reliefs";

interface ReliefSelectorProps {
  yearOfAssessment: number;
  claims: ReliefClaim[];
  onClaimsChange: (claims: ReliefClaim[]) => void;
}

const CATEGORY_ORDER = [
  "personal",
  "family",
  "medical",
  "education",
  "lifestyle",
  "contribution",
  "housing",
] as const;

function groupByCategory(definitions: ReliefDefinition[]) {
  const groups = new Map<string, ReliefDefinition[]>();
  for (const def of definitions) {
    const list = groups.get(def.category) || [];
    list.push(def);
    groups.set(def.category, list);
  }
  return groups;
}

export function ReliefSelector({
  yearOfAssessment,
  claims,
  onClaimsChange,
}: ReliefSelectorProps) {
  const t = useTranslations("reliefs");
  const tCalc = useTranslations("calculator");
  const tCommon = useTranslations("common");
  const tCat = useTranslations("categories");
  const definitions = getReliefDefinitions(yearOfAssessment);
  const groups = groupByCategory(definitions);
  const [openCategories, setOpenCategories] = useState<Set<string>>(
    new Set(["personal"])
  );

  function toggleCategory(cat: string) {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

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

  function countCheckedInCategory(defs: ReliefDefinition[]): number {
    return defs.filter((d) => isChecked(d.id)).length;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tCalc("reliefSection")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {CATEGORY_ORDER.map((cat) => {
          const defs = groups.get(cat);
          if (!defs) return null;
          const checkedCount = countCheckedInCategory(defs);
          const isOpen = openCategories.has(cat);

          return (
            <Collapsible
              key={cat}
              open={isOpen}
              onOpenChange={() => toggleCategory(cat)}
            >
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border px-4 py-3 text-sm font-medium hover:bg-muted transition-colors">
                <span>{tCat(cat)}</span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {checkedCount > 0 && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                      {checkedCount}
                    </span>
                  )}
                  <span>{isOpen ? "▲" : "▼"}</span>
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2 pl-2">
                {defs.map((def) => {
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
                        onCheckedChange={() =>
                          toggleRelief(def.id, def.maxAmount)
                        }
                      />
                      <Label
                        htmlFor={def.id}
                        className="flex-1 cursor-pointer text-sm"
                      >
                        {t(def.id)}
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
                              updateAmount(
                                def.id,
                                e.target.value,
                                def.maxAmount
                              )
                            }
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}
