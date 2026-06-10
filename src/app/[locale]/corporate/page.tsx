import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { CorporateTaxForm } from "@/components/corporate-tax-form";
import { SourceNote } from "@/components/source-note";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "corporate" });

  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default function CorporateTaxPage() {
  const t = useTranslations("corporate");

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold mb-2">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <CorporateTaxForm />
      <SourceNote topic="corporate" />
    </div>
  );
}
