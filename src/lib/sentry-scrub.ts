import type { ErrorEvent, EventHint } from "@sentry/nextjs";

/**
 * Strip personally identifiable / financial data before any event leaves the
 * browser or server. For a tax tool the request body can contain income
 * figures, salaries and emails — none of that should reach Sentry.
 */
export function scrubEvent(event: ErrorEvent, _hint?: EventHint): ErrorEvent {
  // Never send request bodies, cookies, or auth headers
  if (event.request) {
    delete event.request.data;
    delete event.request.cookies;
    if (event.request.headers) {
      delete event.request.headers["authorization"];
      delete event.request.headers["cookie"];
    }
    // Drop query strings (could carry the ?d= shared-calc payload)
    if (event.request.query_string) delete event.request.query_string;
  }

  // No user identifiers
  delete event.user;

  // Drop any custom extra data as a safety net
  if (event.extra) event.extra = {};

  return event;
}

/** Sentry DSN (public by design). Override per-env with SENTRY_DSN. */
export const SENTRY_DSN =
  process.env.SENTRY_DSN ||
  process.env.NEXT_PUBLIC_SENTRY_DSN ||
  "https://e3debbafb21f098383b460a515ad0b5e@o4511560929837056.ingest.us.sentry.io/4511560939929600";
