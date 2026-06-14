import * as Sentry from "@sentry/nextjs";
import { SENTRY_DSN, scrubEvent } from "./lib/sentry-scrub";

Sentry.init({
  dsn: SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production",
  tracesSampleRate: 0.1,
  // No session replay — saves quota and avoids recording tax inputs
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  sendDefaultPii: false,
  beforeSend: scrubEvent,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
