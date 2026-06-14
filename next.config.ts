import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
};

export default withSentryConfig(withNextIntl(nextConfig), {
  org: "ideanest-trading",
  project: "javascript-nextjs",
  // Source maps upload only runs when SENTRY_AUTH_TOKEN is set (skipped otherwise).
  silent: !process.env.CI,
  telemetry: false,
  widenClientFileUpload: true,
});
