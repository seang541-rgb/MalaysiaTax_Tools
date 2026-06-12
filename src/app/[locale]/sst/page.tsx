import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { PaidFeatureGate } from "@/components/paid-feature-gate";
import { SstForm } from "@/components/sst-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "sst" });

  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default function SstPage() {
  const t = useTranslations("sst");

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold mb-2">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <PaidFeatureGate>
        <SstForm />
      </PaidFeatureGate>
    </div>
  );
}
