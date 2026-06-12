import { describe, expect, it } from "vitest";
import { isProductionMaintenanceHost } from "@/lib/maintenance";

describe("production maintenance mode", () => {
  it("takes production traffic offline", () => {
    expect(
      isProductionMaintenanceHost({
        host: "mytaxs.online",
        vercelEnv: "production",
      })
    ).toBe(true);
  });

  it("keeps local development available", () => {
    expect(
      isProductionMaintenanceHost({
        host: "127.0.0.1:3000",
        vercelEnv: "production",
      })
    ).toBe(false);
  });
});
