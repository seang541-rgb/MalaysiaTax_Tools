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

function getHomeCopy(locale: string) {
  if (locale === "zh") {
    return {
      eyebrow: "马来西亚税务工具",
      title: "先说任务，再进入税表",
      subtitle:
        "更清晰的马来西亚税务工作区，先判断你是个人、雇主还是公司，再带你进入正确流程。",
      askAi: "询问 AI 税务助手",
      viewTools: "查看工具",
    };
  }

  if (locale === "ms") {
    return {
      eyebrow: "Alat Cukai Malaysia",
      title: "Mulakan dengan tugas, bukan borang cukai",
      subtitle:
        "Ruang kerja cukai Malaysia yang lebih jelas untuk individu, majikan dan syarikat sebelum meminta butiran.",
      askAi: "Tanya AI Tax",
      viewTools: "Lihat alat",
    };
  }

  return {
    eyebrow: "Malaysia Tax Tools",
    title: "Start with the task, not the tax form",
    subtitle:
      "A clearer Malaysia tax workspace that routes individuals, employers and companies into the right workflow before asking for details.",
    askAi: "Ask AI Tax",
    viewTools: "View all tools",
  };
}

export default function HomePage() {
  const faq = useTranslations("homeFaq");
  const locale = useLocale();
  const faqItems = faq.raw("items") as FaqItem[];
  const copy = getHomeCopy(locale);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="mb-4 text-sm font-medium text-primary">
              {copy.eyebrow}
            </p>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              {copy.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              {copy.subtitle}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link
              href="/ai-tax"
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
            >
              {copy.askAi}
            </Link>
            <Link
              href="/corporate"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-background px-5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              {copy.viewTools}
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
