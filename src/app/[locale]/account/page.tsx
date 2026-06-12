import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getBalance } from "@/lib/billing/credits";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ChangePasswordForm } from "@/components/change-password-form";

export default async function AccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ reset_password?: string }>;
}) {
  const { locale } = await params;
  const { reset_password: resetPassword } = await searchParams;
  const t = await getTranslations({ locale, namespace: "account" });
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/pricing`);

  const balance = await getBalance(user.id);
  const { data: transactions } = await supabase
    .from("credit_transactions")
    .select("id,amount,kind,feature,description,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <section className="mt-6 rounded-lg border bg-card p-5">
        <p className="text-sm text-muted-foreground">{t("creditBalance")}</p>
        <p className="mt-2 text-4xl font-bold">{balance}</p>
      </section>
      <section className="mt-6 rounded-lg border bg-card p-5">
        <h2 className="font-semibold">{t("recentActivity")}</h2>
        <div className="mt-4 space-y-3">
          {transactions?.length ? (
            transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between border-b pb-3 text-sm last:border-0 last:pb-0"
              >
                <div>
                  <p className="font-medium">{tx.description ?? tx.kind}</p>
                  <p className="text-xs text-muted-foreground">
                    {tx.feature ?? tx.kind}
                  </p>
                </div>
                <span className={tx.amount > 0 ? "text-green-700" : ""}>
                  {tx.amount > 0 ? "+" : ""}
                  {tx.amount}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">{t("noActivity")}</p>
          )}
        </div>
      </section>
      <ChangePasswordForm resetMode={resetPassword === "1"} />
    </div>
  );
}
