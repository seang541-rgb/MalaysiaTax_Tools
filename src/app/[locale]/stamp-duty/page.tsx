import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { StampDutyCalculator } from "@/components/stamp-duty-calculator";
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
  const t = await getTranslations({ locale, namespace: "stampduty.page" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      languages: {
        en: "/en/stamp-duty",
        zh: "/zh/stamp-duty",
        ms: "/ms/stamp-duty",
      },
    },
  };
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Malaysia Stamp Duty Calculator",
  url: `${SITE_URL}/en/stamp-duty`,
  applicationCategory: "FinanceApplication",
  operatingSystem: "All",
  offers: { "@type": "Offer", price: "0", priceCurrency: "MYR" },
  description:
    "Calculate Malaysian property stamp duty — the tiered Memorandum of Transfer (MOT) duty, 0.5% loan agreement duty, and the first-time buyer exemption.",
  inLanguage: ["en", "zh", "ms"],
  creator: { "@type": "Organization", name: "MYTax", url: SITE_URL },
};

export default function StampDutyPage() {
  const t = useTranslations("stampduty.page");
  const faq = useTranslations("propertyFaq");
  // Property FAQ holds RPGT items first, then stamp duty — show only those here.
  const faqItems = (faq.raw("items") as FaqItem[]).slice(2, 4);

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
        <GatedTool feature="property_calculation" summary={{ tool: "stampduty" }}>
          <StampDutyCalculator />
        </GatedTool>
      </PaidFeatureGate>
      <FaqSection title={faq("title")} items={faqItems} />
    </div>
  );
}
