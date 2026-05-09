/**
 * Public site origin for links in emails / API routes.
 *
 * Prefer a fixed canonical URL (e.g. https://blueprint-ai-platinum.vercel.app).
 * Do **not** rely on VERCEL_URL: it points at the deployment hostname
 * (`*.vercel.app` like blueprint-xxxxx-projects.vercel.app), not your production alias,
 * and triggers extra redirects / login flows when open in prod.
 */

const CANDIDATE_ENV_KEYS = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_URL",
  "NEXTAUTH_URL",
] as const;

function normalizeToOrigin(raw: string | undefined): string | null {
  const trimmed = raw?.trim().replace(/\/$/, "") ?? "";
  if (!trimmed || trimmed.includes("$")) return null;

  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

export function getAppOrigin(): string {
  for (const key of CANDIDATE_ENV_KEYS) {
    const value = normalizeToOrigin(process.env[key]);
    if (value) return value;
  }
  return "http://localhost:3000";
}
