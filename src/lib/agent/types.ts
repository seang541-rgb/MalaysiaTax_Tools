export type AgentToolName =
  | "personal_tax_calculator"
  | "e_invoice_phase_checker"
  | "sst_checker"
  | "corporate_tax_calculator"
  | "employer_contribution_calculator"
  | "pcb_calculator"
  | "rpgt_calculator"
  | "stamp_duty_calculator"
  | "withholding_tax_calculator"
  | "cp204_calculator"
  | "capital_allowance_calculator"
  | "sole_proprietor_tax_calculator"
  | "tax_computation_calculator"
  | "joint_assessment_calculator"
  | "batch_pcb_calculator";

export interface MissingField {
  field: string;
  question: string;
}

export interface AgentContextResult {
  toolName: AgentToolName | null;
  context: string;
  needsFollowUp: boolean;
  followUpQuestion: string | null;
  missingFields: MissingField[];
  usedDeterministic: boolean;
  calculatorLabel: string | null;
  calculatorPath: string | null;
}
