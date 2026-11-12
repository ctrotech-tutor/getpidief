/** Shared known passwords are never acceptable on hosted or production databases. */
export function assertLocalSeedTarget(raw: string | undefined, nodeEnv: string | undefined): string {
  if (nodeEnv === "production") throw new Error("Local seed is disabled in production.");
  if (!raw) throw new Error("DATABASE_URL is required.");
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error("DATABASE_URL must be a PostgreSQL URL."); }
  if (!(["postgres:", "postgresql:"].includes(url.protocol)) || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || !url.pathname || url.pathname === "/" || url.search || url.hash) {
    throw new Error("Seed requires a local PostgreSQL URL with an explicit database name and no URL parameters. Never seed a hosted database.");
  }
  return raw;
}
