import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { marked } from "marked";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO yyyy-mm-dd
  keywords: string[];
  locale: string;
}

export interface BlogPost extends BlogPostMeta {
  html: string;
}

function localeDir(locale: string): string {
  return path.join(BLOG_DIR, locale);
}

export function getAllPosts(locale: string): BlogPostMeta[] {
  const dir = localeDir(locale);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(dir, file), "utf-8");
      const { data } = matter(raw);
      return {
        slug: file.replace(/\.md$/, ""),
        title: data.title ?? "",
        description: data.description ?? "",
        date: data.date ?? "",
        keywords: data.keywords ?? [],
        locale,
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPost(locale: string, slug: string): BlogPost | null {
  const file = path.join(localeDir(locale), `${slug}.md`);
  if (!fs.existsSync(file)) return null;

  const raw = fs.readFileSync(file, "utf-8");
  const { data, content } = matter(raw);
  const html = marked.parse(content, { async: false }) as string;

  return {
    slug,
    title: data.title ?? "",
    description: data.description ?? "",
    date: data.date ?? "",
    keywords: data.keywords ?? [],
    locale,
    html,
  };
}

export function getAllSlugs(): { locale: string; slug: string }[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  const out: { locale: string; slug: string }[] = [];
  for (const locale of fs.readdirSync(BLOG_DIR)) {
    const dir = localeDir(locale);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith(".md")) out.push({ locale, slug: f.replace(/\.md$/, "") });
    }
  }
  return out;
}
