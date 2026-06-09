import type { MetadataRoute } from "next";

const BASE_URL = "https://mytax.my";

const locales = ["en", "zh", "ms"];

const pages = [
  { path: "", priority: 1.0, changeFrequency: "monthly" as const },
  { path: "/corporate", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/batch-pcb", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/employer", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/sst", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/e-invoice", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/corporate-tools", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/ai-tax", priority: 0.7, changeFrequency: "weekly" as const },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const page of pages) {
    for (const locale of locales) {
      entries.push({
        url: `${BASE_URL}/${locale}${page.path}`,
        lastModified: new Date(),
        changeFrequency: page.changeFrequency,
        priority: page.priority,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${BASE_URL}/${l}${page.path}`])
          ),
        },
      });
    }
  }

  return entries;
}
