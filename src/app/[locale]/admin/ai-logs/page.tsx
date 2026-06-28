import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";

// Owner-only. Never indexed, never cached.
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

interface ChatLog {
  id: string;
  created_at: string;
  locale: string | null;
  question: string | null;
  answer: string | null;
  answer_length: number | null;
  used_rag: boolean | null;
  used_precalc: boolean | null;
  used_deterministic: boolean | null;
  agent_tool_name: string | null;
  agent_needs_follow_up: boolean | null;
  agent_missing_fields: string[] | null;
}

function Badge({ on, label }: { on: boolean | null; label: string }) {
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
        on
          ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
          : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
      }`}
    >
      {label}
    </span>
  );
}

export default async function AiLogsPage() {
  // 1. Authenticate the visitor with their own session.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 2. Owner gate. Anyone else gets a 404 (don't reveal the page exists).
  if (!isAdminEmail(user?.email)) {
    notFound();
  }

  // 3. Read logs with the service-role client (table is RLS-locked).
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("ai_chat_logs")
    .select(
      "id,created_at,locale,question,answer,answer_length,used_rag,used_precalc,used_deterministic,agent_tool_name,agent_needs_follow_up,agent_missing_fields"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const logs = (data as ChatLog[] | null) ?? [];

  // Stats — "pure model" answers (no RAG, no pre-calc, no deterministic) are
  // the highest-risk rows worth eyeballing first.
  const total = logs.length;
  const pureModel = logs.filter(
    (l) => !l.used_rag && !l.used_precalc && !l.used_deterministic
  ).length;
  const withRag = logs.filter((l) => l.used_rag).length;
  const withCalc = logs.filter((l) => l.used_precalc || l.used_deterministic)
    .length;
  const withAgentTool = logs.filter((l) => l.agent_tool_name).length;
  const needingFollowUp = logs.filter((l) => l.agent_needs_follow_up).length;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-3xl font-bold">AI 问答日志</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        仅 owner 可见 · 最近 200 条 · 重点看「纯模型」行(无知识库/无计算兜底,最易出错)
      </p>

      {error ? (
        <p className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          读取失败:{error.message}
        </p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Stat label="总条数" value={total} />
            <Stat label="纯模型(高风险)" value={pureModel} accent />
            <Stat label="命中知识库" value={withRag} />
            <Stat label="命中计算兜底" value={withCalc} />
            <Stat label="Agent 工具" value={withAgentTool} />
          </div>
          {needingFollowUp > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              需追问记录: {needingFollowUp} 条
            </p>
          )}

          <div className="mt-6 space-y-3">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">还没有记录。</p>
            ) : (
              logs.map((l) => {
                const risky =
                  !l.used_rag && !l.used_precalc && !l.used_deterministic;
                return (
                  <details
                    key={l.id}
                    className={`rounded-lg border bg-card p-4 ${
                      risky ? "border-amber-400/60" : ""
                    }`}
                  >
                    <summary className="cursor-pointer list-none">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{new Date(l.created_at).toLocaleString()}</span>
                        {l.locale && (
                          <span className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">
                            {l.locale}
                          </span>
                        )}
                        <Badge on={l.used_rag} label="RAG" />
                        <Badge on={l.used_precalc} label="预计算" />
                        <Badge on={l.used_deterministic} label="确定性" />
                        {l.agent_tool_name && (
                          <span className="rounded bg-blue-100 px-1.5 py-0.5 font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                            Agent 工具: {l.agent_tool_name}
                          </span>
                        )}
                        {l.agent_needs_follow_up && (
                          <span className="rounded bg-purple-100 px-1.5 py-0.5 font-medium text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                            需追问
                          </span>
                        )}
                        {risky && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                            纯模型
                          </span>
                        )}
                        <span className="ml-auto">{l.answer_length ?? 0} 字</span>
                      </div>
                      <p className="mt-2 font-medium">
                        {l.question || "(空)"}
                      </p>
                    </summary>
                    <div className="mt-3 whitespace-pre-wrap border-t pt-3 text-sm text-muted-foreground">
                      {l.agent_missing_fields &&
                        l.agent_missing_fields.length > 0 && (
                          <p className="mb-3 rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                            缺失字段: {l.agent_missing_fields.join(", ")}
                          </p>
                        )}
                      {l.answer || "(无回答)"}
                    </div>
                  </details>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold ${
          accent ? "text-amber-600 dark:text-amber-400" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
