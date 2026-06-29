import { getTranslations } from "next-intl/server";
import { PricingCards } from "@/components/pricing-cards";
import { PricingTrustPanel } from "@/components/pricing-trust-panel";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricing" });

  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricing" });
  const tFooter = await getTranslations({ locale, namespace: "footer" });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-stretch">
        <div className="rounded-lg border border-emerald-100 bg-white p-6 shadow-sm md:p-8">
          <p className="mb-3 text-sm font-medium text-emerald-700">
            Credits and billing
          </p>
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-600">
            {t("subtitle")}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-zinc-500">Billing model</p>
          <p className="mt-3 text-2xl font-semibold text-zinc-950">
            One-time credits
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Buy credits when needed. Paid tools show the cost before a run.
          </p>
        </div>
      </section>
      <PricingCards
        locale={locale}
        ctaLabel={t("buy")}
        checkoutNotice={t("checkoutNotice")}
        disclaimerHref={`/${locale}/disclaimer`}
        disclaimerLabel={tFooter("disclaimer")}
      />
      <PricingTrustPanel locale={locale} />
      <p className="text-sm text-zinc-600">{t("freeNote")}</p>
    </div>
  );
}
