import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FaqSection, FaqItem } from "@/components/faq-section";

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
      <FaqSection title={faq("title")} items={faqItems} />
    </div>
  );
}
