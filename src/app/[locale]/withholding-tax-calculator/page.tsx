import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { WithholdingTaxCalculator } from "@/components/withholding-tax-calculator";
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
  const t = await getTranslations({ locale, namespace: "withholdingTax.page" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      languages: {
        en: "/en/withholding-tax-calculator",
        zh: "/zh/withholding-tax-calculator",
        ms: "/ms/withholding-tax-calculator",
      },
    },
  };
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Malaysia Withholding Tax Calculator",
  url: `${SITE_URL}/en/withholding-tax-calculator`,
  applicationCategory: "FinanceApplication",
  operatingSystem: "All",
  offers: { "@type": "Offer", price: "0", priceCurrency: "MYR" },
  description: "Calculate Malaysian withholding tax on payments to non-residents.",
  inLanguage: ["en", "zh", "ms"],
  creator: { "@type": "Organization", name: "MYTax", url: SITE_URL },
};

export default function WithholdingTaxCalculatorPage() {
  const t = useTranslations("withholdingTax.page");
  const faq = useTranslations("withholdingTax.faq");
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
        <GatedTool feature="corporate_tools_run" summary={{ tool: "wht" }}>
          <WithholdingTaxCalculator />
        </GatedTool>
      </PaidFeatureGate>
      <FaqSection title={faq("title")} items={faqItems} />
    </div>
  );
}
