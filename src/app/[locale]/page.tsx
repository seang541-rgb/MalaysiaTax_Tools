import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { IncomeForm } from "@/components/income-form";

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

export default function HomePage() {
  const t = useTranslations("calculator");

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold mb-2">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <IncomeForm />
    </div>
  );
}
