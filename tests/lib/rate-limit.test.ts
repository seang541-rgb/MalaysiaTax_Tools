import { beforeEach, describe, expect, it, vi } from "vitest";

const rpcMock = vi.fn();
const createSupabaseAdminClientMock = vi.fn(() => ({
  rpc: rpcMock,
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: createSupabaseAdminClientMock,
}));

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.resetModules();
    rpcMock.mockReset();
    createSupabaseAdminClientMock.mockReset();
    createSupabaseAdminClientMock.mockReturnValue({
      rpc: rpcMock,
    });
    vi.unstubAllEnvs();
  });

  it("returns allowed result from Supabase RPC", async () => {
    rpcMock.mockResolvedValue({
      data: [{ allowed: true, remaining: 8, reset_at: null }],
      error: null,
    });
    const { checkRateLimit } = await import("@/lib/rate-limit");

    await expect(
      checkRateLimit({
        key: "user:user-1",
        route: "/api/chat",
        limit: 10,
        windowSeconds: 60,
      })
    ).resolves.toEqual({
      allowed: true,
      remaining: 8,
      resetAt: null,
    });
  });

  it("returns blocked result from Supabase RPC", async () => {
    rpcMock.mockResolvedValue({
      data: [
        {
          allowed: false,
          remaining: 0,
          reset_at: "2026-06-25T08:00:00.000Z",
        },
      ],
      error: null,
    });
    const { checkRateLimit } = await import("@/lib/rate-limit");

    await expect(
      checkRateLimit({
        key: "ip:127.0.0.1",
        route: "/api/chat",
        limit: 10,
        windowSeconds: 60,
      })
    ).resolves.toEqual({
      allowed: false,
      remaining: 0,
      resetAt: "2026-06-25T08:00:00.000Z",
    });
  });

  it("fails open locally when admin env vars are missing", async () => {
    createSupabaseAdminClientMock.mockImplementation(() => {
      throw new Error("Supabase admin env vars are not configured.");
    });
    const { checkRateLimit } = await import("@/lib/rate-limit");

    await expect(
      checkRateLimit({
        key: "user:user-1",
        route: "/api/chat",
        limit: 10,
        windowSeconds: 60,
      })
    ).resolves.toEqual({
      allowed: true,
      remaining: 10,
      resetAt: null,
    });
  });

  it("fails open locally when RPC is unavailable", async () => {
    rpcMock.mockRejectedValue(new Error("fetch failed"));
    const { checkRateLimit } = await import("@/lib/rate-limit");

    await expect(
      checkRateLimit({
        key: "user:user-1",
        route: "/api/chat",
        limit: 10,
        windowSeconds: 60,
      })
    ).resolves.toEqual({
      allowed: true,
      remaining: 10,
      resetAt: null,
    });
  });

  it("throws in production when admin client creation fails", async () => {
    vi.stubEnv("NODE_ENV", "production");
    createSupabaseAdminClientMock.mockImplementation(() => {
      throw new Error("Supabase admin env vars are not configured.");
    });
    const { checkRateLimit } = await import("@/lib/rate-limit");

    await expect(
      checkRateLimit({
        key: "user:user-1",
        route: "/api/chat",
        limit: 10,
        windowSeconds: 60,
      })
    ).rejects.toThrow("Supabase admin env vars are not configured.");
  });

  it("throws in production when RPC returns an error", async () => {
    vi.stubEnv("NODE_ENV", "production");
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: "permission denied" },
    });
    const { checkRateLimit } = await import("@/lib/rate-limit");

    await expect(
      checkRateLimit({
        key: "user:user-1",
        route: "/api/chat",
        limit: 10,
        windowSeconds: 60,
      })
    ).rejects.toThrow("permission denied");
  });

  it("throws on malformed RPC response outside production", async () => {
    rpcMock.mockResolvedValue({
      data: [{ allowed: true, remaining: "8", reset_at: null }],
      error: null,
    });
    const { checkRateLimit } = await import("@/lib/rate-limit");

    await expect(
      checkRateLimit({
        key: "user:user-1",
        route: "/api/chat",
        limit: 10,
        windowSeconds: 60,
      })
    ).rejects.toThrow("Rate limit RPC returned no result.");
  });
});
