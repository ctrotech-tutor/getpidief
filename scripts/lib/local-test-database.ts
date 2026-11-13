/** Guardrail only: loopback can still be a tunnel to a shared or hosted server. */
export function assertLocalTestDatabase(raw: string | undefined): string {
  let url: URL;
  try { if (!raw) throw new Error(); url = new URL(raw); }
  catch { throw new Error("An isolated local PostgreSQL _test URL is required."); }
  if (!(["postgres:", "postgresql:"].includes(url.protocol)) ||
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
      !/^\/[a-zA-Z0-9_]+_test$/.test(url.pathname) || url.search || url.hash) {
    throw new Error("Use an isolated local PostgreSQL _test URL without query parameters or fragments.");
  }
  return raw!;
}
