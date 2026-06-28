import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { JointVsSeparateForm } from "@/components/joint-vs-separate-form";
import { FaqSection, FaqItem } from "@/components/faq-section";
import { SITE_URL } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "jointAssessment" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      languages: {
        en: "/en/joint-vs-separate-assessment",
        zh: "/zh/joint-vs-separate-assessment",
        ms: "/ms/joint-vs-separate-assessment",
      },
    },
  };
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Malaysia Joint vs Separate Assessment Calculator",
  url: `${SITE_URL}/en/joint-vs-separate-assessment`,
  applicationCategory: "FinanceApplication",
  operatingSystem: "All",
  offers: { "@type": "Offer", price: "0", priceCurrency: "MYR" },
  description:
    "Compare joint and separate tax assessment for married couples in Malaysia to see which method pays less income tax.",
  inLanguage: ["en", "zh", "ms"],
  creator: { "@type": "Organization", name: "MYTax", url: SITE_URL },
};

export default function JointVsSeparatePage() {
  const t = useTranslations("jointAssessment");
  const faqItems = t.raw("faq") as FaqItem[];

  return (
    <div className="max-w-4xl mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold mb-2">{t("h1")}</h1>
        <p className="text-muted-foreground">{t("intro")}</p>
      </div>
      <JointVsSeparateForm />
      <FaqSection title={t("faqTitle")} items={faqItems} />
    </div>
  );
}
