import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function normalizeEnvValue(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function loadDotEnvLocal() {
  const envPath = join(root, ".env.local");
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }
    const [key, ...rest] = trimmed.split("=");
    if (!process.env[key]) {
      process.env[key] = normalizeEnvValue(rest.join("="));
    }
  }
}

function maskSecret(value) {
  if (!value) return "missing";
  if (value.length <= 8) return "present";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function hasAnyEnv(keys) {
  return keys.some((key) => Boolean(process.env[key]));
}

function record(results, ok, label, detail = "") {
  results.push({ ok, label, detail });
}

async function checkRestSelect(results, table, columns) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    record(results, false, `Supabase ${table}`, "missing Supabase env");
    return;
  }

  let url;
  try {
    url = new URL(`/rest/v1/${table}`, supabaseUrl);
  } catch {
    record(results, false, `Supabase ${table}`, "invalid NEXT_PUBLIC_SUPABASE_URL");
    return;
  }
  url.searchParams.set("select", columns);
  url.searchParams.set("limit", "1");

  const res = await fetch(url, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });

  const body = await res.text();
  record(
    results,
    res.ok,
    `Supabase ${table}`,
    res.ok ? `select ${columns}` : `HTTP ${res.status}: ${body.slice(0, 180)}`
  );
}

function checkLocalSql(results) {
  const billing = readFileSync(join(root, "supabase/billing-credits.sql"), "utf8");
  const aiLogs = readFileSync(join(root, "supabase/ai-chat-logs.sql"), "utf8");

  record(
    results,
    billing.includes("grant select on public.profiles") &&
      billing.includes("public.credit_transactions") &&
      billing.includes("to authenticated"),
    "Billing SQL authenticated grants"
  );
  record(
    results,
    aiLogs.includes("provider_metadata") &&
      aiLogs.includes("agent_tool_name") &&
      aiLogs.includes("agent_missing_fields"),
    "AI log SQL agent/provider columns"
  );
}

function checkRawDocs(results) {
  const rawDir = join(root, "training-data/raw");
  const files = existsSync(rawDir)
    ? readdirSync(rawDir).filter((file) => file.endsWith(".md"))
    : [];

  record(results, files.length > 0, "RAG raw documents", `${files.length} markdown files`);
}

async function main() {
  loadDotEnvLocal();

  const results = [];
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_APP_URL",
  ];

  for (const key of required) {
    record(results, Boolean(process.env[key]), `Env ${key}`, maskSecret(process.env[key]));
  }

  record(
    results,
    hasAnyEnv(["LLM_CHAT_API_KEY", "LLM_API_KEY"]),
    "Env chat provider key",
    hasAnyEnv(["LLM_CHAT_API_KEY", "LLM_API_KEY"]) ? "present" : "missing"
  );
  record(
    results,
    hasAnyEnv(["LLM_EMBED_API_KEY", "LLM_API_KEY"]),
    "Env embedding provider key",
    hasAnyEnv(["LLM_EMBED_API_KEY", "LLM_API_KEY"]) ? "present" : "missing"
  );
  record(results, Boolean(process.env.ADMIN_EMAIL), "Env ADMIN_EMAIL", "required in production");

  checkLocalSql(results);
  checkRawDocs(results);
  await checkRestSelect(results, "ai_chat_logs", "provider_metadata,agent_tool_name");
  await checkRestSelect(results, "tax_documents", "id,source");
  await checkRestSelect(results, "tax_chunks", "id,document_id");

  console.log("MYTax production readiness check");
  console.log("================================");
  for (const result of results) {
    const mark = result.ok ? "OK " : "ERR";
    console.log(`${mark} ${result.label}${result.detail ? ` - ${result.detail}` : ""}`);
  }

  const failures = results.filter((result) => !result.ok);
  if (failures.length > 0) {
    console.error(`\n${failures.length} readiness check(s) failed.`);
    process.exit(1);
  }

  console.log("\nAll readiness checks passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
