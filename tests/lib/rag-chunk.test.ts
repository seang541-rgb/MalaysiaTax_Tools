import { describe, it, expect } from "vitest";
import { chunkText, extractTitle } from "@/lib/rag/chunk";

describe("chunkText", () => {
  it("returns a single chunk for short text", () => {
    const chunks = chunkText("# Title\n\nA short paragraph.");
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toContain("A short paragraph.");
    expect(chunks[0].heading).toBe("Title");
  });

  it("splits long text into multiple chunks", () => {
    const para = "x".repeat(300);
    const text = `${para}\n\n${para}\n\n${para}`;
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("carries overlap from the previous chunk", () => {
    const a = "a".repeat(300);
    const b = "b".repeat(300);
    const chunks = chunkText(`${a}\n\n${b}`);
    expect(chunks).toHaveLength(2);
    // second chunk should start with the tail (overlap) of the first
    expect(chunks[1].content.startsWith("a")).toBe(true);
  });

  it("tracks the latest heading", () => {
    const chunks = chunkText("# First\n\nbody\n\n## Second\n\nmore");
    expect(chunks[chunks.length - 1].heading).toBe("Second");
  });

  it("ignores empty paragraphs", () => {
    const chunks = chunkText("para one\n\n\n\n\n\npara two");
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toContain("para one");
    expect(chunks[0].content).toContain("para two");
  });

  it("handles empty input", () => {
    expect(chunkText("")).toHaveLength(0);
    expect(chunkText("   \n\n  ")).toHaveLength(0);
  });
});

describe("extractTitle", () => {
  it("uses the first H1", () => {
    expect(extractTitle("# My Title\n\nbody", "10-e-invoice.md")).toBe("My Title");
  });

  it("falls back to a humanized filename", () => {
    expect(extractTitle("no heading here", "10-e-invoice.md")).toBe(
      "10 e invoice"
    );
  });
});
