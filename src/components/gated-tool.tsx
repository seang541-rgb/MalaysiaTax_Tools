"use client";

import { ReactNode, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditChargeButton } from "@/components/credit-charge-button";
import type { BillingFeature } from "@/lib/billing/plans";

/**
 * Single-tool credit gate: shows an unlock card with the credit charge, then
 * renders the tool once the user has paid. Extracted from the tab pages so each
 * standalone tool URL can reuse the same unlock behaviour and billing feature.
 */
export function GatedTool({
  feature,
  summary,
  children,
}: {
  feature: BillingFeature;
  summary?: Record<string, unknown>;
  children: ReactNode;
}) {
  const t = useTranslations("creditUse");
  const [unlocked, setUnlocked] = useState(false);

  if (unlocked) return <>{children}</>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("unlockTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <CreditChargeButton
          feature={feature}
          requestSummary={summary}
          onCharged={() => setUnlocked(true)}
        />
      </CardContent>
    </Card>
  );
}
