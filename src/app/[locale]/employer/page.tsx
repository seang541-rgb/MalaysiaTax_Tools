import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { EmployerForm } from "@/components/employer-form";
import { PaidFeatureGate } from "@/components/paid-feature-gate";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "employer" });

  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default function EmployerPage() {
  const t = useTranslations("employer");

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold mb-2">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <PaidFeatureGate>
        <EmployerForm />
      </PaidFeatureGate>
    </div>
  );
}
