/**
 * Canonical site URL. Override per-environment with NEXT_PUBLIC_SITE_URL
 * (e.g. a preview deployment). Defaults to the production domain.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://mytaxs.online"
).replace(/\/$/, "");

/** Bare domain (no scheme), for display. */
export const SITE_DOMAIN = SITE_URL.replace(/^https?:\/\//, "");
