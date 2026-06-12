import { BILLING_PACKS } from "@/lib/billing/plans";
import { CheckoutButton } from "./checkout-button";

export function PricingCards({
  locale,
  ctaLabel,
}: {
  locale: string;
  ctaLabel: string;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {BILLING_PACKS.map((pack) => (
        <section key={pack.id} className="rounded-lg border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold">{pack.name}</h2>
          <p className="mt-2 text-3xl font-bold">RM{pack.priceMyr}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {pack.credits} credits
          </p>
          <div className="mt-5">
            <CheckoutButton packId={pack.id} locale={locale} label={ctaLabel} />
          </div>
        </section>
      ))}
    </div>
  );
}
