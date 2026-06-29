import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { BatchPcbForm } from "@/components/batch-pcb-form";
import { PaidFeatureGate } from "@/components/paid-feature-gate";
import { ToolPageShell } from "@/components/tool-page-shell";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "batchPcb" });

  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default function BatchPcbPage() {
  const t = useTranslations("batchPcb");

  return (
    <ToolPageShell
      eyebrow="Employer / PCB"
      title={t("title")}
      subtitle={t("subtitle")}
      creditLabel="Free"
      resultTitle="Batch PCB preview"
    >
      <PaidFeatureGate>
        <BatchPcbForm />
      </PaidFeatureGate>
    </ToolPageShell>
  );
}
