export type AgentToolName =
  | "personal_tax_calculator"
  | "e_invoice_phase_checker"
  | "sst_checker"
  | "corporate_tax_calculator"
  | "employer_contribution_calculator";

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
}
