"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export interface FaqItem {
  q: string;
  a: string;
}

/**
 * Visible FAQ accordion + FAQPage JSON-LD.
 * Google requires the FAQ content to be visible on the page to be eligible
 * for rich results, so the same items drive both the UI and the structured data.
 */
export function FaqSection({
  title,
  items,
}: {
  title: string;
  items: FaqItem[];
}) {
  const [open, setOpen] = useState<number | null>(null);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };

  return (
    <section className="my-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      <div className="rounded-lg border bg-card divide-y">
        {items.map((it, i) => {
          const expanded = open === i;
          return (
            <div key={i}>
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : i)}
                aria-expanded={expanded}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium hover:bg-muted/40 transition-colors"
              >
                <span>{it.q}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
              {expanded && (
                <p className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">
                  {it.a}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
