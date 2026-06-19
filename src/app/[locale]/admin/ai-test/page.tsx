import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { AiTestClient } from "./ai-test-client";

// Owner-only. Never indexed, never cached.
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function AiTestPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdminEmail(user?.email)) {
    notFound();
  }

  return <AiTestClient />;
}
