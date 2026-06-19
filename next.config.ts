import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  // The reindex route reads the raw knowledge docs from disk at runtime; make
  // sure they're bundled into that serverless function on Vercel.
  outputFileTracingIncludes: {
    "/api/admin/reindex": ["./training-data/raw/**/*"],
  },
};

export default withNextIntl(nextConfig);
