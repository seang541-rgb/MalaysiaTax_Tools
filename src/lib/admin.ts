/**
 * Owner/admin gate shared by admin-only routes and pages.
 *
 * Production fails closed when ADMIN_EMAIL is not configured. Local
 * development keeps the project owner's email as a convenience fallback.
 */
type AdminEnv = {
  ADMIN_EMAIL?: string;
  VERCEL_ENV?: string;
  NODE_ENV?: string;
};

const LOCAL_DEV_ADMIN_EMAIL = "seang541@gmail.com";

function isProductionEnv(env: AdminEnv): boolean {
  return env.VERCEL_ENV === "production" || env.NODE_ENV === "production";
}

function parseEmails(value: string | undefined): string[] {
  return (value || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function getAdminEmails(env: AdminEnv = process.env): string[] {
  const configured = parseEmails(env.ADMIN_EMAIL);
  if (configured.length > 0) return configured;
  return isProductionEnv(env) ? [] : [LOCAL_DEV_ADMIN_EMAIL];
}

export function isAdminConfigured(env: AdminEnv = process.env): boolean {
  return getAdminEmails(env).length > 0;
}

export function isAdminEmail(
  email: string | null | undefined,
  env: AdminEnv = process.env
): boolean {
  return !!email && getAdminEmails(env).includes(email.toLowerCase());
}
