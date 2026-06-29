import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { CorporateTaxForm } from "@/components/corporate-tax-form";
import { PaidFeatureGate } from "@/components/paid-feature-gate";
import { ToolPageShell } from "@/components/tool-page-shell";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "corporate" });

  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default function CorporateTaxPage() {
  const t = useTranslations("corporate");

  return (
    <ToolPageShell
      eyebrow="Corporate Tax"
      title={t("title")}
      subtitle={t("subtitle")}
      creditLabel="1 credit"
      resultTitle="Tax estimate"
    >
      <PaidFeatureGate>
        <CorporateTaxForm />
      </PaidFeatureGate>
    </ToolPageShell>
  );
}
