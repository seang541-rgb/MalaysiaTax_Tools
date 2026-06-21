import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { IncentivesWizard } from "@/components/incentives-wizard";
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
  const t = await getTranslations({ locale, namespace: "taxIncentives.page" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      languages: {
        en: "/en/tax-incentives",
        zh: "/zh/tax-incentives",
        ms: "/ms/tax-incentives",
      },
    },
  };
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Malaysia Tax Incentives Finder",
  url: `${SITE_URL}/en/tax-incentives`,
  applicationCategory: "FinanceApplication",
  operatingSystem: "All",
  offers: { "@type": "Offer", price: "0", priceCurrency: "MYR" },
  description: "Explore Malaysian tax incentives like Pioneer Status, ITA, and Reinvestment Allowance.",
  inLanguage: ["en", "zh", "ms"],
  creator: { "@type": "Organization", name: "MYTax", url: SITE_URL },
};

export default function IncentivesWizardPage() {
  const t = useTranslations("taxIncentives.page");
  const faq = useTranslations("taxIncentives.faq");
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
        <GatedTool feature="corporate_tools_run" summary={{ tool: "incentives" }}>
          <IncentivesWizard />
        </GatedTool>
      </PaidFeatureGate>
      <FaqSection title={faq("title")} items={faqItems} />
      <SourceNote topic="corporate" />
    </div>
  );
}
