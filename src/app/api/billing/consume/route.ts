import {
  consumeCredits,
  InsufficientCreditsError,
} from "@/lib/billing/credits";
import { billingErrorResponse } from "@/lib/billing/errors";
import {
  BILLING_FEATURE_COSTS,
  BillingFeature,
} from "@/lib/billing/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const CLIENT_CONSUMABLE_FEATURES = new Set<BillingFeature>([
  "corporate_tax_calculation",
  "sst_calculation",
  "employer_obligations_calculation",
  "property_calculation",
  "einvoice_check",
  "batch_pcb_run",
  "corporate_tools_run",
]);

function isClientConsumableFeature(value: unknown): value is BillingFeature {
  return (
    typeof value === "string" &&
    CLIENT_CONSUMABLE_FEATURES.has(value as BillingFeature)
  );
}

function getRequestSummary(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return billingErrorResponse("AUTH_REQUIRED", 401, "Please sign in.");
  }

  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  if (!isClientConsumableFeature(body.feature)) {
    return billingErrorResponse(
      "INVALID_FEATURE",
      400,
      "This feature cannot be charged from the client."
    );
  }

  const amount = BILLING_FEATURE_COSTS[body.feature];

  try {
    const result = await consumeCredits({
      userId: user.id,
      feature: body.feature,
      amount,
      requestSummary: getRequestSummary(body.requestSummary),
    });

    return Response.json({
      balance: result.balance,
      chargedCredits: amount,
    });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return billingErrorResponse(
        "INSUFFICIENT_CREDITS",
        402,
        "Not enough credits for this tool.",
        {
          balance: error.balance,
          requiredCredits: error.required,
        }
      );
    }

    throw error;
  }
}
