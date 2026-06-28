import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const billingSchema = () =>
  readFileSync(join(process.cwd(), "supabase/billing-credits.sql"), "utf8");

describe("billing Supabase schema", () => {
  it("grants authenticated reads for RLS-protected account data", () => {
    const schema = billingSchema().replace(/\s+/g, " ").toLowerCase();

    expect(schema).toContain(
      "grant select on public.profiles, public.credit_balances, public.credit_transactions, public.usage_logs to authenticated"
    );
  });

  it("keeps credit mutation RPCs restricted to service role", () => {
    const schema = billingSchema().toLowerCase();

    expect(schema).toContain(
      "revoke execute on function public.grant_credits"
    );
    expect(schema).toContain(
      "revoke execute on function public.consume_credits"
    );
    expect(schema).toContain(
      "revoke execute on function public.refund_credits"
    );
    expect(schema).toContain("to service_role");
  });
});
