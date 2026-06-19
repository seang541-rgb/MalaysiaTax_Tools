"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Preset {
  q: string;
  locale: string;
  expect: string;
}

interface Result {
  q: string;
  expect: string;
  answer?: string;
  error?: string;
  usedRag?: boolean;
  usedPrecalc?: boolean;
  usedDeterministic?: boolean;
  pending?: boolean;
}

function Tag({ on, label }: { on?: boolean; label: string }) {
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

export function AiTestClient() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function run() {
    setRunning(true);
    setError(null);
    setResults([]);
    setDone(false);

    try {
      const listRes = await fetch("/api/admin/ai-test");
      if (!listRes.ok) {
        throw new Error(
          listRes.status === 403
            ? "无权限 — 请用管理员账号登录"
            : `加载题目失败 (HTTP ${listRes.status})`
        );
      }
      const { questions } = (await listRes.json()) as { questions: Preset[] };

      // seed rows as pending
      setResults(questions.map((p) => ({ q: p.q, expect: p.expect, pending: true })));

      for (let i = 0; i < questions.length; i++) {
        const p = questions[i];
        const res = await fetch("/api/admin/ai-test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: p.q, locale: p.locale }),
        });
        const j = await res.json().catch(() => ({}));
        setResults((rows) => {
          const next = [...rows];
          next[i] = res.ok
            ? {
                q: p.q,
                expect: p.expect,
                answer: j.answer,
                usedRag: j.usedRag,
                usedPrecalc: j.usedPrecalc,
                usedDeterministic: j.usedDeterministic,
              }
            : { q: p.q, expect: p.expect, error: j.error || `HTTP ${res.status}` };
          return next;
        });
      }
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "测试失败");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI 助手自测</h1>
        <p className="text-sm text-muted-foreground mt-1">
          用真实的 RAG + LLM 管线跑一组本地语调客户问题,直接看 AI 回答。
          无需登录聊天界面、不扣积分。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>运行测试</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            点下面的按钮,会逐题调用线上 AI 并显示回答 + 命中了哪些上下文(RAG / 预算 / 确定性事实)。
          </p>
          <Button onClick={run} disabled={running}>
            {running ? "测试中…请勿关闭页面" : "开始测试"}
          </Button>
        </CardContent>
      </Card>

      {results.map((r, i) => (
        <Card key={i}>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Q{i + 1}. {r.q}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-xs text-muted-foreground">
              预期要点：{r.expect}
            </p>
            {r.pending && <p className="text-muted-foreground">⏳ 等待回答…</p>}
            {r.error && <p className="text-red-600">✗ {r.error}</p>}
            {r.answer && (
              <>
                <div className="flex gap-1.5">
                  <Tag on={r.usedRag} label="RAG" />
                  <Tag on={r.usedPrecalc} label="预算" />
                  <Tag on={r.usedDeterministic} label="确定事实" />
                </div>
                <div className="whitespace-pre-wrap rounded-md bg-muted p-3">
                  {r.answer}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ))}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800 p-4 text-sm text-red-800 dark:text-red-200">
          <p className="font-semibold mb-1">出错了</p>
          <p>{error}</p>
        </div>
      )}

      {done && !error && (
        <div className="rounded-md border border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800 p-4 text-sm text-green-800 dark:text-green-200">
          <p className="font-semibold">全部跑完 ✓ 对照每题「预期要点」检查准确度。</p>
        </div>
      )}
    </div>
  );
}
