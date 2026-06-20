import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isProductionMaintenanceHost } from "@/lib/maintenance";

describe("production maintenance mode", () => {
  it("keeps production traffic online by default", () => {
    expect(
      isProductionMaintenanceHost({
        host: "mytaxs.online",
        vercelEnv: "production",
      })
    ).toBe(false);
  });

  it("can keep production open through the maintenance env flag", () => {
    expect(
      isProductionMaintenanceHost({
        host: "mytaxs.online",
        vercelEnv: "production",
        maintenanceMode: "0",
      })
    ).toBe(false);
  });

  it("can close non-local preview traffic through the maintenance env flag", () => {
    expect(
      isProductionMaintenanceHost({
        host: "preview.mytaxs.online",
        vercelEnv: "preview",
        maintenanceMode: "1",
      })
    ).toBe(true);
  });

  it("allows auth callback traffic during maintenance", () => {
    expect(
      isProductionMaintenanceHost({
        host: "mytaxs.online",
        vercelEnv: "production",
        pathname: "/auth/callback",
      })
    ).toBe(false);
  });

  it("keeps auth routes out of locale proxy redirects", () => {
    const proxySource = readFileSync(
      join(process.cwd(), "src", "proxy.ts"),
      "utf8"
    );

    expect(proxySource).toContain("api|auth|_next|_vercel");
  });

  it("keeps local development available", () => {
    expect(
      isProductionMaintenanceHost({
        host: "127.0.0.1:3000",
        vercelEnv: "production",
        maintenanceMode: "1",
      })
    ).toBe(false);
  });
});
