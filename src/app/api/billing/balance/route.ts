import { billingErrorResponse } from "@/lib/billing/errors";
import { getBalance } from "@/lib/billing/credits";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return billingErrorResponse("AUTH_REQUIRED", 401, "Please sign in.");
  }

  const balance = await getBalance(user.id);

  return Response.json({ balance });
}
