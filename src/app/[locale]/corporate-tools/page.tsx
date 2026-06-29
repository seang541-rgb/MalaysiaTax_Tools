import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ToolPageShell } from "@/components/tool-page-shell";

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
    <ToolPageShell
      eyebrow="Corporate Tools"
      title={t("title")}
      subtitle={t("hubIntro")}
      creditLabel="1 credit"
      resultTitle="Tool workflow"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {tools.map((tool) => (
          <Link key={tool.href} href={tool.href} className="group">
            <div className="h-full rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-emerald-200 hover:shadow-md">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-zinc-950">
                  {tool.title}
                </h2>
                <ArrowRight className="h-4 w-4 shrink-0 text-zinc-500 transition-transform group-hover:translate-x-1" />
              </div>
              <p className="mt-3 text-sm leading-6 text-zinc-600">
                {tool.desc}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </ToolPageShell>
  );
}
