export type BillingErrorCode =
  | "AUTH_REQUIRED"
  | "INSUFFICIENT_CREDITS"
  | "INVALID_PACK"
  | "CHECKOUT_UNAVAILABLE"
  | "PAYMENT_NOT_CONFIRMED"
  | "WEBHOOK_SIGNATURE_INVALID"
  | "CREDIT_GRANT_FAILED"
  | "PROVIDER_FAILED_REFUNDED";

export interface BillingErrorBody {
  error: {
    code: BillingErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

export function billingErrorResponse(
  code: BillingErrorCode,
  status: number,
  message: string,
  details?: Record<string, unknown>
): Response {
  const body: BillingErrorBody = {
    error: details ? { code, message, details } : { code, message },
  };

  return Response.json(body, { status });
}
