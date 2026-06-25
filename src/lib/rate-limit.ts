import "server-only";

export interface RateLimitInput {
  key: string;
  route: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: string | null;
}

interface RateLimitRow {
  allowed: boolean;
  remaining: number;
  reset_at: string | null;
}

function isRateLimitRow(value: unknown): value is RateLimitRow {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof value.allowed === "boolean" &&
    typeof value.remaining === "number" &&
    Number.isFinite(value.remaining) &&
    (typeof value.reset_at === "string" || value.reset_at === null)
  );
}

function isKnownLocalFailOpenError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  if (error.message === "Supabase admin env vars are not configured.") {
    return true;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes("fetch failed") ||
    message.includes("failed to fetch") ||
    message.includes("network request failed") ||
    message.includes("getaddrinfo") ||
    message.includes("econnrefused") ||
    message.includes("connect timeout") ||
    message.includes("connection timed out")
  );
}

export async function checkRateLimit(
  input: RateLimitInput
): Promise<RateLimitResult> {
  try {
    const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
    const { data, error } = await createSupabaseAdminClient().rpc(
      "check_rate_limit",
      {
        p_key: input.key,
        p_route: input.route,
        p_limit: input.limit,
        p_window_seconds: input.windowSeconds,
      }
    );

    if (error) {
      throw new Error(error.message);
    }

    const row = Array.isArray(data) ? data[0] : null;
    if (!isRateLimitRow(row)) {
      throw new Error("Rate limit RPC returned no result.");
    }

    return {
      allowed: Boolean(row.allowed),
      remaining: row.remaining,
      resetAt: row.reset_at,
    };
  } catch (error) {
    if (
      process.env.NODE_ENV !== "production" &&
      isKnownLocalFailOpenError(error)
    ) {
      return {
        allowed: true,
        remaining: input.limit,
        resetAt: null,
      };
    }

    throw error;
  }
}
