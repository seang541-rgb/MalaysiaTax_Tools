// TEMPORARY: throws an uncaught error so we can confirm Sentry is receiving
// events in production. Remove after verification.
export function GET() {
  throw new Error("MYTax Sentry verification test error");
}
