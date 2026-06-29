import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { EInvoiceChecker } from "@/components/e-invoice-checker";
import { PaidFeatureGate } from "@/components/paid-feature-gate";
import { FaqSection, FaqItem } from "@/components/faq-section";
import { ToolPageShell } from "@/components/tool-page-shell";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "einvoice" });

  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default function EInvoicePage() {
  const t = useTranslations("einvoice");
  const faq = useTranslations("einvoiceFaq");
  const faqItems = faq.raw("items") as FaqItem[];

  return (
    <ToolPageShell
      eyebrow="e-Invoice"
      title={t("title")}
      subtitle={t("subtitle")}
      creditLabel="1 credit"
      resultTitle="Compliance preview"
    >
      <PaidFeatureGate>
        <EInvoiceChecker />
      </PaidFeatureGate>
      <FaqSection title={faq("title")} items={faqItems} />
    </ToolPageShell>
  );
}
