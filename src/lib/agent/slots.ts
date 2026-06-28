import type { ServiceTaxCategory } from "@/engine/types";

export function extractMoneyAmount(message: string): number | null {
  const normalized = message.replace(/,/g, "").replace(/\s+/g, " ");
  const match = normalized.match(
    /(?:RM|rm)?\s*(\d+(?:\.\d+)?)\s*(million|juta|m|k|K|ribu)?/i
  );
  if (!match) return null;

  let amount = Number.parseFloat(match[1]);
  const suffix = match[2]?.toLowerCase();

  if (suffix === "million" || suffix === "juta" || suffix === "m") {
    amount *= 1_000_000;
  } else if (suffix === "k" || suffix === "ribu") {
    amount *= 1_000;
  }

  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export function extractIncomeAmount(message: string): {
  annualIncome: number;
  isMonthly: boolean;
  monthlyAmount?: number;
} | null {
  const normalized = message.replace(/,/g, "").replace(/\s+/g, " ");
  const monthlyPattern =
    /(?:monthly|month|bulan|bulanan|gaji|salary|per month|sebulan)[^0-9]*(?:RM|rm)?\s*(\d+(?:\.\d+)?)\s*(k|K)?|(?:RM|rm)\s*(\d+(?:\.\d+)?)\s*(k|K)?\s*(?:per month|sebulan|\/month)/i;
  const annualPattern =
    /(?:annual|yearly|year|tahunan|tahun|per year|setahun|income|pendapatan)[^0-9]*(?:RM|rm)?\s*(\d+(?:\.\d+)?)\s*(k|K)?|(?:RM|rm)\s*(\d+(?:\.\d+)?)\s*(k|K)?/i;

  const monthlyMatch = normalized.match(monthlyPattern);
  if (monthlyMatch) {
    const raw = monthlyMatch[1] ?? monthlyMatch[3];
    const suffix = monthlyMatch[2] ?? monthlyMatch[4];
    let amount = Number.parseFloat(raw);
    if (suffix?.toLowerCase() === "k") amount *= 1_000;
    if (amount > 0 && amount < 200_000) {
      return {
        annualIncome: amount * 12,
        isMonthly: true,
        monthlyAmount: amount,
      };
    }
  }

  const annualMatch = normalized.match(annualPattern);
  if (!annualMatch) return null;

  const raw = annualMatch[1] ?? annualMatch[3];
  const suffix = annualMatch[2] ?? annualMatch[4];
  let amount = Number.parseFloat(raw);
  if (suffix?.toLowerCase() === "k") amount *= 1_000;
  if (amount < 1_000) return null;

  return {
    annualIncome: amount,
    isMonthly: false,
  };
}

export function inferSstTaxType(
  message: string
): "sales" | "service" | null {
  const lower = message.toLowerCase();
  if (/sales tax|cukai jualan/.test(lower)) return "sales";
  if (/service tax|cukai perkhidmatan|service/.test(lower)) return "service";
  return null;
}

export function inferServiceTaxCategory(
  message: string
): ServiceTaxCategory | undefined {
  const lower = message.toLowerCase();
  if (/f&b|food|beverage|restaurant|cafe|makan|minum/.test(lower)) return "fnb";
  if (/telecom|telco|phone|internet/.test(lower)) return "telecom";
  if (/parking/.test(lower)) return "parking";
  if (/logistic|delivery|freight|shipping/.test(lower)) return "logistics";
  if (/rental|lease|leasing|sewa/.test(lower)) return "rental";
  if (/construction|contractor|pembinaan/.test(lower)) return "construction";
  if (/financial|finance|commission|fee/.test(lower)) return "financial";
  if (/healthcare|clinic|hospital|medical/.test(lower)) return "healthcare";
  if (/education|school|tuition|university/.test(lower)) return "education";
  return "general";
}

