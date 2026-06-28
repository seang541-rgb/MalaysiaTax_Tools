const baseUrl = (process.env.MYTAX_SMOKE_BASE_URL || "https://mytaxs.online").replace(/\/$/, "");

const checks = [
  { name: "English home", method: "GET", path: "/en", status: 200 },
  { name: "Chinese home", method: "GET", path: "/zh", status: 200 },
  { name: "Malay home", method: "GET", path: "/ms", status: 200 },
  { name: "English AI page", method: "GET", path: "/en/ai-tax", status: 200 },
  { name: "Chinese AI page", method: "GET", path: "/zh/ai-tax", status: 200 },
  { name: "Malay AI page", method: "GET", path: "/ms/ai-tax", status: 200 },
  { name: "Pricing page", method: "GET", path: "/en/pricing", status: 200 },
  {
    name: "AI health",
    method: "GET",
    path: "/api/chat",
    status: 200,
    json: (body) => body.status === "ok" && body.configured === true,
  },
  {
    name: "AI POST requires auth",
    method: "POST",
    path: "/api/chat",
    status: 401,
    body: {
      messages: [{ role: "user", content: "What is Malaysia personal tax?" }],
      locale: "en",
    },
  },
  { name: "Balance requires auth", method: "GET", path: "/api/billing/balance", status: 401 },
  {
    name: "Checkout requires auth",
    method: "POST",
    path: "/api/billing/checkout",
    status: 401,
    body: { packId: "starter", locale: "en" },
  },
  {
    name: "Credit consume requires auth",
    method: "POST",
    path: "/api/billing/consume",
    status: 401,
    body: { feature: "corporate_tax_calculation" },
  },
  {
    name: "Admin reindex API blocks anonymous",
    method: "POST",
    path: "/api/admin/reindex",
    status: 403,
    body: {},
  },
];

async function runCheck(check) {
  const headers = {};
  const init = { method: check.method, headers };
  if (check.body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(check.body);
  }

  const response = await fetch(`${baseUrl}${check.path}`, init);
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  const statusOk = response.status === check.status;
  const jsonOk = check.json ? check.json(body) : true;
  return {
    ...check,
    actualStatus: response.status,
    ok: statusOk && jsonOk,
    body: text.slice(0, 180),
  };
}

console.log(`MYTax production smoke check\nBase URL: ${baseUrl}\n`);

const results = [];
for (const check of checks) {
  try {
    const result = await runCheck(check);
    results.push(result);
    const marker = result.ok ? "OK " : "ERR";
    console.log(`${marker} ${check.name} (${check.method} ${check.path}) -> ${result.actualStatus}`);
    if (!result.ok && result.body) {
      console.log(`    ${result.body}`);
    }
  } catch (error) {
    results.push({ ...check, ok: false, actualStatus: "ERR", body: String(error) });
    console.log(`ERR ${check.name} (${check.method} ${check.path}) -> ${error}`);
  }
}

const failed = results.filter((result) => !result.ok);
if (failed.length > 0) {
  console.error(`\n${failed.length} production smoke check(s) failed.`);
  process.exit(1);
}

console.log("\nAll production smoke checks passed.");
