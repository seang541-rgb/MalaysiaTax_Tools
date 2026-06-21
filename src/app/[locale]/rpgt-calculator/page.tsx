import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { RpgtCalculator } from "@/components/rpgt-calculator";
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
  const t = await getTranslations({ locale, namespace: "rpgt.page" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      languages: {
        en: "/en/rpgt-calculator",
        zh: "/zh/rpgt-calculator",
        ms: "/ms/rpgt-calculator",
      },
    },
  };
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Malaysia RPGT Calculator",
  url: `${SITE_URL}/en/rpgt-calculator`,
  applicationCategory: "FinanceApplication",
  operatingSystem: "All",
  offers: { "@type": "Offer", price: "0", priceCurrency: "MYR" },
  description:
    "Calculate Malaysia Real Property Gains Tax (RPGT) when selling property, including holding-period rates and the Schedule 4 exemption.",
  inLanguage: ["en", "zh", "ms"],
  creator: { "@type": "Organization", name: "MYTax", url: SITE_URL },
};

export default function RpgtCalculatorPage() {
  const t = useTranslations("rpgt.page");
  const faq = useTranslations("propertyFaq");
  // Property FAQ holds RPGT items first, then stamp duty — show only RPGT here.
  const faqItems = (faq.raw("items") as FaqItem[]).slice(0, 2);

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
        <GatedTool feature="property_calculation" summary={{ tool: "rpgt" }}>
          <RpgtCalculator />
        </GatedTool>
      </PaidFeatureGate>
      <FaqSection title={faq("title")} items={faqItems} />
      <SourceNote topic="rpgt" />
    </div>
  );
}
