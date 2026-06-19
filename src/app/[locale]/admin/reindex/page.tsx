import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { ReindexClient } from "./reindex-client";

// Owner-only. Never indexed, never cached.
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function ReindexPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Owner gate. Anyone else gets a 404 (don't reveal the page exists).
  if (!isAdminEmail(user?.email)) {
    notFound();
  }

  return <ReindexClient />;
}
