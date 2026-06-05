import { PcbEstimate } from "./types";
import { calculatePersonalTax } from "./personal";

export interface PcbInput {
  yearOfAssessment: number;
  monthlyGrossSalary: number;
  maritalStatus: "single" | "married";
  spouseHasIncome: boolean;
  numberOfChildren: number;
}

export function estimateMonthlyPcb(input: PcbInput): PcbEstimate {
  const annualIncome = input.monthlyGrossSalary * 12;

  const reliefs = [{ reliefId: "individual", amount: 9000 }];

  if (input.maritalStatus === "married" && !input.spouseHasIncome) {
    reliefs.push({ reliefId: "spouse", amount: 4000 });
  }

  for (let i = 0; i < input.numberOfChildren; i++) {
    reliefs.push({ reliefId: "child_under_18", amount: 2000 });
  }

  const epfAnnual = Math.min(annualIncome * 0.11, 4000);
  reliefs.push({ reliefId: "epf_employee", amount: epfAnnual });
  reliefs.push({ reliefId: "socso_eis", amount: 350 });

  const taxResult = calculatePersonalTax({
    yearOfAssessment: input.yearOfAssessment,
    income: {
      employment: annualIncome,
      commission: 0,
      rental: 0,
      interest: 0,
      dividend: 0,
      other: 0,
    },
    reliefs,
    maritalStatus: input.maritalStatus,
    spouseHasIncome: input.spouseHasIncome,
    zakatAmount: 0,
    monthlyPcbPaid: 0,
  });

  const annualTax = taxResult.taxAfterRebateAndZakat;
  const monthlyPcb = Math.round((annualTax / 12) * 100) / 100;
  const annualPcb = Math.round(monthlyPcb * 12 * 100) / 100;

  return {
    monthlyPcb,
    annualPcb,
    annualTax,
    difference: Math.round((annualTax - annualPcb) * 100) / 100,
  };
}
