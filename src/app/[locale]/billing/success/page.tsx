import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function BillingSuccessPage() {
  const t = await getTranslations("billing");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold">{t("successTitle")}</h1>
      <p className="mt-3 text-muted-foreground">{t("successDesc")}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
          href="/account"
        >
          {t("viewAccount")}
        </Link>
        <Link className="rounded-md border px-4 py-2" href="/ai-tax">
          {t("tryAi")}
        </Link>
      </div>
    </div>
  );
}
