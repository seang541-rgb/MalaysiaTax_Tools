import { describe, expect, it } from "vitest";
import { getAdminEmails, isAdminConfigured, isAdminEmail } from "@/lib/admin";

describe("admin authorization helpers", () => {
  it("parses comma-separated admin emails case-insensitively", () => {
    const env = {
      ADMIN_EMAIL: " Owner@Example.com, second@example.com ",
      NODE_ENV: "production",
      VERCEL_ENV: "production",
    };

    expect(getAdminEmails(env)).toEqual([
      "owner@example.com",
      "second@example.com",
    ]);
    expect(isAdminEmail("owner@example.com", env)).toBe(true);
    expect(isAdminEmail("SECOND@example.com", env)).toBe(true);
    expect(isAdminEmail("other@example.com", env)).toBe(false);
  });

  it("fails closed when ADMIN_EMAIL is missing in production", () => {
    const env = {
      NODE_ENV: "production",
      VERCEL_ENV: "production",
    };

    expect(isAdminConfigured(env)).toBe(false);
    expect(getAdminEmails(env)).toEqual([]);
    expect(isAdminEmail("seang541@gmail.com", env)).toBe(false);
  });

  it("keeps the local development fallback only outside production", () => {
    const env = {
      NODE_ENV: "development",
      VERCEL_ENV: "development",
    };

    expect(isAdminConfigured(env)).toBe(true);
    expect(getAdminEmails(env)).toEqual(["seang541@gmail.com"]);
    expect(isAdminEmail("seang541@gmail.com", env)).toBe(true);
  });
});
