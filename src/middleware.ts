import createMiddleware from "next-intl/middleware";
import { defineRouting } from "next-intl/routing";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { isProductionMaintenanceHost } from "@/lib/maintenance";

const routing = defineRouting({
  locales: ["en", "zh", "ms"],
  defaultLocale: "en",
});

const intlMiddleware = createMiddleware(routing);

function isMaintenanceEnabled(request: NextRequest): boolean {
  return isProductionMaintenanceHost({
    host: request.headers.get("host"),
    vercelEnv: process.env.VERCEL_ENV,
    maintenanceMode: process.env.MAINTENANCE_MODE,
    pathname: request.nextUrl.pathname,
  });
}

function maintenanceResponse() {
  return new NextResponse(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>MYTax is under maintenance</title>
    <style>
      :root { color-scheme: light dark; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: Arial, sans-serif;
        background: #f8fafc;
        color: #0f172a;
      }
      main {
        width: min(92vw, 560px);
        padding: 40px 24px;
        text-align: center;
      }
      h1 {
        margin: 0 0 16px;
        font-size: clamp(28px, 5vw, 44px);
        line-height: 1.08;
      }
      p {
        margin: 0;
        color: #475569;
        font-size: 16px;
        line-height: 1.7;
      }
      .brand {
        margin-bottom: 28px;
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 0.08em;
        color: #2563eb;
      }
      @media (prefers-color-scheme: dark) {
        body { background: #020617; color: #f8fafc; }
        p { color: #cbd5e1; }
        .brand { color: #60a5fa; }
      }
    </style>
  </head>
  <body>
    <main>
      <div class="brand">MYTax</div>
      <h1>System maintenance in progress</h1>
      <p>We are temporarily taking the site offline while we fix account registration and sign-in. Please check back shortly.</p>
      <p style="margin-top:16px">系统维护中。我们正在修复注册和登入问题，请稍后再回来。</p>
    </main>
  </body>
</html>`,
    {
      status: 503,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store, max-age=0",
        "retry-after": "3600",
      },
    }
  );
}

export default async function middleware(request: NextRequest) {
  if (isMaintenanceEnabled(request)) {
    return maintenanceResponse();
  }

  const response = intlMiddleware(request) as NextResponse;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return response;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
