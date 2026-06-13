import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "disclaimer" });
  return { title: t("title") };
}

export default function DisclaimerPage() {
  const t = useTranslations("disclaimer");

  return (
    <div className="max-w-3xl mx-auto prose prose-sm">
      <h1 className="text-2xl font-bold mb-2">{t("title")}</h1>
      <p className="text-sm text-muted-foreground mb-6">{t("lastUpdated")}</p>

      <section className="space-y-5">
        <div className="border-l-2 pl-4">
          <h2 className="text-base font-semibold mb-1">{t("s1Title")}</h2>
          <p className="text-sm text-muted-foreground m-0">{t("s1Desc")}</p>
        </div>

        <div className="border-l-2 pl-4">
          <h2 className="text-base font-semibold mb-1">{t("s2Title")}</h2>
          <p className="text-sm text-muted-foreground m-0">{t("s2Desc")}</p>
        </div>

        <div className="border-l-2 pl-4">
          <h2 className="text-base font-semibold mb-1">{t("s3Title")}</h2>
          <p className="text-sm text-muted-foreground m-0">{t("s3Desc")}</p>
        </div>

        <div className="border-l-2 pl-4">
          <h2 className="text-base font-semibold mb-1">{t("s4Title")}</h2>
          <p className="text-sm text-muted-foreground m-0">{t("s4Desc")}</p>
        </div>

        <div className="border-l-2 pl-4">
          <h2 className="text-base font-semibold mb-1">{t("s5Title")}</h2>
          <p className="text-sm text-muted-foreground m-0">{t("s5Desc")}</p>
        </div>

        <div className="border-l-2 pl-4">
          <h2 className="text-base font-semibold mb-1">{t("s6Title")}</h2>
          <p className="text-sm text-muted-foreground m-0">{t("s6Desc")}</p>
        </div>

        <div className="border-l-2 pl-4">
          <h2 className="text-base font-semibold mb-1">{t("s7Title")}</h2>
          <p className="text-sm text-muted-foreground m-0">{t("s7Desc")}</p>
        </div>
      </section>
    </div>
  );
}
