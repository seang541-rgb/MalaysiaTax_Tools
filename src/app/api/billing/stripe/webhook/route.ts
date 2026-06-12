import type Stripe from "stripe";
import { grantCredits } from "@/lib/billing/credits";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return Response.json({ error: "Webhook is not configured." }, { status: 400 });
  }

  const [{ createSupabaseAdminClient }, { createStripeClient }] =
    await Promise.all([
      import("@/lib/supabase/admin"),
      import("@/lib/stripe"),
    ]);

  const stripe = createStripeClient();
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return Response.json(
      { error: { code: "WEBHOOK_SIGNATURE_INVALID" } },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdminClient();
  const { data: existing } = await admin
    .from("stripe_events")
    .select("id")
    .eq("id", event.id)
    .maybeSingle();

  if (existing) {
    return Response.json({ received: true, duplicate: true });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const credits = Number(session.metadata?.credits ?? 0);

    if (session.payment_status !== "paid" || !userId || credits <= 0) {
      return Response.json(
        { error: { code: "PAYMENT_NOT_CONFIRMED" } },
        { status: 400 }
      );
    }

    await grantCredits({
      userId,
      amount: credits,
      stripeSessionId: session.id,
      stripeEventId: event.id,
      metadata: {
        pack_id: session.metadata?.pack_id,
        amount_total: session.amount_total,
        currency: session.currency,
      },
    });
  }

  await admin.from("stripe_events").insert({
    id: event.id,
    type: event.type,
    payload: event as unknown as Record<string, unknown>,
  });

  return Response.json({ received: true });
}
