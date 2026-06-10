/**
 * Withholding Tax (WHT) on payments to non-residents — Malaysia
 *
 * Verified against LHDN and PwC Malaysia (2025):
 *   https://www.hasil.gov.my/en/legislation/withholding-tax/
 *   https://taxsummaries.pwc.com/malaysia/corporate/withholding-taxes
 *
 * Standard rates (may be reduced by a Double Taxation Agreement):
 *   interest                       15%   (Form CP37)
 *   royalty                        10%   (Form CP37)
 *   special classes s4A            10%   (Form CP37D) — technical/advisory
 *                                          fees, services in Malaysia, rental
 *                                          of movable property, installation
 *   contract payment               10% + 3% (Form CP37A) — 10% on the
 *                                          contractor's account, 3% on the
 *                                          contractor's employees' account
 *   public entertainer             15%   (Form CP37E)
 *   section 4(f) other gains       10%   (Form CP37F)
 *
 * Remit to LHDN within 1 month of paying or crediting the non-resident.
 */

export type WhtPaymentType =
  | "interest"
  | "royalty"
  | "special_4a"
  | "contract"
  | "public_entertainer"
  | "other_4f";

export interface WhtInput {
  paymentType: WhtPaymentType;
  grossAmount: number;
  dtaRate?: number; // optional treaty rate override (percentage), single-component types only
}

export interface WhtComponent {
  label: string; // i18n key suffix
  rate: number;  // percentage
  amount: number;
}

export interface WhtResult {
  paymentType: WhtPaymentType;
  grossAmount: number;
  components: WhtComponent[];
  totalRate: number;       // percentage
  totalWht: number;
  netPayment: number;
  form: string;            // CP37 / CP37A / CP37D / CP37E / CP37F
  dtaApplied: boolean;
}

interface WhtRule {
  components: { label: string; rate: number }[];
  form: string;
  dtaAdjustable: boolean; // single-component treaty override supported
}

const WHT_RULES: Record<WhtPaymentType, WhtRule> = {
  interest: { components: [{ label: "main", rate: 0.15 }], form: "CP37", dtaAdjustable: true },
  royalty: { components: [{ label: "main", rate: 0.1 }], form: "CP37", dtaAdjustable: true },
  special_4a: { components: [{ label: "main", rate: 0.1 }], form: "CP37D", dtaAdjustable: true },
  contract: {
    components: [
      { label: "contractor", rate: 0.1 },
      { label: "employees", rate: 0.03 },
    ],
    form: "CP37A",
    dtaAdjustable: false,
  },
  public_entertainer: { components: [{ label: "main", rate: 0.15 }], form: "CP37E", dtaAdjustable: true },
  other_4f: { components: [{ label: "main", rate: 0.1 }], form: "CP37F", dtaAdjustable: true },
};

export function calculateWithholdingTax(input: WhtInput): WhtResult {
  const gross = Math.max(0, input.grossAmount);
  const rule = WHT_RULES[input.paymentType];

  const useDta =
    rule.dtaAdjustable &&
    input.dtaRate != null &&
    input.dtaRate >= 0 &&
    input.dtaRate < rule.components[0].rate * 100;

  const components: WhtComponent[] = rule.components.map((c, i) => {
    const ratePct = useDta && i === 0 ? input.dtaRate! : c.rate * 100;
    return {
      label: c.label,
      rate: ratePct,
      amount: Math.round(gross * (ratePct / 100) * 100) / 100,
    };
  });

  const totalWht = Math.round(components.reduce((s, c) => s + c.amount, 0) * 100) / 100;
  const totalRate = Math.round(components.reduce((s, c) => s + c.rate, 0) * 100) / 100;

  return {
    paymentType: input.paymentType,
    grossAmount: gross,
    components,
    totalRate,
    totalWht,
    netPayment: Math.round((gross - totalWht) * 100) / 100,
    form: rule.form,
    dtaApplied: useDta,
  };
}
