import { billingErrorResponse } from "@/lib/billing/errors";
import { getBillingPack } from "@/lib/billing/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type Stripe from "stripe";

const SUPPORTED_LOCALES = new Set(["en", "zh", "ms"]);

function safeLocale(value: unknown): string {
  return typeof value === "string" && SUPPORTED_LOCALES.has(value)
    ? value
    : "en";
}

function isMissingStripeResourceError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const candidate = error as { code?: unknown; type?: unknown };
  return (
    candidate.type === "StripeInvalidRequestError" &&
    candidate.code === "resource_missing"
  );
}

async function canReuseStripeCustomer(
  stripe: Stripe,
  customerId: string | null
): Promise<boolean> {
  if (!customerId) return false;

  try {
    const customer = await stripe.customers.retrieve(customerId);
    return !("deleted" in customer && customer.deleted);
  } catch (error) {
    if (isMissingStripeResourceError(error)) return false;
    throw error;
  }
}

function shouldPersistNewCustomer(hasStoredCustomer: boolean): boolean {
  if (!hasStoredCustomer) return true;
  return !process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_");
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return billingErrorResponse(
      "AUTH_REQUIRED",
      401,
      "Please sign in to buy credits."
    );
  }

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  if (!body) {
    return billingErrorResponse("INVALID_PACK", 400, "Invalid checkout request.");
  }

  const { packId, returnTo } = body;
  const locale = safeLocale(body.locale);
  const pack = getBillingPack(String(packId));

  if (!pack) {
    return billingErrorResponse("INVALID_PACK", 400, "Unknown credit pack.");
  }

  const priceId = process.env[pack.stripePriceEnv];
  if (!priceId) {
    return billingErrorResponse(
      "CHECKOUT_UNAVAILABLE",
      503,
      "This credit pack is not configured yet."
    );
  }

  const [{ createSupabaseAdminClient }, { createStripeClient }] =
    await Promise.all([
      import("@/lib/supabase/admin"),
      import("@/lib/stripe"),
    ]);

  const requestUrl = new URL(request.url);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? requestUrl.origin;
  const admin = createSupabaseAdminClient();
  const stripe = createStripeClient();

  const { data: profile, error } = await admin
    .from("profiles")
    .select("stripe_customer_id,email")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const storedCustomerId =
    typeof profile?.stripe_customer_id === "string"
      ? profile.stripe_customer_id
      : null;
  const canReuseCustomer = await canReuseStripeCustomer(stripe, storedCustomerId);
  let customerId = canReuseCustomer ? storedCustomerId : null;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;

    if (shouldPersistNewCustomer(Boolean(storedCustomerId))) {
      const { error: upsertError } = await admin.from("profiles").upsert({
        id: user.id,
        email: user.email,
        stripe_customer_id: customerId,
      });

      if (upsertError) throw new Error(upsertError.message);
    }
  }

  const successUrl = new URL(`/${locale}/billing/success`, appUrl);
  successUrl.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
  if (returnTo) successUrl.searchParams.set("return_to", String(returnTo));

  const cancelUrl = new URL(`/${locale}/pricing`, appUrl);
  cancelUrl.searchParams.set("cancelled", "1");

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl.toString(),
    cancel_url: cancelUrl.toString(),
    metadata: {
      user_id: user.id,
      pack_id: pack.id,
      credits: String(pack.credits),
    },
  });

  return Response.json({ url: session.url });
}
