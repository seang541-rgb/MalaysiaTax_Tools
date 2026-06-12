import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;

  return email;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
  } | null;
  const email = normalizeEmail(body?.email);

  if (!email) {
    return Response.json(
      { error: { code: "INVALID_EMAIL", message: "Enter a valid email." } },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdminClient();

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 100,
    });

    if (error) throw new Error(error.message);

    const registered = data.users.some(
      (user) => user.email?.trim().toLowerCase() === email
    );
    if (registered) return Response.json({ registered: true });
    if (data.users.length < 100) break;
  }

  return Response.json({ registered: false });
}
