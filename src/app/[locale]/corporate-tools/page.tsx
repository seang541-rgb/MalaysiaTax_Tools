import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { CorporateToolsTabs } from "@/components/corporate-tools-tabs";
import { PaidFeatureGate } from "@/components/paid-feature-gate";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "corptools" });

  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default function CorporateToolsPage() {
  const t = useTranslations("corptools");

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold mb-2">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <PaidFeatureGate>
        <CorporateToolsTabs />
      </PaidFeatureGate>
    </div>
  );
}
