import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0, must-revalidate",
          },
        ],
      },
      {
        source: "/:locale(en|zh|ms)/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
  // The reindex route reads the raw knowledge docs from disk at runtime; make
  // sure they're bundled into that serverless function on Vercel.
  outputFileTracingIncludes: {
    "/api/admin/reindex": ["./training-data/raw/**/*"],
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  org: "ideanest-trading",
  project: "javascript-nextjs",
  // Source maps upload only runs when SENTRY_AUTH_TOKEN is set (skipped otherwise).
  silent: !process.env.CI,
  telemetry: false,
  widenClientFileUpload: true,
});
