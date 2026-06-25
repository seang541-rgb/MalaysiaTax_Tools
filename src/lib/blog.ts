import fs from "fs";
import path from "path";
import { marked } from "marked";
import { parse as parseYaml } from "yaml";

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

const MAX_FRONTMATTER_LENGTH = 16_384;

function localeDir(locale: string): string {
  return path.join(BLOG_DIR, locale);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function stringArrayValue(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function parseMarkdown(raw: string): { data: BlogPostMeta; content: string } {
  if (!raw.startsWith("---\n") && !raw.startsWith("---\r\n")) {
    return {
      data: {
        slug: "",
        title: "",
        description: "",
        date: "",
        keywords: [],
        locale: "",
      },
      content: raw,
    };
  }

  const firstLineEnd = raw.indexOf("\n");
  const closingMarker = raw.indexOf("\n---", firstLineEnd + 1);
  if (closingMarker === -1) {
    throw new Error("Blog post frontmatter is missing a closing marker.");
  }

  const frontmatter = raw
    .slice(firstLineEnd + 1, closingMarker)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  if (frontmatter.length > MAX_FRONTMATTER_LENGTH) {
    throw new Error("Blog post frontmatter is too large.");
  }

  const afterMarker = raw.indexOf("\n", closingMarker + 1);
  const parsed = parseYaml(frontmatter);
  const data =
    typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {};

  return {
    data: {
      slug: "",
      title: stringValue(data.title),
      description: stringValue(data.description),
      date: stringValue(data.date),
      keywords: stringArrayValue(data.keywords),
      locale: "",
    },
    content: afterMarker === -1 ? "" : raw.slice(afterMarker + 1),
  };
}

export function getAllPosts(locale: string): BlogPostMeta[] {
  const dir = localeDir(locale);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(dir, file), "utf-8");
      const { data } = parseMarkdown(raw);
      return {
        slug: file.replace(/\.md$/, ""),
        title: data.title,
        description: data.description,
        date: data.date,
        keywords: data.keywords,
        locale,
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPost(locale: string, slug: string): BlogPost | null {
  const file = path.join(localeDir(locale), `${slug}.md`);
  if (!fs.existsSync(file)) return null;

  const raw = fs.readFileSync(file, "utf-8");
  const { data, content } = parseMarkdown(raw);
  const html = marked.parse(content, { async: false }) as string;

  return {
    slug,
    title: data.title,
    description: data.description,
    date: data.date,
    keywords: data.keywords,
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
