import { beforeEach, describe, expect, it, vi } from "vitest";

const listUsersMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    auth: {
      admin: {
        listUsers: listUsersMock,
      },
    },
  })),
}));

describe("auth email status route", () => {
  beforeEach(() => {
    vi.resetModules();
    listUsersMock.mockReset();
  });

  it("reports when an email is already registered", async () => {
    listUsersMock.mockResolvedValueOnce({
      data: {
        users: [
          { email: "someone@example.com" },
          { email: "seang541@gmail.com" },
        ],
      },
      error: null,
    });
    const { POST } = await import("@/app/api/auth/email-status/route");

    const response = await POST(
      new Request("http://localhost/api/auth/email-status", {
        method: "POST",
        body: JSON.stringify({ email: " SEANG541@gmail.com " }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ registered: true });
  });

  it("rejects invalid email checks", async () => {
    const { POST } = await import("@/app/api/auth/email-status/route");

    const response = await POST(
      new Request("http://localhost/api/auth/email-status", {
        method: "POST",
        body: JSON.stringify({ email: "not-an-email" }),
      })
    );

    expect(response.status).toBe(400);
    expect(listUsersMock).not.toHaveBeenCalled();
  });
});
