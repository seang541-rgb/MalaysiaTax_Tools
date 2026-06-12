"use client";

import { ReactNode, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  BILLING_FEATURE_COSTS,
  BillingFeature,
} from "@/lib/billing/plans";

type ButtonSize = "default" | "xs" | "sm" | "lg";
type ButtonVariant = "default" | "outline" | "secondary" | "ghost";

interface CreditChargeButtonProps {
  feature: BillingFeature;
  requestSummary?: Record<string, unknown>;
  disabled?: boolean;
  onCharged: () => void | Promise<void>;
  children?: ReactNode;
  size?: ButtonSize;
  variant?: ButtonVariant;
  className?: string;
}

export function CreditChargeButton({
  feature,
  requestSummary,
  disabled = false,
  onCharged,
  children,
  size = "lg",
  variant = "default",
  className,
}: CreditChargeButtonProps) {
  const t = useTranslations("creditUse");
  const [isCharging, setIsCharging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const credits = BILLING_FEATURE_COSTS[feature];

  async function handleCharge() {
    setIsCharging(true);
    setError(null);

    try {
      const response = await fetch("/api/billing/consume", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ feature, requestSummary }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const code = data?.error?.code;
        if (code === "AUTH_REQUIRED") {
          setError(t("authRequired"));
        } else if (code === "INSUFFICIENT_CREDITS") {
          setError(t("insufficientCredits"));
        } else {
          setError(t("failed"));
        }
        return;
      }

      if (typeof data?.balance === "number") {
        window.dispatchEvent(
          new CustomEvent("mytax:credits-updated", {
            detail: { balance: data.balance },
          })
        );
      }

      await onCharged();
    } catch {
      setError(t("failed"));
    } finally {
      setIsCharging(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        size={size}
        variant={variant}
        className={className}
        disabled={disabled || isCharging}
        onClick={handleCharge}
      >
        {isCharging
          ? t("processing")
          : children ?? t("useCredits", { credits })}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
