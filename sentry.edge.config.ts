import * as Sentry from "@sentry/nextjs";
import { SENTRY_DSN, scrubEvent } from "./src/lib/sentry-scrub";

Sentry.init({
  dsn: SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production",
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  beforeSend: scrubEvent,
});
