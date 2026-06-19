/**
 * Admin: run the real MYTax AI pipeline (RAG + deterministic + pre-calc + LLM)
 * against a question, non-streaming, with no billing. Lets the owner verify the
 * assistant works end-to-end without using the chat UI or spending credits.
 *
 * Auth: signed-in admin only (ADMIN_EMAIL).
 */
import { chatComplete } from "@/lib/llm";
import { buildChatContext } from "@/lib/ai/pipeline";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Preset local-tone customer questions covering each tool. */
export const PRESET_QUESTIONS: { q: string; locale: string; expect: string }[] = [
  { q: "请问 ah，我月薪 RM5,000，单身，要交多少 income tax 一年？", locale: "zh", expect: "RM9,000 个人减免 + EPF relief；年税额约 RM1,000 上下" },
  { q: "我做小生意的，一年 turnover 大概 80 万，需要做 e-invoice 吗？", locale: "zh", expect: "低于 RM100 万 → 目前豁免/自愿" },
  { q: "买第一间 house RM450k，stamp duty 要给多少？有没有 exemption？", locale: "zh", expect: "首购 ≤RM500k 转名+贷款 100% 豁免" },
  { q: "My company chargeable income is RM500k, SME. How much tax ah?", locale: "en", expect: "SME 分档 → 约 RM82,000" },
  { q: "我间屋 hold 了 4 年要卖，RPGT 是多少 percent？", locale: "zh", expect: "公民第 4 年 = 20%" },
  { q: "我太太没有工作，可以 claim 多少 relief？", locale: "zh", expect: "配偶减免 RM4,000" },
  { q: "Saya buka kedai makan, kena charge SST tak? Berapa percent?", locale: "ms", expect: "服务税税率 + RM500k 注册门槛" },
  { q: "EPF 我自己供的，可以 claim tax relief 吗？最多多少？", locale: "zh", expect: "EPF relief 最高 RM4,000（勿与人寿 RM3,000 混淆）" },
];

async function isAdmin(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return isAdminEmail(user?.email);
}

export async function GET() {
  if (!(await isAdmin())) {
    return Response.json({ error: "unauthorized" }, { status: 403 });
  }
  return Response.json({
    total: PRESET_QUESTIONS.length,
    questions: PRESET_QUESTIONS,
  });
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return Response.json({ error: "unauthorized" }, { status: 403 });
  }

  let question = "";
  let locale: string | undefined;
  try {
    const body = (await req.json()) as { question?: string; locale?: string };
    question = (body?.question || "").slice(0, 500);
    locale = body?.locale;
  } catch {
    /* ignore */
  }

  if (!question.trim()) {
    return Response.json({ error: "missing question" }, { status: 400 });
  }

  try {
    const { system, usedRag, usedPrecalc, usedDeterministic } =
      await buildChatContext(question, locale);

    const answer = await chatComplete([
      { role: "system", content: system },
      { role: "user", content: question },
    ]);

    return Response.json({
      question,
      answer,
      usedRag,
      usedPrecalc,
      usedDeterministic,
    });
  } catch (e) {
    return Response.json(
      { question, error: e instanceof Error ? e.message : "AI test failed" },
      { status: 500 }
    );
  }
}
