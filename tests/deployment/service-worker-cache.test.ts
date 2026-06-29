import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("service worker cache safety", () => {
  const source = readFileSync(join(process.cwd(), "public/sw.js"), "utf8");

  it("ships a service worker kill switch instead of caching pages", () => {
    expect(source).toContain('const CACHE_VERSION = "kill-v1"');
    expect(source).toContain("self.registration.unregister()");
  });

  it("deletes every MYTax cache namespace", () => {
    expect(source).toContain('key.startsWith("mytax-")');
    expect(source).toContain("caches.delete(key)");
  });

  it("reloads open clients after removing the worker", () => {
    expect(source).toContain("client.navigate(client.url)");
  });

  it("does not intercept fetch requests anymore", () => {
    expect(source).not.toContain('addEventListener("fetch"');
    expect(source).not.toContain("cache.put");
  });
});
