"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface FileResult {
  file: string;
  chunks?: number;
  error?: string;
}

export function ReindexClient() {
  const [running, setRunning] = useState(false);
  const [total, setTotal] = useState(0);
  const [results, setResults] = useState<FileResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function start() {
    setRunning(true);
    setError(null);
    setResults([]);
    setDone(false);

    try {
      // 1. Get the file list / total (auth is via the signed-in session cookie).
      const listRes = await fetch("/api/admin/reindex");
      if (!listRes.ok) {
        const j = await listRes.json().catch(() => ({}));
        throw new Error(
          listRes.status === 403
            ? "无权限 — 请用管理员账号登录"
            : j.error || `列出文件失败 (HTTP ${listRes.status})`
        );
      }
      const { total: t } = (await listRes.json()) as { total: number };
      setTotal(t);

      // 2. Process one file per request to stay under the time limit.
      for (let i = 0; i < t; i++) {
        const res = await fetch("/api/admin/reindex", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ index: i }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          setResults((r) => [
            ...r,
            {
              file: j.file || `file #${i + 1}`,
              error: j.error || `HTTP ${res.status}`,
            },
          ]);
          throw new Error(j.error || `第 ${i + 1} 个文件失败`);
        }
        setResults((r) => [...r, { file: j.file, chunks: j.chunks }]);
      }
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "重建失败");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">重建 AI 知识库</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Rebuild RAG knowledge base — 把 training-data 里的税务资料重新嵌入并写入
          Supabase。安全加固后需要跑一次,之后改了资料也可以再跑。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>重建</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            你已用管理员账号登录,点下面的按钮即可开始。过程会逐个文件处理,请勿关闭页面。
          </p>
          <Button onClick={start} disabled={running}>
            {running ? "重建中…请勿关闭页面" : "开始重建"}
          </Button>
        </CardContent>
      </Card>

      {(results.length > 0 || running) && (
        <Card>
          <CardHeader>
            <CardTitle>
              进度 {results.length}/{total || "?"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {total > 0 && (
              <div className="h-2 w-full rounded bg-muted overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all"
                  style={{ width: `${(results.length / total) * 100}%` }}
                />
              </div>
            )}
            <ul className="mt-2 space-y-1">
              {results.map((r, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span className="truncate">{r.file}</span>
                  <span
                    className={
                      r.error
                        ? "text-red-600 shrink-0"
                        : "text-green-600 shrink-0"
                    }
                  >
                    {r.error ? `✗ ${r.error}` : `✓ ${r.chunks} chunks`}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800 p-4 text-sm text-red-800 dark:text-red-200">
          <p className="font-semibold mb-1">出错了</p>
          <p>{error}</p>
        </div>
      )}

      {done && !error && (
        <div className="rounded-md border border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800 p-4 text-sm text-green-800 dark:text-green-200">
          <p className="font-semibold mb-1">完成 ✓</p>
          <p>知识库已重建。去 /ai-tax 问一个税务问题验证 AI 能正常引用资料。</p>
        </div>
      )}
    </div>
  );
}
