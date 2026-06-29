import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { PaidFeatureGate } from "@/components/paid-feature-gate";
import { SstForm } from "@/components/sst-form";
import { ToolPageShell } from "@/components/tool-page-shell";

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
    <ToolPageShell
      eyebrow="SST & WHT"
      title={t("title")}
      subtitle={t("subtitle")}
      creditLabel="1 credit"
      resultTitle="SST estimate"
    >
      <PaidFeatureGate>
        <SstForm />
      </PaidFeatureGate>
    </ToolPageShell>
  );
}
