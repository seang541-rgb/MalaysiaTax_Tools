import { beforeEach, describe, expect, it, vi } from "vitest";

const rpcMock = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    rpc: rpcMock,
  })),
}));

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.resetModules();
    rpcMock.mockReset();
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
    rpcMock.mockRejectedValue(new Error("missing env"));
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
});
