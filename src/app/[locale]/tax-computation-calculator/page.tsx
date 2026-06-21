import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { TaxComputationCalculator } from "@/components/tax-computation-calculator";
import { PaidFeatureGate } from "@/components/paid-feature-gate";
import { GatedTool } from "@/components/gated-tool";
import { FaqSection, FaqItem } from "@/components/faq-section";
import { SourceNote } from "@/components/source-note";
import { SITE_URL } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "taxComputation.page" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      languages: {
        en: "/en/tax-computation-calculator",
        zh: "/zh/tax-computation-calculator",
        ms: "/ms/tax-computation-calculator",
      },
    },
  };
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Malaysia Company Tax Computation Calculator",
  url: `${SITE_URL}/en/tax-computation-calculator`,
  applicationCategory: "FinanceApplication",
  operatingSystem: "All",
  offers: { "@type": "Offer", price: "0", priceCurrency: "MYR" },
  description: "Compute Malaysian company income tax from accounting profit, with add-backs, capital allowances, and SME rates.",
  inLanguage: ["en", "zh", "ms"],
  creator: { "@type": "Organization", name: "MYTax", url: SITE_URL },
};

export default function TaxComputationCalculatorPage() {
  const t = useTranslations("taxComputation.page");
  const faq = useTranslations("taxComputation.faq");
  const faqItems = faq.raw("items") as FaqItem[];

  return (
    <div className="max-w-3xl mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold mb-2">{t("h1")}</h1>
        <p className="text-muted-foreground">{t("intro")}</p>
      </div>
      <PaidFeatureGate>
        <GatedTool feature="corporate_tools_run" summary={{ tool: "taxcomp" }}>
          <TaxComputationCalculator />
        </GatedTool>
      </PaidFeatureGate>
      <FaqSection title={faq("title")} items={faqItems} />
      <SourceNote topic="corporate" />
    </div>
  );
}
