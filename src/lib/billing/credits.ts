import { BillingFeature } from "./plans";

interface SupabaseError {
  message: string;
}

interface BalanceQueryClient {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): Promise<{
          data: { balance: number } | null;
          error: SupabaseError | null;
        }>;
      };
    };
  };
}

interface RpcClient {
  rpc(
    fn: string,
    args: Record<string, unknown>
  ): Promise<{
    data: unknown;
    error: SupabaseError | null;
  }>;
}

interface ConsumeCreditsRow {
  success: boolean;
  balance: number;
  required: number;
}

function isConsumeCreditsRow(value: unknown): value is ConsumeCreditsRow {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    "balance" in value &&
    "required" in value
  );
}

export class InsufficientCreditsError extends Error {
  code = "INSUFFICIENT_CREDITS" as const;

  constructor(
    public balance: number,
    public required: number
  ) {
    super("Insufficient credits.");
  }
}

export async function getBalanceWithClient(
  client: BalanceQueryClient,
  userId: string
): Promise<number> {
  const { data, error } = await client
    .from("credit_balances")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.balance ?? 0;
}

export async function getBalance(userId: string): Promise<number> {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  return getBalanceWithClient(
    createSupabaseAdminClient() as unknown as BalanceQueryClient,
    userId
  );
}

export async function grantCreditsWithClient(
  client: RpcClient,
  input: {
    userId: string;
    amount: number;
    stripeSessionId: string;
    stripeEventId: string;
    metadata: Record<string, unknown>;
  }
): Promise<number> {
  const { data, error } = await client.rpc("grant_credits", {
    p_user_id: input.userId,
    p_amount: input.amount,
    p_stripe_session_id: input.stripeSessionId,
    p_stripe_event_id: input.stripeEventId,
    p_metadata: input.metadata,
  });

  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

export async function grantCredits(input: {
  userId: string;
  amount: number;
  stripeSessionId: string;
  stripeEventId: string;
  metadata: Record<string, unknown>;
}): Promise<number> {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  return grantCreditsWithClient(
    createSupabaseAdminClient() as unknown as RpcClient,
    input
  );
}

export async function consumeCreditsWithClient(
  client: RpcClient,
  input: {
    userId: string;
    feature: BillingFeature;
    amount: number;
    requestSummary: Record<string, unknown>;
  }
): Promise<{ balance: number; required: number }> {
  const { data, error } = await client.rpc("consume_credits", {
    p_user_id: input.userId,
    p_feature: input.feature,
    p_amount: input.amount,
    p_request_summary: input.requestSummary,
  });

  if (error) throw new Error(error.message);

  const row = Array.isArray(data) ? data[0] : null;
  if (!isConsumeCreditsRow(row)) {
    throw new Error("Credit consumption returned no result.");
  }

  if (!row.success) {
    throw new InsufficientCreditsError(
      Number(row.balance),
      Number(row.required)
    );
  }

  return {
    balance: Number(row.balance),
    required: Number(row.required),
  };
}

export async function consumeCredits(input: {
  userId: string;
  feature: BillingFeature;
  amount: number;
  requestSummary: Record<string, unknown>;
}): Promise<{ balance: number; required: number }> {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  return consumeCreditsWithClient(
    createSupabaseAdminClient() as unknown as RpcClient,
    input
  );
}

export async function refundCreditsWithClient(
  client: RpcClient,
  input: {
    userId: string;
    feature: BillingFeature;
    amount: number;
    errorCode: string;
    metadata: Record<string, unknown>;
  }
): Promise<number> {
  const { data, error } = await client.rpc("refund_credits", {
    p_user_id: input.userId,
    p_feature: input.feature,
    p_amount: input.amount,
    p_error_code: input.errorCode,
    p_metadata: input.metadata,
  });

  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

export async function refundCredits(input: {
  userId: string;
  feature: BillingFeature;
  amount: number;
  errorCode: string;
  metadata: Record<string, unknown>;
}): Promise<number> {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  return refundCreditsWithClient(
    createSupabaseAdminClient() as unknown as RpcClient,
    input
  );
}
