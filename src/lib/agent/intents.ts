import type { AgentToolName } from "./types";

export function detectAgentTool(message: string): AgentToolName | null {
  const lower = message.toLowerCase();

  if (/e-?invoice|myinvois/.test(lower)) {
    return "e_invoice_phase_checker";
  }

  if (/sst|sales tax|service tax|cukai jualan|cukai perkhidmatan/.test(lower)) {
    return "sst_checker";
  }

  if (
    /joint\s+assessment|separate\s+assessment|joint\s+vs\s+separate|spouse\s+1|spouse\s+2|husband.*wife|wife.*husband/.test(
      lower
    )
  ) {
    return "joint_assessment_calculator";
  }

  if (
    /batch|payroll|multiple\s+employees|employee\s+list|staff\s+list/.test(
      lower
    ) &&
    /pcb|mtd|monthly\s+tax\s+deduction|potongan\s+cukai\s+bulanan/.test(lower)
  ) {
    return "batch_pcb_calculator";
  }

  if (
    /pcb|mtd|monthly\s+tax\s+deduction|potongan\s+cukai\s+bulanan|monthly\s+deduction|预扣税|每月扣税/.test(
      lower
    )
  ) {
    return "pcb_calculator";
  }

  if (
    /employer\s+contribution|employer\s+cost|statutory\s+contribution|epf|kwsp|socso|perkeso|eis|sip|公积金|社险|就业保险/.test(
      lower
    )
  ) {
    return "employer_contribution_calculator";
  }

  if (
    /stamp\s+duty|mot\b|memorandum\s+of\s+transfer|loan\s+agreement\s+duty|property\s+price|buying\s+(?:a\s+)?(?:house|property)|buy\s+(?:a\s+)?(?:house|property)/.test(
      lower
    )
  ) {
    return "stamp_duty_calculator";
  }

  if (
    /withholding\s+tax|\bwht\b|non[-\s]?resident|royalt(?:y|ies)|technical\s+fee|contract\s+payment|public\s+entertainer|dta\s+rate/.test(
      lower
    )
  ) {
    return "withholding_tax_calculator";
  }

  if (/cp204|cp204a|cp207|estimated\s+tax|tax\s+estimate/.test(lower)) {
    return "cp204_calculator";
  }

  if (
    /tax\s+computation|profit\s+before\s+tax|\bpbt\b|chargeable\s+income\s+worksheet/.test(
      lower
    )
  ) {
    return "tax_computation_calculator";
  }

  if (
    /sole\s+proprietor|sole\s+proprietorship|self[-\s]?employed|business\s+revenue|business\s+income|form\s+b/.test(
      lower
    )
  ) {
    return "sole_proprietor_tax_calculator";
  }

  if (
    /capital\s+allowance|allowance\s+schedule|qualifying\s+expenditure|asset\s+cost|ict\s+equipment|motor\s+vehicle|plant\s+(?:and|&)\s+machinery|industrial\s+building/.test(
      lower
    )
  ) {
    return "capital_allowance_calculator";
  }

  if (
    /rpgt|real\s+property\s+gains\s+tax|property\s+gains\s+tax|sold\s+(?:a\s+)?property|sell\s+(?:a\s+)?property|selling\s+(?:my\s+)?property|dispose\s+(?:of\s+)?property|disposal\s+price/.test(
      lower
    )
  ) {
    return "rpgt_calculator";
  }

  if (
    /company|corporate|sdn\.?\s?bhd|cukai korporat|company tax|corporate tax|chargeable income|sme/.test(
      lower
    )
  ) {
    return "corporate_tax_calculator";
  }

  const personalSignal =
    /personal|individual|income tax|salary|monthly|gaji|pendapatan|tax payable|how much tax/.test(
      lower
    );
  const otherToolSignal =
    /company|corporate|sdn|sst|sales tax|service tax|e-?invoice|myinvois|rpgt|property|employer|epf|socso|eis|cp204|sole proprietor|self[- ]?employed/.test(
      lower
    );

  if (personalSignal && !otherToolSignal) {
    return "personal_tax_calculator";
  }

  return null;
}
