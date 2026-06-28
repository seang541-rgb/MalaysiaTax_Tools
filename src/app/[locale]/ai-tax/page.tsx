import { useLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { AiTaxWorkspace } from "@/components/ai-tax-workspace";
import { PaidFeatureGate } from "@/components/paid-feature-gate";
import { TaxChat } from "@/components/tax-chat";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "aiTax" });
  return {
    title: t("pageTitle"),
    description: t("pageSubtitle"),
  };
}

function getWorkspaceCopy(locale: string) {
  if (locale === "zh") {
    return {
      prompts: [
        "\u6708\u85aa RM5000 \u8981\u4ea4\u591a\u5c11\u7a0e\uff1f",
        "\u516c\u53f8\u7a0e\u7387\u662f\u591a\u5c11\uff1f",
        "\u54ea\u4e9b business expenses \u4e0d\u80fd\u6263\u7a0e\uff1f",
        "\u4ec0\u4e48\u65f6\u5019\u9700\u8981\u6ce8\u518c SST\uff1f",
      ],
      credit: "\u6bcf\u6b21 AI \u56de\u7b54\u6263 1 credit",
      context: "Malaysia tax context",
      tools: "\u53ef\u8f6c\u53bb calculator",
      promptTitle: "\u53ef\u4ee5\u8fd9\u6837\u95ee",
      promptNote:
        "\u76f4\u63a5\u8f93\u5165\u95ee\u9898\u5373\u53ef\u3002Agent \u4f1a\u81ea\u52a8\u5224\u65ad\u7a0e\u52a1\u4e3b\u9898\uff0c\u53ea\u6709\u8d44\u6599\u4e0d\u8db3\u65f6\u624d\u8ffd\u95ee\u3002",
      contextPanelTitle: "\u7a0e\u52a1\u80cc\u666f",
      contextPanelNote:
        "\u4fdd\u7559\u65e7\u7248\u586b\u8868\u611f\uff1a\u9010\u9879\u586b\u5199\u3001\u6e05\u695a\u5206\u7ec4\uff0c\u4f46\u4e0d\u518d\u548c\u5bf9\u8bdd\u62a2\u4e3b\u89c6\u89c9\u3002",
      contextApplyLabel: "\u5957\u7528\u80cc\u666f",
      contextFields: [
        ["\u7eb3\u7a0e\u4eba\u7c7b\u578b", "Sdn Bhd / \u4e2a\u4eba"],
        ["\u4f30\u7a0e\u5e74", "YA 2025"],
        ["\u6536\u5165 / \u8425\u4e1a\u989d", "RM 0.00"],
        ["\u6263\u9664 / \u51cf\u514d", "\u65b0\u589e\u9879\u76ee"],
        ["\u6587\u4ef6", "\u4e0a\u4f20 / \u7c98\u8d34"],
      ] satisfies [string, string][],
    };
  }

  if (locale === "ms") {
    return {
      prompts: [
        "Berapa cukai untuk gaji RM5000?",
        "Apakah kadar cukai korporat?",
        "Perbelanjaan perniagaan mana tidak boleh ditolak?",
        "Bila perlu daftar SST?",
      ],
      credit: "1 credit setiap jawapan AI",
      context: "Konteks cukai Malaysia",
      tools: "Boleh buka kalkulator",
      promptTitle: "Cuba tanya",
      promptNote:
        "Tanya terus. Agent akan kenal pasti topik cukai dan hanya bertanya lanjut apabila maklumat tidak cukup.",
      contextPanelTitle: "Konteks cukai",
      contextPanelNote:
        "Kekalkan rasa borang lama: isi langkah demi langkah, berkelompok jelas, tetapi sebagai sokongan kepada chat.",
      contextApplyLabel: "Guna konteks",
      contextFields: [
        ["Jenis pembayar cukai", "Sdn Bhd / Individu"],
        ["Tahun taksiran", "YA 2025"],
        ["Pendapatan / hasil", "RM 0.00"],
        ["Pelepasan / potongan", "Tambah item"],
        ["Dokumen", "Muat naik / tampal"],
      ] satisfies [string, string][],
    };
  }

  return {
    prompts: [
      "How much tax for RM5000 salary?",
      "What is the corporate tax rate?",
      "What business expenses are not deductible?",
      "When do I need to register SST?",
    ],
    credit: "1 credit per AI answer",
    context: "Malaysia tax context",
    tools: "Can route to calculators",
    promptTitle: "Try asking",
    promptNote:
      "Ask directly. The agent detects the tax area and asks follow-up questions only when details are missing.",
    contextPanelTitle: "Tax Context",
    contextPanelNote:
      "Keep the old fill-in flow: step-by-step fields, clear grouping, and supporting context for the chat.",
    contextApplyLabel: "Apply context",
    contextFields: [
      ["Taxpayer type", "Sdn Bhd / Individual"],
      ["Year of assessment", "YA 2025"],
      ["Income / revenue", "RM 0.00"],
      ["Reliefs or deductions", "Add item"],
      ["Documents", "Upload / paste"],
    ] satisfies [string, string][],
  };
}

export default function AiTaxPage() {
  const t = useTranslations("aiTax");
  const locale = useLocale();
  const workspaceCopy = getWorkspaceCopy(locale);

  return (
    <AiTaxWorkspace
      title={t("pageTitle")}
      subtitle={t("pageSubtitle")}
      creditHint={workspaceCopy.credit}
      contextHint={workspaceCopy.context}
      toolHint={workspaceCopy.tools}
      promptTitle={workspaceCopy.promptTitle}
      promptNote={workspaceCopy.promptNote}
      contextPanelTitle={workspaceCopy.contextPanelTitle}
      contextPanelNote={workspaceCopy.contextPanelNote}
      contextApplyLabel={workspaceCopy.contextApplyLabel}
      contextFields={workspaceCopy.contextFields}
      prompts={workspaceCopy.prompts}
    >
      <PaidFeatureGate>
        <TaxChat />
      </PaidFeatureGate>
    </AiTaxWorkspace>
  );
}
