import { CheckCircle2, Info } from "lucide-react";
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
      {BILLING_PACKS.map((pack) => {
        const recommended = pack.id === "pro";

        return (
          <section
            key={pack.id}
            className={`flex flex-col rounded-lg border bg-white p-5 shadow-sm ${
              recommended
                ? "border-emerald-300 ring-2 ring-emerald-100"
                : "border-zinc-200"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-zinc-950">
                  {pack.name}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {pack.credits} credits
                </p>
              </div>
              {recommended && (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  Best value
                </span>
              )}
            </div>
            <p className="mt-5 text-3xl font-semibold text-zinc-950">
              RM{pack.priceMyr}
            </p>
            <div className="mt-5 space-y-3 text-sm text-zinc-600">
              <div className="flex gap-2">
                <CheckCircle2
                  className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
                  aria-hidden="true"
                />
                <span>{recommended ? "Credits stay visible before each paid tool." : "One-time credits for calculator workflows."}</span>
              </div>
              {recommended && (
                <div className="flex gap-2">
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
                    aria-hidden="true"
                  />
                  <span>No subscription lock-in</span>
                </div>
              )}
            </div>
            {checkoutNotice && (
              <div className="mt-5 flex items-start gap-2 rounded-md bg-zinc-50 p-3 text-[11px] leading-relaxed text-zinc-500">
                <Info
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <p className="m-0">
                  {checkoutNotice}
                  {disclaimerHref && disclaimerLabel && (
                    <>
                      {" "}
                      <a
                        href={disclaimerHref}
                        className="underline hover:text-zinc-950"
                      >
                        {disclaimerLabel}
                      </a>
                    </>
                  )}
                </p>
              </div>
            )}
            <div className="mt-auto pt-5">
              <CheckoutButton
                packId={pack.id}
                locale={locale}
                label={ctaLabel}
              />
            </div>
          </section>
        );
      })}
    </div>
  );
}
