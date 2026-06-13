import { Info } from "lucide-react";
import { BILLING_PACKS } from "@/lib/billing/plans";
import { CheckoutButton } from "./checkout-button";

export function PricingCards({
  locale,
  ctaLabel,
  checkoutNotice,
  disclaimerHref,
  disclaimerLabel,
}: {
  locale: string;
  ctaLabel: string;
  checkoutNotice?: string;
  disclaimerHref?: string;
  disclaimerLabel?: string;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {BILLING_PACKS.map((pack) => (
        <section
          key={pack.id}
          className="rounded-lg border bg-card p-5 shadow-sm flex flex-col"
        >
          <h2 className="text-lg font-semibold">{pack.name}</h2>
          <p className="mt-2 text-3xl font-bold">RM{pack.priceMyr}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {pack.credits} credits
          </p>
          {checkoutNotice && (
            <div className="mt-4 flex items-start gap-2 text-[11px] text-muted-foreground leading-relaxed">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
              <p className="m-0">
                {checkoutNotice}
                {disclaimerHref && disclaimerLabel && (
                  <>
                    {" "}
                    <a
                      href={disclaimerHref}
                      className="underline hover:text-foreground"
                    >
                      {disclaimerLabel}
                    </a>
                  </>
                )}
              </p>
            </div>
          )}
          <div className="mt-5">
            <CheckoutButton packId={pack.id} locale={locale} label={ctaLabel} />
          </div>
        </section>
      ))}
    </div>
  );
}
