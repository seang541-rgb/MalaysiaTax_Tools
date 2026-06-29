import { useLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { IncomeForm } from "@/components/income-form";
import { DeadlineCountdown } from "@/components/deadline-countdown";
import { HomeToolGrid } from "@/components/home-tool-grid";
import { WhoAmI } from "@/components/who-am-i";
import { FaqSection, FaqItem } from "@/components/faq-section";
import { Link } from "@/i18n/navigation";
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
  const faq = useTranslations("homeFaq");
  const locale = useLocale();
  const faqItems = faq.raw("items") as FaqItem[];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="rounded-lg border border-emerald-100 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="mb-4 text-sm font-medium text-emerald-700">
              Malaysia Tax Tools
            </p>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl">
              Start with the task, not the tax form
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600 md:text-lg">
              A clearer Malaysia tax workspace that routes individuals,
              employers and companies into the right workflow before asking for
              details.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link
              href="/ai-tax"
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
            >
              Ask AI Tax
            </Link>
            <Link
              href="/corporate"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-50"
            >
              View all tools
            </Link>
          </div>
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