import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { FaqSection, FaqItem } from "@/components/faq-section";
import { ToolPageShell } from "@/components/tool-page-shell";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "property" });

  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default function PropertyPage() {
  const t = useTranslations("property");
  const faq = useTranslations("propertyFaq");
  const faqItems = faq.raw("items") as FaqItem[];

  const tools = [
    {
      href: "/rpgt-calculator" as const,
      title: t("tabRpgt"),
      desc: t("rpgtCardDesc"),
    },
    {
      href: "/stamp-duty" as const,
      title: t("tabStampDuty"),
      desc: t("stampDutyCardDesc"),
    },
  ];

  return (
    <ToolPageShell
      eyebrow="Property"
      title={t("title")}
      subtitle={t("hubIntro")}
      creditLabel="1 credit"
      resultTitle="Property workflow"
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
      <FaqSection title={faq("title")} items={faqItems} />
    </ToolPageShell>
  );
}
