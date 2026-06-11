import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getPost, getAllSlugs } from "@/lib/blog";
import { ArrowLeft, CalendarDays } from "lucide-react";

import { SITE_URL as BASE_URL } from "@/lib/site";

export function generateStaticParams() {
  return getAllSlugs().map(({ locale, slug }) => ({ locale, slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const post = getPost(locale, slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    alternates: {
      canonical: `${BASE_URL}/${locale}/blog/${slug}`,
      languages: Object.fromEntries(
        ["en", "zh", "ms"].map((l) => [l, `${BASE_URL}/${l}/blog/${slug}`])
      ),
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const post = getPost(locale, slug);
  if (!post) notFound();

  const t = await getTranslations({ locale, namespace: "blog" });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    inLanguage: locale,
    author: { "@type": "Organization", name: "MYTax" },
    publisher: { "@type": "Organization", name: "MYTax" },
    mainEntityOfPage: `${BASE_URL}/${locale}/blog/${slug}`,
  };

  return (
    <div className="max-w-3xl mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToList")}
      </Link>

      <article>
        <h1 className="text-2xl md:text-3xl font-bold mb-3">{post.title}</h1>
        <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground mb-8">
          <CalendarDays className="h-4 w-4" />
          {post.date}
        </p>
        <div
          className="blog-content"
          dangerouslySetInnerHTML={{ __html: post.html }}
        />
      </article>

      <div className="mt-10 border rounded-lg p-5 bg-primary/5">
        <p className="text-sm font-medium mb-1">{t("ctaTitle")}</p>
        <p className="text-sm text-muted-foreground mb-3">{t("ctaDesc")}</p>
        <Link
          href="/"
          className="inline-flex items-center text-sm font-medium text-primary hover:underline"
        >
          {t("ctaButton")} →
        </Link>
      </div>

      <p className="mt-8 text-xs text-muted-foreground">{t("disclaimer")}</p>
    </div>
  );
}
