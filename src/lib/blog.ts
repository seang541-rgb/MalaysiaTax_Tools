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

function localeDir(locale: string): string {
  return path.join(BLOG_DIR, locale);
}

function emptyMeta(): BlogPostMeta {
  return {
    slug: "",
    title: "",
    description: "",
    date: "",
    keywords: [],
    locale: "",
  };
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
  const source = raw.startsWith("\uFEFF") ? raw.slice(1) : raw;
  const firstLineEnd = source.indexOf("\n");
  if (firstLineEnd === -1) {
    return { data: emptyMeta(), content: raw };
  }

  const openingLine = source.slice(0, firstLineEnd).replace(/\r$/, "");
  if (openingLine !== "---") {
    return { data: emptyMeta(), content: raw };
  }

  let lineStart = firstLineEnd + 1;
  while (lineStart <= source.length) {
    const lineEnd = source.indexOf("\n", lineStart);
    const line = (lineEnd === -1 ? source.slice(lineStart) : source.slice(lineStart, lineEnd)).replace(/\r$/, "");

    if (line === "---") {
      const frontmatter = source
        .slice(firstLineEnd + 1, lineStart)
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n");
      let parsed: unknown = {};
      try {
        parsed = parseYaml(frontmatter);
      } catch {
        parsed = {};
      }

      const data =
        typeof parsed === "object" && parsed !== null
          ? (parsed as Record<string, unknown>)
          : {};

      return {
        data: {
          ...emptyMeta(),
          title: stringValue(data.title),
          description: stringValue(data.description),
          date: stringValue(data.date),
          keywords: stringArrayValue(data.keywords),
        },
        content: lineEnd === -1 ? "" : source.slice(lineEnd + 1),
      };
    }

    if (lineEnd === -1) {
      break;
    }

    lineStart = lineEnd + 1;
  }

  return { data: emptyMeta(), content: raw };
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
