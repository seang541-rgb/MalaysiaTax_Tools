import { ReliefDefinition } from "./types";

// YA2025 relief caps verified against LHDN BE2025 notes, TP1 2025 notes,
// Public Ruling 7/2025, and LHDN tax relief guidance.
export const TAX_RELIEFS_YA2025: ReliefDefinition[] = [
  { id: "individual", maxAmount: 9000, category: "personal" },
  { id: "disabled_individual", maxAmount: 7000, category: "personal" },
  { id: "spouse", maxAmount: 4000, category: "family" },
  { id: "disabled_spouse", maxAmount: 6000, category: "family" },
  { id: "child_under_18", maxAmount: 2000, category: "family" },
  { id: "child_18_plus_studying", maxAmount: 8000, category: "family" },
  { id: "disabled_child", maxAmount: 8000, category: "family" },
  { id: "disabled_child_studying", maxAmount: 14000, category: "family" },
  { id: "medical_serious_disease", maxAmount: 10000, category: "medical" },
  { id: "medical_fertility", maxAmount: 10000, category: "medical" },
  { id: "medical_examination", maxAmount: 1000, category: "medical" },
  { id: "medical_vaccination", maxAmount: 1000, category: "medical" },
  { id: "dental_examination", maxAmount: 1000, category: "medical" },
  { id: "mental_health", maxAmount: 1000, category: "medical" },
  { id: "education_self", maxAmount: 7000, category: "education" },
  { id: "upskilling", maxAmount: 2000, category: "education" },
  { id: "lifestyle", maxAmount: 2500, category: "lifestyle" },
  { id: "lifestyle_sports", maxAmount: 1000, category: "lifestyle" },
  { id: "ev_charging", maxAmount: 2500, category: "lifestyle" },
  { id: "epf_employee", maxAmount: 4000, category: "contribution" },
  { id: "life_insurance", maxAmount: 3000, category: "contribution" },
  { id: "education_medical_insurance", maxAmount: 4000, category: "contribution" },
  { id: "socso_eis", maxAmount: 350, category: "contribution" },
  { id: "prs_annuity", maxAmount: 3000, category: "contribution" },
  { id: "sspn", maxAmount: 8000, category: "contribution" },
  { id: "housing_loan_interest", maxAmount: 7000, category: "housing" },
  { id: "childcare_fees", maxAmount: 3000, category: "family" },
  { id: "breastfeeding_equipment", maxAmount: 1000, category: "family" },
  { id: "parents_medical", maxAmount: 8000, category: "medical" },
];

export interface ReliefRuleSet {
  yearOfAssessment: number;
  requestedYearOfAssessment: number;
  reliefs: ReliefDefinition[];
  reviewed: string;
  sources: string[];
}

const RELIEF_RULE_SETS: Record<
  number,
  Omit<ReliefRuleSet, "requestedYearOfAssessment">
> = {
  2025: {
    yearOfAssessment: 2025,
    reliefs: TAX_RELIEFS_YA2025,
    reviewed: "2026-06",
    sources: [
      "LHDN BE2025 explanatory notes",
      "LHDN TP1 2025 notes",
      "LHDN Public Ruling 7/2025",
      "LHDN tax relief guidance",
    ],
  },
};

export function getReliefRuleSet(yearOfAssessment: number): ReliefRuleSet {
  const exact = RELIEF_RULE_SETS[yearOfAssessment];
  const selected = exact ?? RELIEF_RULE_SETS[2025];

  return {
    ...selected,
    requestedYearOfAssessment: yearOfAssessment,
  };
}

export function getReliefDefinitions(
  yearOfAssessment: number
): ReliefDefinition[] {
  return getReliefRuleSet(yearOfAssessment).reliefs;
}
