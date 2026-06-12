export type BillingPackId = "starter" | "pro" | "business";

export interface BillingPack {
  id: BillingPackId;
  name: string;
  priceMyr: number;
  credits: number;
  stripePriceEnv: string;
}

export const BILLING_PACKS: BillingPack[] = [
  {
    id: "starter",
    name: "Starter",
    priceMyr: 9,
    credits: 10,
    stripePriceEnv: "STRIPE_PRICE_STARTER",
  },
  {
    id: "pro",
    name: "Pro",
    priceMyr: 29,
    credits: 40,
    stripePriceEnv: "STRIPE_PRICE_PRO",
  },
  {
    id: "business",
    name: "Business",
    priceMyr: 79,
    credits: 120,
    stripePriceEnv: "STRIPE_PRICE_BUSINESS",
  },
];

export const BILLING_FEATURE_COSTS = {
  ai_tax_question: 1,
  corporate_tax_calculation: 2,
  sst_calculation: 2,
  employer_obligations_calculation: 2,
  property_calculation: 2,
  batch_pcb_run: 5,
  corporate_tools_run: 5,
} as const;

export type BillingFeature = keyof typeof BILLING_FEATURE_COSTS;

export function getBillingPack(packId: string): BillingPack | null {
  return BILLING_PACKS.find((pack) => pack.id === packId) ?? null;
}

export function getStripePriceEnvName(packId: string): string | null {
  return getBillingPack(packId)?.stripePriceEnv ?? null;
}
