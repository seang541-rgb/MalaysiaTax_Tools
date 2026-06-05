import { ReliefDefinition } from "./types";

export const TAX_RELIEFS_YA2025: ReliefDefinition[] = [
  { id: "individual", maxAmount: 9000, category: "personal" },
  { id: "disabled_individual", maxAmount: 6000, category: "personal" },
  { id: "spouse", maxAmount: 4000, category: "family" },
  { id: "disabled_spouse", maxAmount: 5000, category: "family" },
  { id: "child_under_18", maxAmount: 2000, category: "family" },
  { id: "child_18_plus_studying", maxAmount: 8000, category: "family" },
  { id: "disabled_child", maxAmount: 6000, category: "family" },
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
  { id: "education_medical_insurance", maxAmount: 3000, category: "contribution" },
  { id: "socso_eis", maxAmount: 350, category: "contribution" },
  { id: "prs_annuity", maxAmount: 3000, category: "contribution" },
  { id: "sspn", maxAmount: 8000, category: "contribution" },
  { id: "housing_loan_interest", maxAmount: 7000, category: "housing" },
  { id: "childcare_fees", maxAmount: 3000, category: "family" },
  { id: "breastfeeding_equipment", maxAmount: 1000, category: "family" },
  { id: "parents_medical", maxAmount: 8000, category: "medical" },
];

export function getReliefDefinitions(yearOfAssessment: number): ReliefDefinition[] {
  if (yearOfAssessment === 2025) {
    return TAX_RELIEFS_YA2025;
  }
  return TAX_RELIEFS_YA2025;
}
