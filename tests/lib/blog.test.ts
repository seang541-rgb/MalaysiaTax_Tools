import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, afterAll, beforeEach, describe, expect, it } from "vitest";
import { getAllPosts, getPost } from "@/lib/blog";

const BLOG_TEST_LOCALE = "__task-1-regressions";
const BLOG_TEST_DIR = path.join(process.cwd(), "content", "blog", BLOG_TEST_LOCALE);

function cleanupTestFixtures() {
  rmSync(BLOG_TEST_DIR, { force: true, recursive: true });
}

function writePost(slug: string, content: string) {
  writeFileSync(path.join(BLOG_TEST_DIR, `${slug}.md`), content, "utf-8");
}

describe("blog frontmatter parser compatibility", () => {
  beforeEach(() => {
    cleanupTestFixtures();
    mkdirSync(BLOG_TEST_DIR, { recursive: true });
  });

  afterEach(cleanupTestFixtures);
  afterAll(cleanupTestFixtures);

  it("parses BOM-prefixed frontmatter metadata", () => {
    writePost(
      "bom-post",
      "\uFEFF---\ntitle: BOM Blog\ndescription: BOM-safe parsing\ndate: 2026-01-01\nkeywords:\n  - tax\n  - malaysia\n---\nBOM body text"
    );

    const posts = getAllPosts(BLOG_TEST_LOCALE);
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({
      slug: "bom-post",
      title: "BOM Blog",
      description: "BOM-safe parsing",
      date: "2026-01-01",
      keywords: ["tax", "malaysia"],
    });

    const post = getPost(BLOG_TEST_LOCALE, "bom-post");
    expect(post).not.toBeNull();
    expect(post!.title).toBe("BOM Blog");
    expect(post!.html).toContain("<p>BOM body text</p>");
  });

  it("parses CRLF-delimited frontmatter and preserves content", () => {
    writePost(
      "crlf-post",
      "---\r\n" +
        "title: CRLF Blog\r\n" +
        "description: CRLF-safe parsing\r\n" +
        "date: 2026-02-02\r\n" +
        "keywords:\r\n" +
        "  - windows\r\n" +
        "---\r\n" +
        "CRLF body line 1\r\n" +
        "CRLF body line 2\r\n"
    );

    const post = getPost(BLOG_TEST_LOCALE, "crlf-post");
    expect(post).not.toBeNull();
    expect(post!.title).toBe("CRLF Blog");
    expect(post!.description).toBe("CRLF-safe parsing");
    expect(post!.date).toBe("2026-02-02");
    expect(post!.keywords).toEqual(["windows"]);
    expect(post!.html).toContain("<p>CRLF body line 1\nCRLF body line 2</p>");
  });

  it("keeps '---' in markdown body content and does not treat it as a frontmatter close", () => {
    writePost(
      "embedded-separator-post",
      "---\n" +
        "title: Embedded Separator\r\n" +
        "description: Divider in body remains content\r\n" +
        "date: 2026-03-03\r\n" +
        "---\n" +
        "Body line before divider\r\n\r\n" +
        "---\n" +
        "After divider\r\n"
    );

    const post = getPost(BLOG_TEST_LOCALE, "embedded-separator-post");
    expect(post).not.toBeNull();
    expect(post!.title).toBe("Embedded Separator");
    expect(post!.html).toContain("<p>Body line before divider</p>");
    expect(post!.html).toContain("<hr>");
    expect(post!.html).toContain("<p>After divider</p>");
  });

  it("falls back safely when frontmatter is malformed", () => {
    writePost(
      "malformed-post",
      "---\ntitle: [broken\ndescription: Should ignore malformed yaml\n---\nSafe body text"
    );

    const post = getPost(BLOG_TEST_LOCALE, "malformed-post");
    expect(post).not.toBeNull();
    expect(post!.title).toBe("");
    expect(post!.description).toBe("");
    expect(post!.html).toContain("<p>Safe body text</p>");
  });

  it("does not parse metadata when closing delimiter is missing", () => {
    writePost(
      "missing-delimiter-post",
      "---\n" +
        "title: Should Not Parse\r\n" +
        "description: This file misses its closing delimiter\r\n" +
        "date: 2026-04-04\r\n" +
        "keywords:\r\n" +
        "  - alpha\r\n" +
        "Body starts here without an ending ---"
    );

    const posts = getAllPosts(BLOG_TEST_LOCALE);
    expect(posts[0]).toMatchObject({
      slug: "missing-delimiter-post",
      title: "",
      description: "",
      date: "",
      keywords: [],
    });

    const post = getPost(BLOG_TEST_LOCALE, "missing-delimiter-post");
    expect(post).not.toBeNull();
    expect(post!.title).toBe("");
    expect(post!.html).toContain("title: Should Not Parse");
    expect(post!.html).toContain("Body starts here without an ending ---");
  });
});
