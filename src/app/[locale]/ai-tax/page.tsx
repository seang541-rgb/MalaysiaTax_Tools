import { useTranslations } from "next-intl";
import { TaxChat } from "@/components/tax-chat";

export default function AiTaxPage() {
  const t = useTranslations("aiTax");

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">{t("pageTitle")}</h1>
        <p className="text-muted-foreground mt-2">{t("pageSubtitle")}</p>
      </div>
      <TaxChat />
    </div>
  );
}
