import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "terms" });
  return { title: t("title") };
}

export default function TermsPage() {
  const t = useTranslations("terms");

  return (
    <div className="max-w-3xl mx-auto prose prose-sm">
      <h1 className="text-2xl font-bold mb-6">{t("title")}</h1>
      <p className="text-sm text-muted-foreground mb-6">{t("lastUpdated")}</p>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t("acceptTitle")}</h2>
        <p>{t("acceptDesc")}</p>

        <h2 className="text-lg font-semibold">{t("serviceTitle")}</h2>
        <p>{t("serviceDesc")}</p>

        <h2 className="text-lg font-semibold">{t("disclaimerTitle")}</h2>
        <p>{t("disclaimerDesc")}</p>

        <h2 className="text-lg font-semibold">{t("liabilityTitle")}</h2>
        <p>{t("liabilityDesc")}</p>

        <h2 className="text-lg font-semibold">{t("ipTitle")}</h2>
        <p>{t("ipDesc")}</p>

        <h2 className="text-lg font-semibold">{t("changesTitle")}</h2>
        <p>{t("changesDesc")}</p>

        <h2 className="text-lg font-semibold">{t("lawTitle")}</h2>
        <p>{t("lawDesc")}</p>
      </section>
    </div>
  );
}
