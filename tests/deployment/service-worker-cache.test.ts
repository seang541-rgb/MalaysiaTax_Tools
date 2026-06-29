import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("service worker cache safety", () => {
  const source = readFileSync(join(process.cwd(), "public/sw.js"), "utf8");

  it("uses a fresh cache namespace after UI deployments", () => {
    expect(source).toContain('const CACHE_VERSION = "v3"');
  });

  it("does not store navigation HTML in cache", () => {
    const navigationBlock = source.slice(
      source.indexOf('event.request.mode === "navigate"'),
      source.indexOf("// Static assets")
    );

    expect(navigationBlock).not.toContain("cache.put");
  });

  it("reloads open clients after a new worker activates", () => {
    expect(source).toContain("client.navigate(client.url)");
  });
});
