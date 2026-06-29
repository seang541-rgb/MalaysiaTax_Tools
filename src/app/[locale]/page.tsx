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
    <div className="mx-auto max-w-7xl space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-stretch">
        <div className="rounded-lg border border-emerald-100 bg-white p-6 shadow-sm md:p-8">
          <p className="mb-4 text-sm font-medium text-emerald-700">
            Malaysia Tax Tools
          </p>
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-zinc-950 md:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600 md:text-lg">
            {t("subtitle")}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {[
            ["YA2025", "Personal tax"],
            ["AI", "Question routing"],
            ["Live", "Credits billing"],
          ].map(([value, label]) => (
            <div
              key={value}
              className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <p className="text-2xl font-semibold text-zinc-950">{value}</p>
              <p className="mt-1 text-sm text-zinc-500">{label}</p>
            </div>
          ))}
        </div>
      </section>
      <HomeToolGrid locale={locale} />
      <div className="mx-auto max-w-4xl space-y-6">
        <DeadlineCountdown />
        <IncomeForm />
        <WhoAmI />
        <FaqSection title={faq("title")} items={faqItems} />
      </div>
    </div>
  );
}
