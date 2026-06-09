import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy" });
  return { title: t("title") };
}

export default function PrivacyPage() {
  const t = useTranslations("privacy");

  return (
    <div className="max-w-3xl mx-auto prose prose-sm">
      <h1 className="text-2xl font-bold mb-6">{t("title")}</h1>
      <p className="text-sm text-muted-foreground mb-6">{t("lastUpdated")}</p>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t("collectTitle")}</h2>
        <p>{t("collectDesc")}</p>

        <h2 className="text-lg font-semibold">{t("useTitle")}</h2>
        <p>{t("useDesc")}</p>

        <h2 className="text-lg font-semibold">{t("storageTitle")}</h2>
        <p>{t("storageDesc")}</p>

        <h2 className="text-lg font-semibold">{t("cookiesTitle")}</h2>
        <p>{t("cookiesDesc")}</p>

        <h2 className="text-lg font-semibold">{t("thirdPartyTitle")}</h2>
        <p>{t("thirdPartyDesc")}</p>

        <h2 className="text-lg font-semibold">{t("changesTitle")}</h2>
        <p>{t("changesDesc")}</p>

        <h2 className="text-lg font-semibold">{t("contactTitle")}</h2>
        <p>{t("contactDesc")}</p>
      </section>
    </div>
  );
}
