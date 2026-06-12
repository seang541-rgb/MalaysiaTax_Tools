import { getTranslations } from "next-intl/server";
import { PricingCards } from "@/components/pricing-cards";

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

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
      </div>
      <PricingCards locale={locale} ctaLabel={t("buy")} />
      <p className="mt-6 text-sm text-muted-foreground">{t("freeNote")}</p>
    </div>
  );
}
