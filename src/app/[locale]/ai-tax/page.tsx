import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { PaidFeatureGate } from "@/components/paid-feature-gate";
import { TaxChat } from "@/components/tax-chat";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "aiTax" });
  return {
    title: t("pageTitle"),
    description: t("pageSubtitle"),
  };
}

export default function AiTaxPage() {
  const t = useTranslations("aiTax");

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">{t("pageTitle")}</h1>
        <p className="text-muted-foreground mt-2">{t("pageSubtitle")}</p>
      </div>
      <PaidFeatureGate>
        <TaxChat />
      </PaidFeatureGate>
    </div>
  );
}
