/**
 * Owner/admin gate shared by admin-only routes and pages.
 *
 * Admins are identified by their signed-in email matching ADMIN_EMAIL
 * (comma-separated list; defaults to the project owner).
 */
export const ADMIN_EMAILS = (process.env.ADMIN_EMAIL || "seang541@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}
