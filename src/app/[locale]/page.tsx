import { useLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { IncomeForm } from "@/components/income-form";
import { DeadlineCountdown } from "@/components/deadline-countdown";
import { HomeToolGrid } from "@/components/home-tool-grid";
import { WhoAmI } from "@/components/who-am-i";
import { FaqSection, FaqItem } from "@/components/faq-section";
import { SITE_URL } from "@/lib/site";

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
  url: SITE_URL,
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
    url: SITE_URL,
  },
};

export default function HomePage() {
  const t = useTranslations("calculator");
  const faq = useTranslations("homeFaq");
  const locale = useLocale();
  const faqItems = faq.raw("items") as FaqItem[];

  return (
    <div className="mx-auto max-w-6xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="rounded-lg border bg-card p-6 shadow-sm md:p-8">
        <div className="max-w-3xl">
          <p className="mb-3 text-sm font-medium text-primary">
            Malaysia Tax Tools
          </p>
          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-3 text-muted-foreground md:text-lg">
            {t("subtitle")}
          </p>
        </div>
      </div>
      <HomeToolGrid locale={locale} />
      <div className="mx-auto max-w-3xl">
        <DeadlineCountdown />
        <IncomeForm />
        <WhoAmI />
        <FaqSection title={faq("title")} items={faqItems} />
      </div>
    </div>
  );
}
