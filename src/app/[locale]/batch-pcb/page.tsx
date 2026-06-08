import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { BatchPcbForm } from "@/components/batch-pcb-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "batchPcb" });

  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default function BatchPcbPage() {
  const t = useTranslations("batchPcb");

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold mb-2">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <BatchPcbForm />
    </div>
  );
}
