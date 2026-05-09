export function getAppOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (process.env.NEXTAUTH_URL)
    return `https://${process.env.NEXTAUTH_URL.replace(/^https?:\/\//, "")}`;
  return "http://localhost:3000";
}
