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
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 rounded-lg border bg-card p-6 shadow-sm md:p-8">
        <div className="max-w-2xl">
          <p className="mb-3 text-sm font-medium text-primary">
            Credits and billing
          </p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-2 text-muted-foreground md:text-base">
            {t("subtitle")}
          </p>
        </div>
      </div>
      <PricingCards
        locale={locale}
        ctaLabel={t("buy")}
        checkoutNotice={t("checkoutNotice")}
        disclaimerHref={`/${locale}/disclaimer`}
        disclaimerLabel={tFooter("disclaimer")}
      />
      <PricingTrustPanel locale={locale} />
      <p className="mt-6 text-sm text-muted-foreground">{t("freeNote")}</p>
    </div>
  );
}
