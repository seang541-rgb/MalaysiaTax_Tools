import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { CapitalAllowanceCalculator } from "@/components/capital-allowance-calculator";
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
  const t = await getTranslations({ locale, namespace: "capitalAllowance.page" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      languages: {
        en: "/en/capital-allowance-calculator",
        zh: "/zh/capital-allowance-calculator",
        ms: "/ms/capital-allowance-calculator",
      },
    },
  };
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Malaysia Capital Allowance Calculator",
  url: `${SITE_URL}/en/capital-allowance-calculator`,
  applicationCategory: "FinanceApplication",
  operatingSystem: "All",
  offers: { "@type": "Offer", price: "0", priceCurrency: "MYR" },
  description: "Calculate Malaysian capital allowances on plant, machinery, and equipment.",
  inLanguage: ["en", "zh", "ms"],
  creator: { "@type": "Organization", name: "MYTax", url: SITE_URL },
};

export default function CapitalAllowanceCalculatorPage() {
  const t = useTranslations("capitalAllowance.page");
  const faq = useTranslations("capitalAllowance.faq");
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
        <GatedTool feature="corporate_tools_run" summary={{ tool: "capalw" }}>
          <CapitalAllowanceCalculator />
        </GatedTool>
      </PaidFeatureGate>
      <FaqSection title={faq("title")} items={faqItems} />
    </div>
  );
}
