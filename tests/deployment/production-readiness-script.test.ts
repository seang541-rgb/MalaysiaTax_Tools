import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("production readiness script", () => {
  it("is exposed as an npm script", () => {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8")
    ) as { scripts?: Record<string, string> };

    expect(pkg.scripts?.["readiness:prod"]).toBe(
      "node scripts/check-production-readiness.mjs"
    );
  });

  it("checks deployment-critical env and Supabase schema without printing secrets", () => {
    const source = readFileSync(
      join(process.cwd(), "scripts/check-production-readiness.mjs"),
      "utf8"
    );

    expect(source).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(source).toContain("LLM_EMBED_API_KEY");
    expect(source).toContain("ADMIN_EMAIL");
    expect(source).toContain("provider_metadata");
    expect(source).toContain("tax_documents");
    expect(source).toContain("tax_chunks");
    expect(source).toContain("maskSecret");
    expect(source).toContain("normalizeEnvValue");
    expect(source).toContain("isVercelPulledBlank");
    expect(source).not.toContain("console.log(process.env");
  });

  it("documents the readiness gate in deployment docs", () => {
    const readme = readFileSync(join(process.cwd(), "README.md"), "utf8");
    const deployment = readFileSync(
      join(process.cwd(), "DEPLOYMENT.md"),
      "utf8"
    );

    expect(readme).toContain("npm run readiness:prod");
    expect(deployment).toContain("npm run readiness:prod");
  });
});
