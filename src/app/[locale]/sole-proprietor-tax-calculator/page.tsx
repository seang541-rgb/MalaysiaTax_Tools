import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { SoleProprietorCalculator } from "@/components/sole-proprietor-calculator";
import { PaidFeatureGate } from "@/components/paid-feature-gate";
import { GatedTool } from "@/components/gated-tool";
import { FaqSection, FaqItem } from "@/components/faq-section";
import { SITE_URL } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "soleProprietor.page" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      languages: {
        en: "/en/sole-proprietor-tax-calculator",
        zh: "/zh/sole-proprietor-tax-calculator",
        ms: "/ms/sole-proprietor-tax-calculator",
      },
    },
  };
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Malaysia Sole Proprietor Tax Calculator",
  url: `${SITE_URL}/en/sole-proprietor-tax-calculator`,
  applicationCategory: "FinanceApplication",
  operatingSystem: "All",
  offers: { "@type": "Offer", price: "0", priceCurrency: "MYR" },
  description: "Estimate income tax for a Malaysian sole proprietor or partnership at individual resident rates.",
  inLanguage: ["en", "zh", "ms"],
  creator: { "@type": "Organization", name: "MYTax", url: SITE_URL },
};

export default function SoleProprietorCalculatorPage() {
  const t = useTranslations("soleProprietor.page");
  const faq = useTranslations("soleProprietor.faq");
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
        <GatedTool feature="corporate_tools_run" summary={{ tool: "soleprop" }}>
          <SoleProprietorCalculator />
        </GatedTool>
      </PaidFeatureGate>
      <FaqSection title={faq("title")} items={faqItems} />
    </div>
  );
}
