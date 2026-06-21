import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "corptools" });

  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default function CorporateToolsPage() {
  const t = useTranslations("corptools");

  const tools = [
    { href: "/tax-computation-calculator" as const, title: t("tabTaxcomp"), desc: t("descTaxcomp") },
    { href: "/sole-proprietor-tax-calculator" as const, title: t("tabSoleprop"), desc: t("descSoleprop") },
    { href: "/cp204-calculator" as const, title: t("tabCp204"), desc: t("descCp204") },
    { href: "/capital-allowance-calculator" as const, title: t("tabCapalw"), desc: t("descCapalw") },
    { href: "/withholding-tax-calculator" as const, title: t("tabWht"), desc: t("descWht") },
    { href: "/tax-incentives" as const, title: t("tabIncentives"), desc: t("descIncentives") },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold mb-2">{t("title")}</h1>
        <p className="text-muted-foreground">{t("hubIntro")}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {tools.map((tool) => (
          <Link key={tool.href} href={tool.href} className="group">
            <Card className="h-full transition-colors hover:border-primary">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  {tool.title}
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {tool.desc}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
