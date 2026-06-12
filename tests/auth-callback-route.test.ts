import { beforeEach, describe, expect, it, vi } from "vitest";

const exchangeCodeForSessionMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      exchangeCodeForSession: exchangeCodeForSessionMock,
    },
  })),
}));

describe("auth callback route", () => {
  beforeEach(() => {
    vi.resetModules();
    exchangeCodeForSessionMock.mockReset();
  });

  it("exchanges a code for a session and redirects to a safe local path", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({ error: null });
    const { GET } = await import("@/app/auth/callback/route");

    const response = await GET(
      new Request("http://localhost/auth/callback?code=abc&next=/en/pricing")
    );

    expect(exchangeCodeForSessionMock).toHaveBeenCalledWith("abc");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/en/pricing"
    );
  });

  it("falls back when next is not a local path", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({ error: null });
    const { GET } = await import("@/app/auth/callback/route");

    const response = await GET(
      new Request(
        "http://localhost/auth/callback?code=abc&next=https://evil.example"
      )
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost/en/account"
    );
  });
});
