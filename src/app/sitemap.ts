import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";
import { SITE_URL as BASE_URL } from "@/lib/site";

const locales = ["en", "zh", "ms"];
const hasGitMetadata = existsSync(".git");

/**
 * Last commit date for a source file, used as a truthful `lastModified`.
 * Returns null on any failure (e.g. a shallow clone without enough history),
 * so callers can omit the field rather than emit a misleading build-day date.
 */
function gitLastModified(file: string): Date | null {
  if (!hasGitMetadata) return null;

  try {
    const iso = execFileSync("git", ["log", "-1", "--format=%cI", "--", file], {
      encoding: "utf8",
    }).trim();
    if (!iso) return null;
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/** Source file backing a static page path, e.g. "/sst" -> its page.tsx. */
function pageSourceFile(path: string): string {
  return `src/app/[locale]${path}/page.tsx`;
}

const pages = [
  { path: "", priority: 1.0, changeFrequency: "monthly" as const },
  { path: "/joint-vs-separate-assessment", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/corporate", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/batch-pcb", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/employer", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/sst", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/property", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/rpgt-calculator", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/stamp-duty", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/e-invoice", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/corporate-tools", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/tax-computation-calculator", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/sole-proprietor-tax-calculator", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/cp204-calculator", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/capital-allowance-calculator", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/withholding-tax-calculator", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/tax-incentives", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/ai-tax", priority: 0.7, changeFrequency: "weekly" as const },
  { path: "/pricing", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/blog", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/disclaimer", priority: 0.3, changeFrequency: "yearly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const page of pages) {
    // Same source file backs every locale of a path, so resolve the date once.
    const lastModified = gitLastModified(pageSourceFile(page.path)) ?? undefined;
    for (const locale of locales) {
      entries.push({
        url: `${BASE_URL}/${locale}${page.path}`,
        ...(lastModified ? { lastModified } : {}),
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

  // Blog articles — emit only (slug, locale) pairs that actually exist, using
  // each post's frontmatter date. Languages map alternates only to locales that
  // have the post, avoiding dead links for partially-translated articles.
  const slugLocales = new Map<string, string[]>();
  const postDates = new Map<string, string>(); // `${locale}/${slug}` -> ISO date
  for (const locale of locales) {
    for (const post of getAllPosts(locale)) {
      slugLocales.set(post.slug, [...(slugLocales.get(post.slug) ?? []), locale]);
      if (post.date) postDates.set(`${locale}/${post.slug}`, post.date);
    }
  }

  for (const [slug, availableLocales] of slugLocales) {
    for (const locale of availableLocales) {
      const iso = postDates.get(`${locale}/${slug}`);
      const lastModified = iso ? new Date(iso) : null;
      entries.push({
        url: `${BASE_URL}/${locale}/blog/${slug}`,
        ...(lastModified && !Number.isNaN(lastModified.getTime())
          ? { lastModified }
          : {}),
        changeFrequency: "monthly",
        priority: 0.7,
        alternates: {
          languages: Object.fromEntries(
            availableLocales.map((l) => [l, `${BASE_URL}/${l}/blog/${slug}`])
          ),
        },
      });
    }
  }

  return entries;
}
