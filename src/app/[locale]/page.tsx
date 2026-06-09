import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { IncomeForm } from "@/components/income-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      languages: {
        en: "/en",
        zh: "/zh",
        ms: "/ms",
      },
    },
  };
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "MYTax - Malaysia Tax Calculator",
  url: "https://mytax.my",
  applicationCategory: "FinanceApplication",
  operatingSystem: "All",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "MYR",
  },
  description:
    "Free Malaysia personal income tax calculator for YA2025. Calculate tax with all LHDN reliefs, PCB, corporate tax, EPF/SOCSO/EIS, and SST.",
  inLanguage: ["en", "zh", "ms"],
  creator: {
    "@type": "Organization",
    name: "MYTax",
    url: "https://mytax.my",
  },
};

export default function HomePage() {
  const t = useTranslations("calculator");

  return (
    <div className="max-w-3xl mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold mb-2">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <IncomeForm />
    </div>
  );
}
