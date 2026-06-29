import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { EmployerForm } from "@/components/employer-form";
import { PaidFeatureGate } from "@/components/paid-feature-gate";
import { ToolPageShell } from "@/components/tool-page-shell";

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
    <ToolPageShell
      eyebrow="Employer / PCB"
      title={t("title")}
      subtitle={t("subtitle")}
      creditLabel="Free"
      resultTitle="Payroll preview"
    >
      <PaidFeatureGate>
        <EmployerForm />
      </PaidFeatureGate>
    </ToolPageShell>
  );
}
