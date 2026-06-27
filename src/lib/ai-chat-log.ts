/**
 * AI 问答质量日志 —— 异步、非阻塞、绝不影响用户响应。
 * 写入 owner 自己的 Supabase(service role),供产品方回顾问答质量、
 * 发现高频问题与答错的情况。任何失败都静默吞掉。
 */
export async function logChatInteraction(input: {
  userId: string | null;
  locale: string | null;
  question: string;
  answer: string;
  usedRag: boolean;
  usedPrecalc: boolean;
  usedDeterministic: boolean;
  agentToolName?: string | null;
  agentNeedsFollowUp?: boolean;
  agentMissingFields?: string[];
}): Promise<void> {
  try {
    const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
    const client = createSupabaseAdminClient() as unknown as {
      from(table: string): {
        insert(row: Record<string, unknown>): Promise<{ error: unknown }>;
      };
    };

    await client.from("ai_chat_logs").insert({
      user_id: input.userId,
      locale: input.locale,
      question: input.question.slice(0, 2000),
      answer: input.answer.slice(0, 8000),
      answer_length: input.answer.length,
      used_rag: input.usedRag,
      used_precalc: input.usedPrecalc,
      used_deterministic: input.usedDeterministic,
      agent_tool_name: input.agentToolName ?? null,
      agent_needs_follow_up: input.agentNeedsFollowUp ?? false,
      agent_missing_fields: input.agentMissingFields ?? [],
    });
  } catch {
    // Logging is best-effort. Never surface to the user.
  }
}
